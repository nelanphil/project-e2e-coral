import zipState from "zip-state";

/** US state full name to 2-letter abbreviation */
const US_STATE_TO_ABBREV: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  "District of Columbia": "DC",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

function normalizeStateToAbbrev(state: string): string | null {
  const trimmed = state?.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (upper.length === 2) return upper;
  const title = trimmed
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return US_STATE_TO_ABBREV[title] ?? null;
}

export interface PostalCodeValidationResult {
  valid: boolean;
  expectedState?: string;
  message?: string;
}

/**
 * Validate that a US postal code matches the given state.
 * For non-US addresses, returns valid (skip validation).
 */
export function validatePostalCodeMatchesState(
  postalCode: string,
  state: string,
  country: string
): PostalCodeValidationResult {
  const countryNorm = country?.toUpperCase().trim();
  if (countryNorm !== "US" && countryNorm !== "USA") {
    return { valid: true };
  }

  const zip = postalCode?.replace(/\D/g, "").slice(0, 5);
  if (!zip || zip.length !== 5) {
    return {
      valid: false,
      message: "Enter a valid 5-digit US postal code.",
    };
  }

  const expectedState = zipState(zip);
  if (expectedState === null) {
    return {
      valid: false,
      message: "Postal code does not match state.",
    };
  }

  const stateAbbrev = normalizeStateToAbbrev(state);
  if (!stateAbbrev) {
    return {
      valid: false,
      message: "Enter a valid US state.",
    };
  }

  if (expectedState !== stateAbbrev) {
    return {
      valid: false,
      expectedState,
      message: `Postal code does not match state.`,
    };
  }

  return { valid: true };
}
