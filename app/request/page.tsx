import CleaningRequestForm from "@/components/request/CleaningRequestForm";
import ReturningCustomerVerification from "@/components/request/ReturningCustomerVerification";
import { prisma } from "@/src/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function RequestPage() {
  const [services, extras] = await Promise.all([
    prisma.cleaningService.findMany({ where: { isActive: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, description: true } }),
    prisma.cleaningExtra.findMany({ where: { isActive: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, description: true } }),
  ]);

  return <><div className="mx-auto max-w-7xl px-5 pt-8 sm:pt-12 lg:px-8 lg:pt-16"><ReturningCustomerVerification /></div><CleaningRequestForm services={services} extras={extras} /></>;
}
