import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN_NAV_ITEMS, isAdminNavigationItemActive } from "../admin-navigation";

test("defines exactly the current V1 admin destinations", () => {
  assert.deepEqual(ADMIN_NAV_ITEMS.map((item) => [item.label, item.href]), [["Dashboard", "/admin"], ["Requests", "/admin/requests"], ["Customers", "/admin/customers"], ["Workers", "/admin/workers"]]);
  const labels: readonly string[] = ADMIN_NAV_ITEMS.map((item) => item.label);
  const hrefs: readonly string[] = ADMIN_NAV_ITEMS.map((item) => item.href);
  assert.equal(labels.includes("Schedule"), false);
  assert.equal(hrefs.includes("/admin/schedule"), false);
});

test("matches dashboard exactly and supports nested workspace routes", () => {
  assert.equal(isAdminNavigationItemActive("/admin", "/admin"), true);
  assert.equal(isAdminNavigationItemActive("/admin/requests", "/admin"), false);
  assert.equal(isAdminNavigationItemActive("/admin/requests", "/admin/requests"), true);
  assert.equal(isAdminNavigationItemActive("/admin/requests/JC-2026-0042", "/admin/requests"), true);
  assert.equal(isAdminNavigationItemActive("/admin/customers", "/admin/customers"), true);
  assert.equal(isAdminNavigationItemActive("/admin/customers/abc", "/admin/customers"), true);
  assert.equal(isAdminNavigationItemActive("/admin/workers", "/admin/workers"), true);
});
