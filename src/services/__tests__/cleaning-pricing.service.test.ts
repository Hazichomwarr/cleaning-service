import assert from "node:assert/strict";
import test from "node:test";
import { Prisma, PropertyType } from "../../generated/prisma/client.js";
import {
  getResidentialStartingEstimate,
  type PricingRuleReader,
} from "../cleaning-pricing.service.js";

function readerFor(
  rules: Array<{ id: string; startingPrice: string }>,
): PricingRuleReader {
  return {
    async findMany() {
      return rules.map((rule) => ({
        id: rule.id,
        startingPrice: new Prisma.Decimal(rule.startingPrice),
      }));
    },
  };
}

test("resolves HOUSE pricing from the active configured rule", async () => {
  const result = await getResidentialStartingEstimate(
    { propertyType: PropertyType.HOUSE, bedroomCount: 1 },
    readerFor([{ id: "rule-1", startingPrice: "100.00" }]),
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.startingPrice.toString(), "100");
    assert.equal(result.pricingRuleId, "rule-1");
  }
});

test("resolves APARTMENT pricing", async () => {
  const result = await getResidentialStartingEstimate(
    { propertyType: PropertyType.APARTMENT, bedroomCount: 2 },
    readerFor([{ id: "rule-2", startingPrice: "200.00" }]),
  );

  assert.deepEqual(result.success, true);
  if (result.success) assert.equal(result.startingPrice.toString(), "200");
});

test("resolves AIRBNB pricing", async () => {
  const result = await getResidentialStartingEstimate(
    { propertyType: PropertyType.AIRBNB, bedroomCount: 3 },
    readerFor([{ id: "rule-3", startingPrice: "300.00" }]),
  );

  assert.deepEqual(result.success, true);
  if (result.success) assert.equal(result.startingPrice.toString(), "300");
});

test("rejects OFFICE, COMMERCIAL, and OTHER", async (t) => {
  for (const propertyType of [
    PropertyType.OFFICE,
    PropertyType.COMMERCIAL,
    PropertyType.OTHER,
  ]) {
    await t.test(propertyType, async () => {
      const result = await getResidentialStartingEstimate({
        propertyType,
        bedroomCount: 2,
      });

      assert.deepEqual(result, {
        success: false,
        reason: "NOT_RESIDENTIAL",
      });
    });
  }
});

test("returns NO_ACTIVE_RULE without extrapolating five bedrooms", async () => {
  const result = await getResidentialStartingEstimate(
    { propertyType: PropertyType.HOUSE, bedroomCount: 5 },
    readerFor([]),
  );

  assert.deepEqual(result, {
    success: false,
    reason: "NO_ACTIVE_RULE",
  });
});

test("rejects zero, negative, and fractional bedroom counts", async (t) => {
  for (const bedroomCount of [0, -1, 2.5]) {
    await t.test(String(bedroomCount), async () => {
      const result = await getResidentialStartingEstimate({
        propertyType: PropertyType.HOUSE,
        bedroomCount,
      });

      assert.deepEqual(result, {
        success: false,
        reason: "INVALID_BEDROOM_COUNT",
      });
    });
  }
});

test("rejects non-finite bedroom counts", async (t) => {
  for (const bedroomCount of [Number.NaN, Number.POSITIVE_INFINITY]) {
    await t.test(String(bedroomCount), async () => {
      const result = await getResidentialStartingEstimate({
        propertyType: PropertyType.HOUSE,
        bedroomCount,
      });

      assert.deepEqual(result, {
        success: false,
        reason: "INVALID_BEDROOM_COUNT",
      });
    });
  }
});

test("ignores inactive rules when no active rule exists", async () => {
  const result = await getResidentialStartingEstimate(
    { propertyType: PropertyType.HOUSE, bedroomCount: 2 },
    readerFor([]),
  );

  assert.deepEqual(result, {
    success: false,
    reason: "NO_ACTIVE_RULE",
  });
});

test("rejects ambiguous active configuration", async () => {
  const result = await getResidentialStartingEstimate(
    { propertyType: PropertyType.HOUSE, bedroomCount: 2 },
    readerFor([
      { id: "rule-2a", startingPrice: "200.00" },
      { id: "rule-2b", startingPrice: "225.00" },
    ]),
  );

  assert.deepEqual(result, {
    success: false,
    reason: "AMBIGUOUS_ACTIVE_RULE",
  });
});

test("preserves exact decimal money values", async () => {
  const result = await getResidentialStartingEstimate(
    { propertyType: PropertyType.HOUSE, bedroomCount: 2 },
    readerFor([{ id: "rule-2", startingPrice: "200.00" }]),
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.startingPrice instanceof Prisma.Decimal, true);
    assert.equal(result.startingPrice.toFixed(2), "200.00");
  }
});
