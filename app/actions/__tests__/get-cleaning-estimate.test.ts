import assert from "node:assert/strict";
import test from "node:test";
import { Prisma, PropertyType } from "../../../src/generated/prisma/client.js";
import {
  resolvePublicCleaningEstimate,
  type PricingResolver,
} from "../../../src/lib/cleaning-estimate-boundary.js";

function successfulResolver(amount: string, pricingRuleId = "internal-rule-id") {
  const resolver: PricingResolver = async (input) => ({
    success: true,
    propertyType: input.propertyType,
    bedroomCount: input.bedroomCount,
    startingPrice: new Prisma.Decimal(amount),
    pricingRuleId,
  });

  return resolver;
}

test("returns a safe USD estimate for valid HOUSE input", async () => {
  const result = await resolvePublicCleaningEstimate(
    { propertyType: "HOUSE", bedroomCount: 2 },
    successfulResolver("200.00"),
  );

  assert.deepEqual(result, {
    success: true,
    estimate: {
      amount: "200.00",
      currency: "USD",
    },
  });
  assert.equal("pricingRuleId" in result, false);
});

test("serializes APARTMENT and AIRBNB estimates exactly", async (t) => {
  await t.test("APARTMENT", async () => {
    const result = await resolvePublicCleaningEstimate(
      { propertyType: PropertyType.APARTMENT, bedroomCount: 3 },
      successfulResolver("300.00"),
    );

    assert.deepEqual(result, {
      success: true,
      estimate: { amount: "300.00", currency: "USD" },
    });
  });

  await t.test("AIRBNB", async () => {
    const result = await resolvePublicCleaningEstimate(
      { propertyType: PropertyType.AIRBNB, bedroomCount: 4 },
      successfulResolver("400.00"),
    );

    assert.deepEqual(result, {
      success: true,
      estimate: { amount: "400.00", currency: "USD" },
    });
  });
});

test("maps non-residential domain outcomes to manual quote", async (t) => {
  for (const propertyType of [
    PropertyType.OFFICE,
    PropertyType.COMMERCIAL,
    PropertyType.OTHER,
  ]) {
    await t.test(propertyType, async () => {
      const result = await resolvePublicCleaningEstimate(
        { propertyType, bedroomCount: 2 },
        async () => ({ success: false, reason: "NOT_RESIDENTIAL" }),
      );

      assert.deepEqual(result, {
        success: false,
        reason: "MANUAL_QUOTE_REQUIRED",
      });
    });
  }
});

test("maps a missing configured rule without extrapolating", async () => {
  const result = await resolvePublicCleaningEstimate(
    { propertyType: PropertyType.HOUSE, bedroomCount: 5 },
    async () => ({ success: false, reason: "NO_ACTIVE_RULE" }),
  );

  assert.deepEqual(result, {
    success: false,
    reason: "NO_CONFIGURED_ESTIMATE",
  });
});

test("rejects malformed public input", async (t) => {
  const invalidInputs: unknown[] = [
    { propertyType: PropertyType.HOUSE, bedroomCount: 0 },
    { propertyType: PropertyType.HOUSE, bedroomCount: -1 },
    { propertyType: PropertyType.HOUSE, bedroomCount: 2.5 },
    { propertyType: PropertyType.HOUSE },
    { bedroomCount: 2 },
    { propertyType: "HOTEL", bedroomCount: 2 },
    { propertyType: PropertyType.HOUSE, bedroomCount: "2" },
    { propertyType: 123, bedroomCount: 2 },
    null,
    undefined,
  ];

  for (const input of invalidInputs) {
    await t.test(String(input), async () => {
      let resolverCalled = false;
      const result = await resolvePublicCleaningEstimate(input, async () => {
        resolverCalled = true;
        return { success: false, reason: "NO_ACTIVE_RULE" };
      });

      assert.deepEqual(result, {
        success: false,
        reason: "INVALID_INPUT",
      });
      assert.equal(resolverCalled, false);
    });
  }
});

test("rejects unexpected extra public fields", async () => {
  const result = await resolvePublicCleaningEstimate(
    {
      propertyType: PropertyType.HOUSE,
      bedroomCount: 2,
      customerEmail: "customer@example.com",
    },
    successfulResolver("200.00"),
  );

  assert.deepEqual(result, {
    success: false,
    reason: "INVALID_INPUT",
  });
});

test("maps defensive domain invalid input", async () => {
  const result = await resolvePublicCleaningEstimate(
    { propertyType: PropertyType.HOUSE, bedroomCount: 2 },
    async () => ({ success: false, reason: "INVALID_BEDROOM_COUNT" }),
  );

  assert.deepEqual(result, {
    success: false,
    reason: "INVALID_INPUT",
  });
});

test("hides ambiguous configuration and infrastructure failures", async (t) => {
  await t.test("ambiguous pricing", async () => {
    const result = await resolvePublicCleaningEstimate(
      { propertyType: PropertyType.HOUSE, bedroomCount: 2 },
      async () => ({ success: false, reason: "AMBIGUOUS_ACTIVE_RULE" }),
    );

    assert.deepEqual(result, {
      success: false,
      reason: "ESTIMATE_UNAVAILABLE",
    });
  });

  await t.test("unexpected error", async () => {
    const result = await resolvePublicCleaningEstimate(
      { propertyType: PropertyType.HOUSE, bedroomCount: 2 },
      async () => {
        throw new Error("database secret and stack trace");
      },
    );

    assert.deepEqual(result, {
      success: false,
      reason: "ESTIMATE_UNAVAILABLE",
    });
    assert.equal(JSON.stringify(result).includes("database secret"), false);
  });
});
