import { expect, test, describe, beforeAll, afterAll } from "vitest";
import { setupClient, anonClient, getAuthClient } from "./supabaseTestClients";

const TEST_EQUIPMENT_NAME = "TEST_EQUIPMENT_RLS";
let testEquipmentId: string | null = null;
let adminAuthClient: any;
let nonAdminAuthClient: any;

async function seedEquipment() {
  // Clean any previous test equipment.
  await setupClient.from("equipment").delete().eq("name", TEST_EQUIPMENT_NAME);
  const { data, error } = await setupClient.from("equipment").insert({
    name: TEST_EQUIPMENT_NAME,
    slug: "test-equipment-rls",
    total_quantity: 5,
    rental_price: 1000,
    deposit_price: 200,
    is_active: true,
  }).select().single();
  if (error) throw error;
  testEquipmentId = data.id;
}

async function cleanup() {
  if (testEquipmentId) {
    await setupClient.from("equipment").delete().eq("id", testEquipmentId);
  }
}

describe("Equipment RLS", () => {
  beforeAll(async () => {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'Password123!';
    const nonAdminEmail = 'user@example.com';
    const nonAdminPassword = 'Password123!';

    // Ensure admin user exists
    let { data: usersData, error: usersError } = await setupClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersError) throw usersError;
    let adminUser = usersData.users.find((u) => u.email === adminEmail);
    if (!adminUser) {
      const { data: newAdmin, error: createError } = await setupClient.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });
      if (createError) throw createError;
      adminUser = newAdmin;
    }
    await setupClient.auth.admin.updateUserById(adminUser.id, { password: adminPassword });
    await setupClient.from('profiles').update({ is_admin: true }).eq('id', adminUser.id);
    adminAuthClient = await getAuthClient(adminEmail, adminPassword);

    // Ensure non-admin user exists
    let nonAdminUser = usersData.users.find((u) => u.email === nonAdminEmail);
    if (!nonAdminUser) {
      const { data: newUser, error: createError } = await setupClient.auth.admin.createUser({
        email: nonAdminEmail,
        password: nonAdminPassword,
        email_confirm: true,
      });
      if (createError) throw createError;
    }
    nonAdminAuthClient = await getAuthClient(nonAdminEmail, nonAdminPassword);

    await seedEquipment();
  });

  afterAll(async () => {
    await cleanup();
  });

  test("anonymous can SELECT active equipment", async () => {
    const { data, error } = await anonClient.from("equipment").select("id,name").eq("is_active", true).eq("name", TEST_EQUIPMENT_NAME);
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.length).toBeGreaterThan(0);
  });

  test("anonymous cannot INSERT equipment", async () => {
    const runId = crypto.randomUUID();
    const slug = `anon-denied-${runId}`;

    const { error } = await anonClient
      .from("equipment")
      .insert({
        name: `ANON_DENIED_${runId}`,
        slug,
        total_quantity: 1,
        rental_price: 100,
        deposit_price: 50,
        is_active: true,
      });

    expect(error).not.toBeNull();

    const { data: rows, error: verifyError } = await setupClient
      .from("equipment")
      .select("id")
      .eq("slug", slug);

    expect(verifyError).toBeNull();
    expect(rows ?? []).toHaveLength(0);
  });

  test("anonymous cannot UPDATE equipment", async () => {
    const { data, error } = await anonClient
      .from("equipment")
      .update({ name: "UNAUTHORIZED_CHANGE" })
      .eq("id", testEquipmentId!)
      .select("id");

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    const { data: actual, error: verifyError } = await setupClient
      .from("equipment")
      .select("id,name")
      .eq("id", testEquipmentId!)
      .single();

    expect(verifyError).toBeNull();
    expect(actual?.id).toBe(testEquipmentId);
    expect(actual?.name).not.toBe("UNAUTHORIZED_CHANGE");
  });

  test("anonymous cannot DELETE equipment", async () => {
    const { data, error } = await anonClient
      .from("equipment")
      .delete()
      .eq("id", testEquipmentId!)
      .select("id");

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    const { data: actual, error: verifyError } = await setupClient
      .from("equipment")
      .select("id")
      .eq("id", testEquipmentId!)
      .single();

    expect(verifyError).toBeNull();
    expect(actual?.id).toBe(testEquipmentId);
  });

  test("non-admin cannot INSERT equipment", async () => {
    const { data, error } = await nonAdminAuthClient.from("equipment").insert({
      name: "NONADMIN_INSERT",
      slug: "nonadmin-insert",
      total_quantity: 1,
      rental_price: 100,
      deposit_price: 50,
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
  });
  test("non-admin cannot UPDATE equipment", async () => {
    const { data, error } = await nonAdminAuthClient
      .from("equipment")
      .update({ name: "UNAUTHORIZED_CHANGE" })
      .eq("id", testEquipmentId!)
      .select("id");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
    // Verify unchanged
    const { data: actual, error: verifyError } = await setupClient
      .from("equipment")
      .select("id,name")
      .eq("id", testEquipmentId!)
      .single();
    expect(verifyError).toBeNull();
    expect(actual?.id).toBe(testEquipmentId);
    expect(actual?.name).not.toBe("UNAUTHORIZED_CHANGE");
  });

  test("non-admin cannot DELETE equipment", async () => {
    const { data, error } = await nonAdminAuthClient
      .from("equipment")
      .delete()
      .eq("id", testEquipmentId!)
      .select("id");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
    // Verify still exists
    const { data: actual, error: verifyError } = await setupClient
      .from("equipment")
      .select("id")
      .eq("id", testEquipmentId!)
      .single();
    expect(verifyError).toBeNull();
    expect(actual?.id).toBe(testEquipmentId);
  });

  test("admin can INSERT equipment", async () => {
    const runId = crypto.randomUUID();

    const { data, error } = await adminAuthClient
      .from("equipment")
      .insert({
        name: `ADMIN_INSERT_${runId}`,
        slug: `admin-insert-${runId}`,
        total_quantity: 1,
        rental_price: 100,
        deposit_price: 50,
        is_active: true,
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeDefined();

    if (data?.id) {
      const { error: cleanupError } = await setupClient
        .from("equipment")
        .delete()
        .eq("id", data.id);

      expect(cleanupError).toBeNull();
    }
  });

});




