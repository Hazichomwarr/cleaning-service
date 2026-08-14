export function escapeCustomerHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export function customerDisplay(value: string | null | undefined, fallback = "Not provided"): string {
  return escapeCustomerHtml(value?.trim() || fallback);
}

export function renderCustomerAddress(data: { addressLine1: string; addressLine2: string | null; city: string; state: string; postalCode: string }): string {
  return [data.addressLine1, data.addressLine2, `${data.city}, ${data.state} ${data.postalCode}`]
    .filter(Boolean).map((value) => customerDisplay(value)).join("<br>");
}
