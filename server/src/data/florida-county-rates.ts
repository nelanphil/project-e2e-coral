/**
 * Florida county sales tax rates (2025).
 * State base 6% + county discretionary surtax.
 * Source: Tax-Rates.org, Florida DOR
 */
export const FLORIDA_COUNTY_RATES: Record<string, number> = {
  "12001": 0.065, // Alachua
  "12003": 0.07, // Baker
  "12005": 0.07, // Bay
  "12007": 0.07, // Bradford
  "12009": 0.07, // Brevard
  "12011": 0.06, // Broward (some cities 6%, county 7%)
  "12013": 0.075, // Calhoun
  "12015": 0.07, // Charlotte
  "12017": 0.06, // Citrus
  "12019": 0.07, // Clay
  "12021": 0.06, // Collier
  "12023": 0.07, // Columbia
  "12027": 0.075, // DeSoto
  "12029": 0.07, // Dixie
  "12031": 0.07, // Duval
  "12033": 0.075, // Escambia
  "12035": 0.07, // Flagler
  "12037": 0.07, // Franklin
  "12039": 0.075, // Gadsden
  "12041": 0.07, // Gilchrist
  "12043": 0.07, // Glades
  "12045": 0.07, // Gulf
  "12047": 0.07, // Hamilton
  "12049": 0.07, // Hardee
  "12051": 0.07, // Hendry
  "12053": 0.065, // Hernando
  "12055": 0.075, // Highlands
  "12057": 0.07, // Hillsborough
  "12059": 0.07, // Holmes
  "12061": 0.07, // Indian River
  "12063": 0.075, // Jackson
  "12065": 0.07, // Jefferson
  "12067": 0.07, // Lafayette
  "12069": 0.07, // Lake
  "12071": 0.06, // Lee
  "12073": 0.075, // Leon
  "12075": 0.07, // Levy
  "12077": 0.08, // Liberty
  "12079": 0.075, // Madison
  "12081": 0.07, // Manatee
  "12083": 0.07, // Marion
  "12085": 0.065, // Martin (St. Lucie area)
  "12086": 0.075, // Monroe
  "12087": 0.07, // Okeechobee
  "12089": 0.07, // Nassau
  "12091": 0.065, // Orange
  "12093": 0.075, // Osceola
  "12095": 0.07, // Palm Beach
  "12097": 0.07, // Pasco
  "12099": 0.07, // Pinellas
  "12101": 0.07, // Polk
  "12103": 0.07, // Putnam
  "12105": 0.065, // St. Johns
  "12107": 0.065, // St. Lucie
  "12109": 0.07, // Santa Rosa
  "12111": 0.07, // Sarasota
  "12113": 0.07, // Seminole
  "12115": 0.07, // Sumter
  "12117": 0.07, // Suwannee
  "12119": 0.07, // Taylor
  "12121": 0.07, // Union
  "12123": 0.065, // Volusia
  "12125": 0.07, // Wakulla
  "12127": 0.07, // Walton
  "12129": 0.07, // Washington
};

/** Nassau County - 12089 in some lists, verify: 12089 is Nassau per Census */
export const FLORIDA_FALLBACK_RATE = 0.075;
