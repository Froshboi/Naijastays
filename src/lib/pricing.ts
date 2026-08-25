import type { Property } from "@/lib/data";

export function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function normalizePriceLabel(label?: string | null, listingType?: string, propertyType?: string) {
  const raw = (label || "").trim().toLowerCase();

  if (propertyType === "Hotel" || listingType === "Short Let") return "/ night";
  if (listingType === "For Rent" && (!raw || raw === "year" || raw === "per year")) return "/ year";
  if (!raw) return "";
  if (raw.startsWith("/")) return raw;
  if (raw === "night" || raw === "per night") return "/ night";
  if (raw === "month" || raw === "per month") return "/ month";
  if (raw === "year" || raw === "per year") return "/ year";

  return label?.trim() || "";
}

function parseAmount(amount: string, suffix = "") {
  const numeric = Number(amount.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return null;

  const unit = suffix.toLowerCase();
  if (unit === "k" || unit === "thousand") return Math.round(numeric * 1000);
  if (unit === "m" || unit === "million") return Math.round(numeric * 1000000);
  return Math.round(numeric);
}

function findAmount(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  if (!match) return null;
  return parseAmount(match[1], match[2]);
}

export function getRentalPricingSummary(property: Property) {
  if (property.listing_type !== "For Rent") return null;

  const text = `${property.description || ""} ${property.writeup || ""}`.replace(/\s+/g, " ");
  const totalPattern = /(?:total\s*(?:payment|pay|move[\s-]?in|package)?|move[\s-]?in\s*(?:payment|total|cost)?)[^\d₦]{0,24}₦?\s*([\d,.]+)\s*(k|m|million|thousand)?/i;
  const renewalPattern = /(?:to\s*)?renew(?:al)?(?:\s*(?:rate|rent|fee|payment))?[^\d₦]{0,24}₦?\s*([\d,.]+)\s*(k|m|million|thousand)?/i;

  const parsedTotal = findAmount(text, totalPattern);
  const parsedRenewal = findAmount(text, renewalPattern);
  const renewalRate = parsedRenewal && parsedRenewal > 0 ? parsedRenewal : property.price;

  return {
    moveInTotal: parsedTotal && parsedTotal > 0 ? parsedTotal : null,
    renewalRate,
    label: normalizePriceLabel(property.price_label, property.listing_type, property.property_type),
    hasParsedMoveInTotal: Boolean(parsedTotal),
    hasParsedRenewalRate: Boolean(parsedRenewal),
  };
}

export function getListingPrice(property: Property) {
  const rental = getRentalPricingSummary(property);
  const amount = rental?.renewalRate || property.price;

  return {
    amount,
    formatted: formatNaira(amount),
    label: normalizePriceLabel(property.price_label, property.listing_type, property.property_type),
  };
}
