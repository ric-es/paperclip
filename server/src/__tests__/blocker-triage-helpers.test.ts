import { describe, expect, it } from "vitest";
import { ptDateString, ptHour, shouldRunBlockerTriageSweep } from "../services/blocker-triage-time.ts";
import { commentMentionsBlockerLine } from "../services/blocker-gate.ts";

describe("ptDateString", () => {
  it("formats UTC dates in America/Los_Angeles", () => {
    // 2026-04-17T14:30Z is 2026-04-17T07:30 PDT
    expect(ptDateString(new Date("2026-04-17T14:30:00.000Z"))).toBe("2026-04-17");
    // 2026-04-17T06:00Z is 2026-04-16T23:00 PDT (still previous calendar day in PT)
    expect(ptDateString(new Date("2026-04-17T06:00:00.000Z"))).toBe("2026-04-16");
  });
});

describe("ptHour", () => {
  it("returns the local PT hour in 24h form", () => {
    expect(ptHour(new Date("2026-04-17T15:00:00.000Z"))).toBe(8); // 8 AM PDT
    expect(ptHour(new Date("2026-04-17T14:59:00.000Z"))).toBe(7); // 7:59 AM PDT
    expect(ptHour(new Date("2026-04-17T07:00:00.000Z"))).toBe(0); // midnight PDT
  });
});

describe("shouldRunBlockerTriageSweep", () => {
  it("returns false before 08:00 PT", () => {
    const now = new Date("2026-04-17T14:59:00.000Z"); // 07:59 PDT
    expect(shouldRunBlockerTriageSweep(now, null)).toBe(false);
  });

  it("returns true at 08:00 PT when not yet run today", () => {
    const now = new Date("2026-04-17T15:00:00.000Z"); // 08:00 PDT
    expect(shouldRunBlockerTriageSweep(now, null)).toBe(true);
    expect(shouldRunBlockerTriageSweep(now, "2026-04-16")).toBe(true);
  });

  it("returns false after the sweep already ran today", () => {
    const now = new Date("2026-04-17T15:30:00.000Z"); // 08:30 PDT
    expect(shouldRunBlockerTriageSweep(now, "2026-04-17")).toBe(false);
  });

  it("returns true the next PT calendar day even if before 09:00 PT", () => {
    const now = new Date("2026-04-18T15:05:00.000Z"); // 08:05 PDT next day
    expect(shouldRunBlockerTriageSweep(now, "2026-04-17")).toBe(true);
  });
});

describe("commentMentionsBlockerLine", () => {
  it("recognizes a leading BLOCKER: line", () => {
    expect(commentMentionsBlockerLine("BLOCKER: vendor outage", null)).toBe(true);
  });

  it("recognizes BLOCKER: as a markdown line", () => {
    const body = ["status update", "", "BLOCKER: waiting on credentials from board"].join("\n");
    expect(commentMentionsBlockerLine(body, null)).toBe(true);
  });

  it("recognizes BLOCKER: in description fallback", () => {
    expect(commentMentionsBlockerLine(null, "BLOCKER: legal review")).toBe(true);
  });

  it("rejects vague waiting language without a BLOCKER: line", () => {
    expect(commentMentionsBlockerLine("waiting on the board", "still pending")).toBe(false);
  });

  it("requires BLOCKER: at the start of a line", () => {
    expect(commentMentionsBlockerLine("This is not a real BLOCKER: statement", null)).toBe(false);
  });
});
