import "dotenv/config";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "../src/generated/prisma/client.js";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL is not configured");
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

const cleaningServices = [
  {
    name: "Standard Cleaning",
    slug: "standard-cleaning",
    description: "Routine cleaning to keep homes fresh, tidy, and comfortable.",
    displayOrder: 1,
  },
  {
    name: "Deep Cleaning",
    slug: "deep-cleaning",
    description: "Detailed top-to-bottom cleaning for spaces that need extra attention.",
    displayOrder: 2,
  },
  {
    name: "Move-In / Move-Out",
    slug: "move-in-move-out",
    description: "Thorough cleaning for customers moving into or out of a property.",
    displayOrder: 3,
  },
  {
    name: "Office Cleaning",
    slug: "office-cleaning",
    description: "Professional cleaning for offices and workplace environments.",
    displayOrder: 4,
  },
  {
    name: "Airbnb Turnover",
    slug: "airbnb-turnover",
    description: "Reliable turnover cleaning for short-term rental properties.",
    displayOrder: 5,
  },
  {
    name: "Post-Construction",
    slug: "post-construction",
    description: "Cleaning focused on dust, debris, and residue after construction or renovation.",
    displayOrder: 6,
  },
];

const cleaningExtras = [
  {
    name: "Inside Oven",
    description: "Cleaning the interior surfaces of the oven.",
    displayOrder: 1,
  },
  {
    name: "Inside Refrigerator",
    description: "Cleaning the interior of the refrigerator.",
    displayOrder: 2,
  },
  {
    name: "Interior Windows",
    description: "Cleaning interior-facing window surfaces.",
    displayOrder: 3,
  },
  {
    name: "Inside Cabinets",
    description: "Cleaning the interior surfaces of accessible cabinets.",
    displayOrder: 4,
  },
  {
    name: "Laundry",
    description: "Additional laundry assistance when requested.",
    displayOrder: 5,
  },
];

const bedroomPricingRules = [
  { bedroomCount: 1, startingPrice: 100 },
  { bedroomCount: 2, startingPrice: 200 },
  { bedroomCount: 3, startingPrice: 300 },
  { bedroomCount: 4, startingPrice: 400 },
];

async function seedCleaningServices() {
  console.log("Seeding cleaning services...");

  for (const service of cleaningServices) {
    await prisma.cleaningService.upsert({
      where: { slug: service.slug },
      update: {
        name: service.name,
        description: service.description,
        isActive: true,
        displayOrder: service.displayOrder,
      },
      create: {
        ...service,
        isActive: true,
      },
    });
  }
}

async function seedCleaningExtras() {
  console.log("Seeding cleaning extras...");

  for (const extra of cleaningExtras) {
    const existingExtra = await prisma.cleaningExtra.findFirst({
      where: { name: extra.name },
      select: { id: true },
    });

    if (existingExtra) {
      await prisma.cleaningExtra.update({
        where: { id: existingExtra.id },
        data: {
          description: extra.description,
          isActive: true,
          displayOrder: extra.displayOrder,
        },
      });
    } else {
      await prisma.cleaningExtra.create({
        data: {
          ...extra,
          isActive: true,
        },
      });
    }
  }
}

async function seedPricingRules() {
  console.log("Seeding pricing rules...");

  for (const rule of bedroomPricingRules) {
    const existingRule = await prisma.pricingRule.findFirst({
      where: {
        propertyType: null,
        bedroomCount: rule.bedroomCount,
      },
      select: { id: true },
    });

    if (existingRule) {
      await prisma.pricingRule.update({
        where: { id: existingRule.id },
        data: {
          propertyType: null,
          bedroomCount: rule.bedroomCount,
          startingPrice: rule.startingPrice,
          isActive: true,
        },
      });
    } else {
      await prisma.pricingRule.create({
        data: {
          propertyType: null,
          bedroomCount: rule.bedroomCount,
          startingPrice: rule.startingPrice,
          isActive: true,
        },
      });
    }
  }
}

async function main() {
  await seedCleaningServices();
  await seedCleaningExtras();
  await seedPricingRules();
  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error("Seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
