import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { localActivityDayAndIso } from "../lib/site-activity-record.js";

describe("localActivityDayAndIso", () => {
  it("returns local midnight and ISO day string", () => {
    const { activityDay, dayIso } = localActivityDayAndIso(
      new Date(2026, 5, 14, 15, 30, 0),
    );
    assert.equal(activityDay.getFullYear(), 2026);
    assert.equal(activityDay.getMonth(), 5);
    assert.equal(activityDay.getDate(), 14);
    assert.equal(activityDay.getHours(), 0);
    assert.equal(dayIso, "2026-06-14");
  });
});
