import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeUsaContinentalFromVisitorRows,
  parseAnalyticsMonthYear,
} from "../lib/admin-analytics.js";
import { guestKeyFromMeta } from "../lib/site-activity-record.js";

describe("parseAnalyticsMonthYear", () => {
  it("parses explicit month and year into a half-open range", () => {
    const { month, year, dateFrom, dateTo } = parseAnalyticsMonthYear({
      query: { month: "6", year: "2026" },
    });
    assert.equal(month, 6);
    assert.equal(year, 2026);
    assert.equal(dateFrom.getFullYear(), 2026);
    assert.equal(dateFrom.getMonth(), 5);
    assert.equal(dateFrom.getDate(), 1);
    assert.equal(dateTo.getFullYear(), 2026);
    assert.equal(dateTo.getMonth(), 6);
    assert.equal(dateTo.getDate(), 1);
  });

  it("clamps invalid month to current month bounds", () => {
    const { month } = parseAnalyticsMonthYear({
      query: { month: "99", year: "2026" },
    });
    assert.equal(month, 12);
  });
});

describe("computeUsaContinentalFromVisitorRows", () => {
  it("dedupes visitors and excludes Alaska and Hawaii", () => {
    const result = computeUsaContinentalFromVisitorRows([
      { visitorKey: "a", state: "California" },
      { visitorKey: "a", state: "California" },
      { visitorKey: "b", state: "Texas" },
      { visitorKey: "c", state: "Alaska" },
      { visitorKey: "d", state: "Hawaii" },
    ]);
    assert.equal(result.uniqueVisitorsTotal, 2);
    assert.equal(result.byState.length, 2);
    const ca = result.byState.find((r) => r.state === "California");
    assert.equal(ca?.uniqueVisitors, 1);
  });
});

describe("guestKeyFromMeta", () => {
  it("prefers cookie id over cart session and IP hash", () => {
    const key = guestKeyFromMeta(
      { cookieId: "abc-123", ipAddress: "1.2.3.4", userAgent: "Test" },
      "507f1f77bcf86cd799439011",
    );
    assert.equal(key, "abc-123");
  });

  it("falls back to cart session when cookie id is missing", () => {
    const key = guestKeyFromMeta(
      { ipAddress: "1.2.3.4", userAgent: "Test" },
      "507f1f77bcf86cd799439011",
    );
    assert.equal(key, "sess:507f1f77bcf86cd799439011");
  });

  it("returns null when no identity signals exist", () => {
    const key = guestKeyFromMeta({}, undefined);
    assert.equal(key, null);
  });
});
