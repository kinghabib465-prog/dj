import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// src/__tests__/integration/return_flow.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
// Dedicated integration-test client using publishable key (no VITE vars)
import { setupClient } from "./supabaseTestClients";
const supabase = setupClient;

// Helper to create test equipment if not exists
async function ensureEquipment(name: string, total: number) {
  // Clean any previous test equipment with the same name using privileged client.
  await setupClient.from("equipment").delete().eq("name", name);
  const { data, error } = await setupClient
    .from("equipment")
    .insert([
      { name, total_quantity: total, slug: name.toLowerCase().replace(/\s+/g, "-"), rental_price: 8000, deposit_price: 3000, is_active: true },
    ])
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

// Helper to create a booking with a single item
async function createBooking(
  equipmentId: string,
  quantity: number
) {
  const unitPrice = 8000;
  const depositPrice = 3000;

  const subtotal = unitPrice * quantity;
  const depositRequired = depositPrice * quantity;

  const { data: booking, error: bookingError } = await setupClient
    .from("bookings")
    .insert({
      booking_number: `TEST-${Date.now()}-${crypto.randomUUID()}`,

      customer_name: "Integration Test Customer",
      customer_phone: "0550000000",

      rental_start_at: new Date().toISOString(),

      expected_return_at: new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000
      ).toISOString(),

      status: "EQUIPMENT_OUT",

      subtotal,
      deposit_required: depositRequired,

      // Return-flow fixture represents a booking whose payment
      // obligations were already completed before handover.
      deposit_paid: depositRequired,
      remaining_amount: 0,

      payment_status: "VERIFIED",

      equipment_out_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (bookingError) {
    throw bookingError;
  }

  if (!booking?.id) {
    throw new Error("Test booking insert returned no id");
  }

  const { error: itemError } = await setupClient
    .from("booking_items")
    .insert({
      booking_id: booking.id,
      equipment_id: equipmentId,
      quantity,

      unit_price: unitPrice,

      // Matches the real create_booking RPC:
      // booking_items.deposit_amount stores the per-unit deposit price.
      deposit_amount: depositPrice,
    });

  if (itemError) {
    throw itemError;
  }

  return booking.id;
}
const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';

describe('Return workflow', () => {
  let equipmentId: string;
  let bookingId: string;

  beforeAll(async () => {
    equipmentId = await ensureEquipment("Test Speaker", 10);
    bookingId = await createBooking(equipmentId, 4);
    // start return session
    const { error } = await supabase.rpc("start_equipment_return", { p_booking_id: bookingId });
    if (error) throw error;
  });

  afterAll(async () => {
    // cleanup created records using privileged client
    const { data: returnSession } = await setupClient
      .from("equipment_returns")
      .select("id")
      .eq("booking_id", bookingId)
      .single();
    if (returnSession?.id) {
      await setupClient.from("return_items").delete().eq("return_id", returnSession.id);
    }
    await setupClient.from("equipment_returns").delete().eq("booking_id", bookingId);
    await setupClient.from("booking_items").delete().eq("booking_id", bookingId);
    await setupClient.from("bookings").delete().eq("id", bookingId);
    // equipment left for other tests
  });

  it("partial good return", async () => {
    // fetch return items
    const { data: items, error: err1 } = await supabase.rpc("get_return_items_for_booking", { p_booking_id: bookingId });
    if (err1) throw err1;
    const returnItem = items[0];
    // return 3 good out of 4
    const { error: err2 } = await supabase.rpc("upsert_return_item", {
      p_return_item_id: returnItem.id,
      p_returned_good_quantity: 3,
      p_damaged_quantity: 0,
      p_missing_quantity: 0,
      p_remaining_out_quantity: 1,
    });
    if (err2) throw err2;
    // verify remaining_out_quantity is 1
    const { data: updated, error: err3 } = await supabase.rpc("get_return_items_for_booking", { p_booking_id: bookingId });
    if (err3) throw err3;
    const updatedItem = updated.find((i: any) => i.id === returnItem.id);
    expect(updatedItem.remaining_out_quantity).toBe(1);
  });

  it("complete good return", async () => {
    // fetch return items again
    const { data: items, error: err1 } = await supabase.rpc("get_return_items_for_booking", { p_booking_id: bookingId });
    if (err1) throw err1;
    const returnItem = items[0];
    // return the last item as good
    const { error: err2 } = await supabase.rpc("upsert_return_item", {
      p_return_item_id: returnItem.id,
      p_returned_good_quantity: 4,
      p_damaged_quantity: 0,
      p_missing_quantity: 0,
      p_remaining_out_quantity: 0,
    });
    if (err2) throw err2;
    // attempt to complete return session
    const { error: err3 } = await supabase.rpc("maybe_complete_return", { p_booking_id: bookingId });
    if (err3) throw err3;
    // verify equipment_returns.completed_at is set
    const { data: er, error: err4 } = await supabase
      .from("equipment_returns")
      .select("completed_at")
      .eq("booking_id", bookingId)
      .single();
    if (err4) throw err4;
    expect(er.completed_at).not.toBeNull();
  });
});




