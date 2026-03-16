import { FLORIDA_ZIP_TO_COUNTY } from "../data/florida-zip-to-county.js";
import {
  FLORIDA_COUNTY_RATES,
  FLORIDA_FALLBACK_RATE,
} from "../data/florida-county-rates.js";

export interface FloridaTaxResult {
  rate: number;
  county?: string;
  source: "county" | "fallback";
}

/**
 * Get Florida sales tax rate for a shipping address.
 * Returns 0 for non-FL addresses; county rate or 7.5% fallback for FL.
 */
/** Normalize state to 2-letter abbrev; accepts "FL" or "Florida" */
function isFloridaState(state: string | undefined): boolean {
  const s = state?.toUpperCase().trim();
  return s === "FL" || s === "FLORIDA";
}

export function getFloridaTaxRate(address: {
  state?: string;
  postalCode?: string;
}): FloridaTaxResult {
  if (!isFloridaState(address.state)) {
    return { rate: 0, source: "fallback" };
  }

  const zip = address.postalCode?.replace(/\D/g, "").slice(0, 5);
  if (!zip || zip.length !== 5) {
    return { rate: FLORIDA_FALLBACK_RATE, source: "fallback" };
  }

  const countyFips = FLORIDA_ZIP_TO_COUNTY[zip];
  if (!countyFips) {
    return { rate: FLORIDA_FALLBACK_RATE, source: "fallback" };
  }

  const rate = FLORIDA_COUNTY_RATES[countyFips];
  if (rate === undefined) {
    return { rate: FLORIDA_FALLBACK_RATE, county: countyFips, source: "fallback" };
  }

  return { rate, county: countyFips, source: "county" };
}
