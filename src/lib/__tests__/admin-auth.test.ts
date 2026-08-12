import assert from "node:assert/strict";
import test from "node:test";
import { authenticateAdmin } from "../auth/admin-credentials";
import { AdminCredentialsSchema, normalizeAdminEmail } from "../validations/admin-auth.schema";

test("normalizes administrative email identity", () => {
  assert.equal(normalizeAdminEmail(" Admin@JustCleaning.com "), "admin@justcleaning.com");
});

test("accepts valid credentials and rejects malformed or privileged input", () => {
  assert.equal(AdminCredentialsSchema.safeParse({ email: "admin@example.com", password: "secret" }).success, true);
  assert.equal(AdminCredentialsSchema.safeParse({ email: "not-an-email", password: "secret" }).success, false);
  assert.equal(AdminCredentialsSchema.safeParse({ email: "admin@example.com", password: "" }).success, false);
  assert.equal(AdminCredentialsSchema.safeParse({ email: "admin@example.com", password: "secret", isActive: true }).success, false);
});

const activeAdmin = {
  id: "admin-1",
  name: "Just Cleaning Admin",
  email: "admin@justcleaning.com",
  passwordHash: "stored-hash",
  isActive: true,
};

test("authenticates normalized active credentials and returns a safe identity", async () => {
  const calls: string[] = [];
  const identity = await authenticateAdmin(
    { email: " ADMIN@JUSTCLEANING.COM ", password: "correct" },
    {
      findByEmail: async (email) => { calls.push(`lookup:${email}`); return activeAdmin; },
      verifyPassword: async (password, passwordHash) => { calls.push(`verify:${password}:${passwordHash}`); return password === "correct"; },
    },
  );

  assert.deepEqual(identity, { id: "admin-1", name: "Just Cleaning Admin", email: "admin@justcleaning.com" });
  assert.deepEqual(calls, ["lookup:admin@justcleaning.com", "verify:correct:stored-hash"]);
  assert.equal("passwordHash" in (identity ?? {}), false);
});

test("rejects wrong password, unknown email, and inactive admin identically", async () => {
  const dependencies = {
    findByEmail: async (email: string) => email === activeAdmin.email ? activeAdmin : null,
    verifyPassword: async () => false,
  };
  assert.equal(await authenticateAdmin({ email: activeAdmin.email, password: "wrong" }, dependencies), null);
  assert.equal(await authenticateAdmin({ email: "unknown@example.com", password: "wrong" }, dependencies), null);
  assert.equal(await authenticateAdmin({ email: activeAdmin.email, password: "correct" }, {
    ...dependencies,
    findByEmail: async () => ({ ...activeAdmin, isActive: false }),
    verifyPassword: async () => true,
  }), null);
});
