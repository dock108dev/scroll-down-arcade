import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { trackEvent, type ArcadeEvent } from "@/lib/analytics/events";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
  setNodeEnv(ORIGINAL_NODE_ENV);
});

function setNodeEnv(value: string | undefined): void {
  // Restore so cross-test ordering does not leak a forced NODE_ENV value.
  // Some Node versions guard process.env.NODE_ENV with a non-writable
  // descriptor; vi.stubEnv is the supported escape hatch.
  if (value === undefined) {
    vi.unstubAllEnvs();
    return;
  }
  vi.stubEnv("NODE_ENV", value);
}

describe("trackEvent — development logging", () => {
  beforeEach(() => {
    setNodeEnv("development");
  });

  it("logs to console with a tag, the event name, and the full event payload", () => {
    const event: ArcadeEvent = {
      name: "moment_started",
      momentId: "m-1",
      momentType: "hitter",
      rank: 3,
    };

    trackEvent(event);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("[arcade:analytics]", "moment_started", event);
  });

  it("logs every variant of the discriminated union", () => {
    const events: ArcadeEvent[] = [
      { name: "moment_started", momentId: "m-1", momentType: "pitcher", rank: 1 },
      { name: "swing_result", momentId: "m-1", result: "perfect", score: 200 },
      { name: "pitch_result", momentId: "m-1", result: "good_pitch", score: 140 },
      { name: "moment_completed", momentId: "m-1", cleared: true },
      { name: "ad_break_shown", strikesUsed: 2, momentIndex: 4 },
      { name: "ad_break_continued" },
      { name: "run_completed", finalScore: 1234, momentsCleared: 8, perfectHits: 3 },
      { name: "pack_loaded", date: "2026-05-14", source: "fixture" },
    ];

    for (const event of events) {
      trackEvent(event);
    }

    expect(logSpy).toHaveBeenCalledTimes(events.length);
  });
});

describe("trackEvent — non-development is a no-op", () => {
  it("does not log when NODE_ENV is production", () => {
    setNodeEnv("production");
    trackEvent({ name: "ad_break_continued" });
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("does not log when NODE_ENV is test", () => {
    setNodeEnv("test");
    trackEvent({ name: "ad_break_continued" });
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("does not log for any unfamiliar NODE_ENV", () => {
    setNodeEnv("staging");
    trackEvent({ name: "ad_break_continued" });
    expect(logSpy).not.toHaveBeenCalled();
  });
});
