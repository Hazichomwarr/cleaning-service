import RequestExperience from "@/components/request/RequestExperience";
import { prisma } from "@/src/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function RequestPage() {
  const services = await prisma.cleaningService.findMany({ where: { isActive: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, description: true } });

  return <RequestExperience services={services} />;
}
