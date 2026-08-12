import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN_NAV_ITEMS, isAdminNavigationItemActive } from "../admin-navigation";

test("defines exactly the current admin destinations", () => {
  assert.deepEqual(ADMIN_NAV_ITEMS.map((item) => [item.label, item.href]), [["Dashboard", "/admin"], ["Requests", "/admin/requests"], ["Schedule", "/admin/schedule"], ["Workers", "/admin/workers"]]);
});

test("matches dashboard exactly and supports nested workspace routes", () => {
  assert.equal(isAdminNavigationItemActive("/admin", "/admin"), true);
  assert.equal(isAdminNavigationItemActive("/admin/requests", "/admin"), false);
  assert.equal(isAdminNavigationItemActive("/admin/requests", "/admin/requests"), true);
  assert.equal(isAdminNavigationItemActive("/admin/requests/JC-2026-0042", "/admin/requests"), true);
  assert.equal(isAdminNavigationItemActive("/admin/schedule", "/admin/schedule"), true);
  assert.equal(isAdminNavigationItemActive("/admin/workers", "/admin/workers"), true);
});
