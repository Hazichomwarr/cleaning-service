import type { PropertyType, WorkerType } from "../generated/prisma/client";

export function isResidentialPropertyType(propertyType: PropertyType): boolean {
  return propertyType === "HOUSE" || propertyType === "APARTMENT" || propertyType === "AIRBNB";
}

export function isWorkerEligibleForProperty(propertyType: PropertyType, workerType: WorkerType): boolean {
  return !isResidentialPropertyType(propertyType) || workerType === "CREW";
}

export function getEligibleWorkerTypes(propertyType: PropertyType): WorkerType[] {
  return isResidentialPropertyType(propertyType) ? ["CREW"] : ["CONTRACTOR", "CREW"];
}
