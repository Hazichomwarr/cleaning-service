export type PropertyType =
  | "HOUSE"
  | "APARTMENT"
  | "OFFICE"
  | "COMMERCIAL"
  | "AIRBNB"
  | "OTHER";

export type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
};

export type CleaningRequestDraft = {
  serviceId: string;
  serviceName: string;
  propertyType: PropertyType | "";
  bedrooms?: number;
  bathrooms: string;
  extraIds: string[];
  preferredDate: string;
  preferredTimeWindow: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  customerNotes: string;
};

export const RESIDENTIAL_PROPERTY_TYPES: PropertyType[] = [
  "HOUSE",
  "APARTMENT",
  "AIRBNB",
];
