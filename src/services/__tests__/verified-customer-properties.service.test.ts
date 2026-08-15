/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import test from "node:test";
import { getVerifiedCustomerSavedProperties } from "../verified-customer-properties.service.js";

function database(customer: any) {
  const calls: any[] = [];
  return { calls, database: { customer: { async findUnique(args: any) { calls.push(args); return customer; } } } as any };
}

const rows = [
  { id: "property-b", label: "Rental", addressLine1: "45 Oak Avenue", addressLine2: null, city: "Irvington", state: "NJ", postalCode: "07111", propertyType: "APARTMENT", bedrooms: 2, bathrooms: { toString: () => "1.5" }, approximateSquareFeet: 900, isActive: true },
  { id: "property-inactive", label: "Old", addressLine1: "1 Old Road", addressLine2: null, city: "Newark", state: "NJ", postalCode: "07101", propertyType: "HOUSE", bedrooms: 1, bathrooms: null, approximateSquareFeet: null, isActive: false },
  { id: "property-a", label: "Home", addressLine1: "123 Main Street", addressLine2: "Unit 2", city: "Newark", state: "NJ", postalCode: "07102", propertyType: "HOUSE", bedrooms: 3, bathrooms: { toString: () => "2" }, approximateSquareFeet: 1200, isActive: true },
];

test("returns only active verified-customer properties in labelled deterministic order", async () => {
  const f = database({ id: "customer-a", properties: rows.filter((row) => row.isActive) });
  const result = await getVerifiedCustomerSavedProperties("customer-a", f);
  assert.deepEqual(result?.map((property) => property.id), ["property-a", "property-b"]);
  assert.equal(result?.[0].bathrooms, "2");
  assert.equal(result?.[1].bathrooms, "1.5");
  assert.equal(result?.[0].address.line2, "Unit 2");
  assert.equal("customerId" in (result?.[0] ?? {}), false);
  assert.equal("isActive" in (result?.[0] ?? {}), false);
  assert.deepEqual(f.calls[0].where, { id: "customer-a", isActive: true });
  assert.deepEqual(f.calls[0].select.properties.where, { isActive: true });
});

test("returns an empty list for a verified customer without active properties", async () => {
  const result = await getVerifiedCustomerSavedProperties("customer-a", { database: database({ id: "customer-a", properties: [] }).database });
  assert.deepEqual(result, []);
});

test("returns null for deleted or inactive customers and does not mutate data", async () => {
  assert.equal(await getVerifiedCustomerSavedProperties("customer-a", { database: database(null).database }), null);
  assert.equal(await getVerifiedCustomerSavedProperties("customer-a", { database: database(null).database }), null);
});
