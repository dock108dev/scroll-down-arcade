/**
 * Browser-side client for the arcade BFF proxy.
 *
 * The arcade UI never talks to SDA directly — every request goes through the
 * same-origin `/api/pressure/*` Next.js route handlers so the API key stays
 * server-side. This client wraps those routes with typed responses and a
 * distinct "no pack today" return path so the UI can render an off-day state
 * without treating it as an error.
 */

import type { ArcadeDailyPressurePack } from "@/lib/api/types";

const TODAY_PATH = "/api/pressure/today";
const DAILY_PATH_PREFIX = "/api/pressure/daily/";

/**
 * Error thrown by the arcade client for transport or upstream failures.
 * 404 is *not* an error path — it surfaces as `{ ok: false, reason: 'no_pack' }`.
 */
export class ArcadeApiError extends Error {
  readonly status: number;
  readonly detail: string | null;

  constructor(message: string, status: number, detail: string | null) {
    super(message);
    this.name = "ArcadeApiError";
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Discriminated response for a pressure-pack fetch.
 *  - `ok: true`  — pack body parsed and returned.
 *  - `ok: false` with `reason: 'no_pack'` — SDA reported no pack for the
 *    requested date. Carries the date and detail from the upstream body so
 *    the UI can show "no games on YYYY-MM-DD" without a second request.
 */
export type PressurePackResponse =
  | { ok: true; pack: ArcadeDailyPressurePack }
  | { ok: false; reason: "no_pack"; date: string; detail: string };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function readJsonSafe(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch (err) {
    // Caller still gets a usable no_pack response with empty date/detail;
    // the warn surfaces a possible upstream contract drift (e.g. SDA
    // renaming `date` in the 404 body) instead of silently masking it.
    // See error-handling-report.md §A1.
    console.warn(
      "[sdaArcadeClient] failed to parse JSON body",
      { status: res.status, error: err instanceof Error ? err.message : String(err) },
    );
    return null;
  }
}

async function fetchPack(path: string): Promise<PressurePackResponse> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network request failed";
    throw new ArcadeApiError(message, 0, null);
  }

  if (res.status === 404) {
    const body = (await readJsonSafe(res)) as
      | { detail?: unknown; date?: unknown }
      | null;
    return {
      ok: false,
      reason: "no_pack",
      date: asString(body?.date),
      detail: asString(body?.detail) || "No pressure pack available",
    };
  }

  if (!res.ok) {
    let detail: string | null = null;
    try {
      detail = await res.text();
    } catch {
      detail = null;
    }
    throw new ArcadeApiError(
      `Pressure pack request failed (${res.status})`,
      res.status,
      detail,
    );
  }

  const pack = (await res.json()) as ArcadeDailyPressurePack;
  return { ok: true, pack };
}

/** Fetch today's pressure pack from the BFF. */
export function fetchPressureToday(): Promise<PressurePackResponse> {
  return fetchPack(TODAY_PATH);
}

/**
 * Fetch the pressure pack for a specific ISO date (YYYY-MM-DD).
 * The date is URL-encoded so a malformed value cannot break the path.
 */
export function fetchPressureDaily(date: string): Promise<PressurePackResponse> {
  return fetchPack(`${DAILY_PATH_PREFIX}${encodeURIComponent(date)}`);
}
