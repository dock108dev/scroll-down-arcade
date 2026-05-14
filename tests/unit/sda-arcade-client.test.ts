import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import fixtureRaw from "@/lib/fixtures/dailyPressurePack.sample.json";
import type { ArcadeDailyPressurePack } from "@/lib/api/types";
import {
  ArcadeApiError,
  fetchPressureDaily,
  fetchPressureToday,
} from "@/lib/api/sdaArcadeClient";

const samplePack = fixtureRaw as ArcadeDailyPressurePack;

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
