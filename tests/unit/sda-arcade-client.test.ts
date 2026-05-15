import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import fixtureRaw from "@/lib/fixtures/dailyPressurePack.sample.json";
import type { ArcadeDailyPressurePack } from "@/lib/api/types";
import {
  ArcadeApiError,
  fetchPressureDaily,
  fetchPressureToday,
  normalizePressurePack,
} from "@/lib/api/sdaArcadeClient";

const samplePack = fixtureRaw as ArcadeDailyPressurePack;

const sdaPressurePack = {
  date: "2026-05-13",
  moments: [
    {
      gameId: "190310",
      playIndex: 90076,
      rank: 1,
      difficulty: 100,
      tier: "extreme",
      cardPayload: {
        id: "190310-90076",
        half: "top",
        type: "play",
        title: "Top 9th",
        inning: 9,
        description: "Rodriguez walks home a run with the bases loaded.",
        play: {
          label: "WALK",
          playId: "90076",
          subLabel: "RUN SCORES",
          eventType: "walk",
          outsBefore: 2,
          ballsBefore: 4,
          strikesBefore: 2,
          batterName: "Julio Rodriguez",
          pitcherName: "Bryan King",
          description: "Rodriguez walks home a run with the bases loaded.",
          scoreBefore: { away: 2, home: 3 },
          baseStateBefore: { first: true, second: true, third: true },
          runsScoredOnPlay: 1,
        },
      },
    },
  ],
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sdaArcadeClient.fetchPressureToday", () => {
  it("requests the BFF today route with no-store cache and JSON accept", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, samplePack));
    await fetchPressureToday();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/pressure/today");
    expect(init?.cache).toBe("no-store");
    expect(init?.headers).toMatchObject({ Accept: "application/json" });
  });

  it("returns { ok: true, pack } for a 200 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(200, samplePack),
    );
    const result = await fetchPressureToday();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("narrow");
    expect(result.pack.date).toBe(samplePack.date);
    expect(result.pack.moments).toHaveLength(samplePack.moments.length);
  });

  it("normalizes the main SDA pressure-pack contract into arcade moments", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(200, sdaPressurePack),
    );
    const result = await fetchPressureToday();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("narrow");
    expect(result.pack.title).toBe("Daily MLB Pressure Run");
    expect(result.pack.moments).toHaveLength(1);
    expect(result.pack.moments[0]).toMatchObject({
      id: "190310-90076",
      gameId: "190310",
      rank: 1,
      momentType: "pitcher",
      pressureTier: "extreme",
      situation: {
        inning: 9,
        half: "top",
        outs: 2,
        balls: 3,
        strikes: 2,
        runners: { first: true, second: true, third: true },
      },
      realOutcome: {
        label: "WALK",
        resultType: "walk",
        runsScored: 1,
      },
    });
    expect(result.pack.moments[0].gameplay.pitcher).toBeDefined();
  });

  it("returns no_pack response for a 404 with detail + date passthrough", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(404, { detail: "No pack today", date: "2026-05-14" }),
    );
    const result = await fetchPressureToday();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("narrow");
    expect(result.reason).toBe("no_pack");
    expect(result.date).toBe("2026-05-14");
    expect(result.detail).toBe("No pack today");
  });

  it("returns no_pack with a fallback detail when the 404 body is unparseable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not json", { status: 404 }),
    );
    const result = await fetchPressureToday();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("narrow");
    expect(result.reason).toBe("no_pack");
    expect(result.detail).not.toBe("");
  });

  it("throws ArcadeApiError on 5xx responses, forwarding status and body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("upstream blew up", {
        status: 502,
        headers: { "Content-Type": "text/plain" },
      }),
    );
    await expect(fetchPressureToday()).rejects.toMatchObject({
      name: "ArcadeApiError",
      status: 502,
      detail: "upstream blew up",
    });
  });

  it("throws ArcadeApiError when fetch itself rejects (transport failure)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("network down"),
    );
    await expect(fetchPressureToday()).rejects.toBeInstanceOf(ArcadeApiError);
  });
});

describe("normalizePressurePack", () => {
  it("passes through native arcade packs unchanged", () => {
    expect(normalizePressurePack(samplePack)).toBe(samplePack);
  });
});

describe("sdaArcadeClient.fetchPressureDaily", () => {
  it("URL-encodes the date segment", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, samplePack));
    await fetchPressureDaily("2026-05-12");
    expect(fetchSpy.mock.calls[0][0]).toBe(
      "/api/pressure/daily/2026-05-12",
    );
  });

  it("encodes path-unsafe characters in the date arg", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(404, { detail: "nope" }));
    await fetchPressureDaily("../malicious");
    expect(fetchSpy.mock.calls[0][0]).toBe(
      "/api/pressure/daily/..%2Fmalicious",
    );
  });
});
