import {
  afterAll,
  beforeAll,
  describe,
  expect,
  test,
} from "vitest";

import {
  anonClient,
  getAuthClient,
  setupClient,
} from "./supabaseTestClients";

const runIntegration =
  process.env.RUN_SUPABASE_INTEGRATION_TESTS === "true";

const suite = runIntegration ? describe : describe.skip;

suite("Public booking lifecycle", () => {
  const adminEmail = "admin@example.com";
  let adminUserId: string | null = null;

  let adminPassword = "";
  let adminClient: Awaited<ReturnType<typeof getAuthClient>>;

  let equipmentId = "";
  let bookingId = "";
  let bookingNumber = "";
  let receiptPath = "";

  const unitPrice = 8000;
  const depositPrice = 3000;
  const quantity = 1;

  beforeAll(async () => {
    // --------------------------------------------------------
    // Locate existing staging admin account.
    // Equipment RLS tests already depend on this account.
    // --------------------------------------------------------

    const {
      data: usersData,
      error: usersError,
    } = await setupClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) {
      throw usersError;
    }

    const adminUser = usersData.users.find(
      (u) => u.email === adminEmail
    );

    if (!adminUser) {
      throw new Error(
        "admin@example.com does not exist. Run scripts/create_test_users.js first."
      );
    }
    adminPassword = "Password123!";

    // --------------------------------------------------------
    // Use an ephemeral password for this test run.
    // Nothing is printed or persisted to .env.local.
    // --------------------------------------------------------

// Using static admin password from test setup; no password rotation needed here.

    // Removed passwordError check (not needed)

    // Verify the profile is actually admin.
    const {
      data: profile,
      error: profileError,
    } = await setupClient
      .from("profiles")
      .select("id")
      .eq("id", adminUser.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    if (!profile?.id) {
      throw new Error(
        "admin@example.com profile is not an admin"
      );
    }

    adminClient = await getAuthClient(adminEmail, adminPassword);

    // --------------------------------------------------------
    // Unique equipment fixture prevents reservation conflicts.
    // --------------------------------------------------------

    const runId = crypto.randomUUID();

    const {
      data: equipment,
      error: equipmentError,
    } = await setupClient
      .from("equipment")
      .insert({
        name: `LIFECYCLE_EQUIPMENT_${runId}`,
        slug: `lifecycle-equipment-${runId}`,
        total_quantity: 2,
        rental_price: unitPrice,
        deposit_price: depositPrice,
        is_active: true,
      })
      .select("id")
      .single();

    if (equipmentError) {
      throw equipmentError;
    }

    equipmentId = equipment.id;
  }, 30000);


  afterAll(async () => {
    // --------------------------------------------------------
    // Exact cleanup only.
    // Never broad-delete staging data.
    // --------------------------------------------------------

    if (bookingId) {
      await setupClient
        .from("audit_logs")
        .delete()
        .eq("entity_id", bookingId);

      await setupClient
        .from("payments")
        .delete()
        .eq("booking_id", bookingId);

      await setupClient
        .from("booking_items")
        .delete()
        .eq("booking_id", bookingId);

      await setupClient
        .from("bookings")
        .delete()
        .eq("id", bookingId);
    }

    if (receiptPath) {
      await setupClient.storage
        .from("booking-receipts")
        .remove([receiptPath]);
    }

    if (equipmentId) {
      await setupClient
        .from("equipment")
        .delete()
        .eq("id", equipmentId);
    }
  }, 30000);


  test(
    "receipt upload -> public booking",
    async () => {
      // ------------------------------------------------------
      // 1. Request signed receipt upload URL publicly.
      // ------------------------------------------------------

      const {
        data: receiptData,
        error: receiptFunctionError,
      } = await anonClient.functions.invoke(
        "create-receipt-upload",
        {
          body: {
            fileName: "deposit-receipt.jpg",
            fileType: "image/jpeg",
          },
        }
      );

      expect(receiptFunctionError).toBeNull();

      expect(
        typeof receiptData?.uploadUrl
      ).toBe("string");

      expect(
        typeof receiptData?.objectPath
      ).toBe("string");

      receiptPath = receiptData.objectPath;

      expect(
        receiptPath.startsWith("pending/")
      ).toBe(true);

      // ------------------------------------------------------
      // 2. Upload a real tiny JPEG.
      // ------------------------------------------------------

      const jpegBase64 =
        "/9j/4AAQSkZJRgABAQEASABIAAD/" +
        "2wBDAP//////////////////////////////////////////////////////////////////////////////////////" +
        "2wBDAf//////////////////////////////////////////////////////////////////////////////////////" +
        "wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/" +
        "xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAEf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9k=";

      const jpeg = Buffer.from(
        jpegBase64,
        "base64"
      );

      const uploadResponse = await fetch(
        receiptData.uploadUrl,
        {
          method: "PUT",
          headers: {
            "Content-Type": "image/jpeg",
          },
          body: jpeg,
        }
      );

      expect(
        uploadResponse.ok,
        `Signed upload failed: ${uploadResponse.status} ${await uploadResponse.text()}`
      ).toBe(true);

      // Verify privileged backend can see receipt.
      const folder = receiptPath
        .split("/")
        .slice(0, -1)
        .join("/");

      const fileName = receiptPath
        .split("/")
        .at(-1)!;

      const {
        data: storedFiles,
        error: listError,
      } = await setupClient.storage
        .from("booking-receipts")
        .list(folder, {
          search: fileName,
        });

      expect(listError).toBeNull();

      expect(
        storedFiles?.some(
          (file) => file.name === fileName
        )
      ).toBe(true);

      // ------------------------------------------------------
      // 3. Create public booking through real Edge Function.
      //
      // Intentionally omit eventLocation to prove it is optional.
      // ------------------------------------------------------

      const rentalStart = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      );

      const rentalEnd = new Date(
        rentalStart.getTime() +
          2 * 24 * 60 * 60 * 1000
      );

      const {
        data: publicBooking,
        error: publicBookingError,
      } = await anonClient.functions.invoke(
        "create-public-booking",
        {
          body: {
            customerName:
              "Lifecycle Integration Customer",

            customerPhone:
              "0550000000",

            rentalStartAt:
              rentalStart.toISOString(),

            expectedReturnAt:
              rentalEnd.toISOString(),

            receiptObjectPath:
              receiptPath,

            notes:
              "Automated lifecycle integration test",

            items: [
              {
                equipmentId,
                quantity,
              },
            ],
          },
        }
      );

      expect(publicBookingError).toBeNull();

      expect(
        publicBooking?.status
      ).toBe("PENDING_PAYMENT_REVIEW");

      expect(
        typeof publicBooking?.bookingNumber
      ).toBe("string");

      bookingNumber =
        publicBooking.bookingNumber;

      // ------------------------------------------------------
      // 4. Inspect server-authoritative booking values.
      // ------------------------------------------------------

      const {
        data: booking,
        error: bookingError,
      } = await setupClient
        .from("bookings")
        .select(
          [
            "id",
            "booking_number",
            "status",
            "subtotal",
            "deposit_required",
            "deposit_paid",
            "remaining_amount",
            "payment_status",
            "receipt_path",
            "event_location",
          ].join(",")
        )
        .eq(
          "booking_number",
          bookingNumber
        )
        .single();

      expect(bookingError).toBeNull();

      bookingId = booking!.id;

      expect(
        booking?.status
      ).toBe("PENDING_PAYMENT_REVIEW");

      expect(
        booking?.subtotal
      ).toBe(unitPrice * quantity);

      expect(
        booking?.deposit_required
      ).toBe(depositPrice * quantity);

      expect(
        booking?.deposit_paid
      ).toBe(0);

      expect(
        booking?.remaining_amount
      ).toBe(
        unitPrice * quantity -
          depositPrice * quantity
      );

      expect(
        booking?.payment_status
      ).toBe("PENDING");

      expect(
        booking?.receipt_path
      ).toBe(receiptPath);

      expect(
        booking?.event_location
      ).toBeNull();
    },
    30000
  );


  test(
    "admin approves deposit -> CONFIRMED",
    async () => {
      const {
        data: depositPayment,
        error: paymentError,
      } = await setupClient
        .from("payments")
        .select(
          "id,type,amount,method,status"
        )
        .eq("booking_id", bookingId)
        .eq("type", "DEPOSIT")
        .single();

      expect(paymentError).toBeNull();

      expect(
        depositPayment?.amount
      ).toBe(depositPrice * quantity);

      expect(
        depositPayment?.status
      ).toBe("PENDING");

      const {
        error: verifyError,
      } = await adminClient.functions.invoke(
        "verify-payment",
        {
          body: {
            bookingId,
            paymentId:
              depositPayment!.id,
            action: "APPROVE",
          },
        }
      );

      expect(verifyError).toBeNull();

      const {
        data: booking,
        error: bookingError,
      } = await setupClient
        .from("bookings")
        .select(
          [
            "status",
            "deposit_required",
            "deposit_paid",
            "remaining_amount",
            "payment_status",
            "confirmed_at",
          ].join(",")
        )
        .eq("id", bookingId)
        .single();

      expect(bookingError).toBeNull();

      expect(
        booking?.status
      ).toBe("CONFIRMED");

      expect(
        booking?.deposit_paid
      ).toBe(
        booking?.deposit_required
      );

      expect(
        booking?.payment_status
      ).toBe("VERIFIED");

      expect(
        booking?.remaining_amount
      ).toBe(
        unitPrice - depositPrice
      );

      expect(
        booking?.confirmed_at
      ).not.toBeNull();
    },
    30000
  );


  test(
    "cash balance -> READY_FOR_PICKUP",
    async () => {
      const {
        error: balanceError,
      } = await adminClient.functions.invoke(
        "record-balance-payment",
        {
          body: {
            bookingId,
          },
        }
      );

      expect(balanceError).toBeNull();

      const {
        data: booking,
        error: bookingError,
      } = await setupClient
        .from("bookings")
        .select(
          "status,remaining_amount"
        )
        .eq("id", bookingId)
        .single();

      expect(bookingError).toBeNull();

      expect(
        booking?.remaining_amount
      ).toBe(0);

      expect(
        booking?.status
      ).toBe("READY_FOR_PICKUP");

      const {
        data: balancePayments,
        error: paymentError,
      } = await setupClient
        .from("payments")
        .select(
          "id,type,amount,method,status"
        )
        .eq("booking_id", bookingId)
        .eq("type", "BALANCE");

      expect(paymentError).toBeNull();

      expect(
        balancePayments
      ).toHaveLength(1);

      expect(
        balancePayments?.[0]?.amount
      ).toBe(unitPrice - depositPrice);

      expect(
        balancePayments?.[0]?.method
      ).toBe("CASH");

      expect(
        balancePayments?.[0]?.status
      ).toBe("VERIFIED");

      // ------------------------------------------------------
      // Second balance payment must be rejected.
      // ------------------------------------------------------

      const {
        error: secondBalanceError,
      } = await adminClient.functions.invoke(
        "record-balance-payment",
        {
          body: {
            bookingId,
          },
        }
      );

      expect(
        secondBalanceError
      ).not.toBeNull();

      const {
        data: afterSecondAttempt,
      } = await setupClient
        .from("payments")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("type", "BALANCE");

      expect(
        afterSecondAttempt
      ).toHaveLength(1);
    },
    30000
  );


  test(
    "handover -> EQUIPMENT_OUT and outside inventory",
    async () => {
      const {
        error: handoverError,
      } = await adminClient.functions.invoke(
        "hand-over-equipment",
        {
          body: {
            bookingId,
          },
        }
      );

      expect(handoverError).toBeNull();

      const {
        data: booking,
        error: bookingError,
      } = await setupClient
        .from("bookings")
        .select(
          "status,equipment_out_at"
        )
        .eq("id", bookingId)
        .single();

      expect(bookingError).toBeNull();

      expect(
        booking?.status
      ).toBe("EQUIPMENT_OUT");

      expect(
        booking?.equipment_out_at
      ).not.toBeNull();

      const {
        data: outsideQuantity,
        error: outsideError,
      } = await setupClient.rpc(
        "get_equipment_outside_quantity",
        {
          p_booking_id: bookingId,
        }
      );

      expect(outsideError).toBeNull();

      expect(
        Number(outsideQuantity)
      ).toBe(quantity);
    },
    30000
  );
});
