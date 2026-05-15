/**
 * Server-only helpers for the BFF proxy routes.
 *
 * The arcade browser never talks to the SDA backend directly — it goes
 * through `/api/pressure/*` so the `X-API-Key` header stays server-side.
 * Helpers here are only safe to import from `route.ts` handlers or other
 * server-only modules (importing them into a client component would leak
 * the env vars into the bundle).
 */

import { NextResponse } from "next/server";

const SDA_BACKEND_BASE_URL = "https://sda.dock108.dev";
const TODAY_PATH = "/api/v1/scroll-down-mlb/pressure/today";
const DAILY_PATH_PREFIX = "/api/v1/scroll-down-mlb/pressure/daily/";
// Hard upper bound on a single SDA call. Without this an unhealthy backend
// would hold a Next.js function handler open until the platform-level
// timeout fires (minutes, not seconds), producing pager noise that looks
// like the BFF is broken rather than SDA. 8s is long enough for any
// legitimate deck build + DB round-trip and short enough that retries from
// the arcade client see a clean 504 instead of a hung request. See
// error-handling-report.md §A2.
const UPSTREAM_TIMEOUT_MS = 8_000;

export type PressurePackPath =
  | { kind: "today" }
  | { kind: "daily"; date: string };

export class SdaUpstreamError extends Error {
  /** HTTP status this proxy should surface to the arcade client. */
  readonly proxyStatus: number;
  /** Raw upstream body, forwarded as-is when we have one. */
  readonly upstreamBody: string | null;

  constructor(message: string, proxyStatus: number, upstreamBody: string | null) {
    super(message);
    this.name = "SdaUpstreamError";
    this.proxyStatus = proxyStatus;
    this.upstreamBody = upstreamBody;
  }
}

function resolvePath(target: PressurePackPath): string {
  if (target.kind === "today") {
    return TODAY_PATH;
  }
  return `${DAILY_PATH_PREFIX}${encodeURIComponent(target.date)}`;
}

function readEnv(): { baseUrl: string; apiKey: string } {
  const baseUrl = (
    process.env.SPORTS_API_INTERNAL_URL ||
    process.env.ARCADE_SDA_BASE_URL ||
    SDA_BACKEND_BASE_URL
  ).trim();
  const apiKey = (
    process.env.SPORTS_DATA_API_KEY ||
    process.env.SPORTS_API_KEY ||
    process.env.API_KEY ||
    process.env.ARCADE_API_KEY ||
    ""
  ).trim();
  if (!baseUrl) {
    throw new SdaUpstreamError(
      "SPORTS_API_INTERNAL_URL is not configured",
      503,
      null,
    );
  }
  if (!apiKey) {
    throw new SdaUpstreamError(
      "SPORTS_DATA_API_KEY is not configured",
      503,
      null,
    );
  }
  // Trim trailing slash so we never produce `host//api/v1/...`.
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

/**
 * Fetch the pressure pack from SDA and return both the body and the upstream
 * status. The caller is responsible for forwarding the status code unchanged
 * — that 404 passthrough is the BFF's main contract (the arcade client
 * distinguishes "no pack today" from a transport failure by status).
 */
export async function fetchPressurePack(target: PressurePackPath): Promise<{
  status: number;
  body: string;
  contentType: string;
}> {
  const { baseUrl, apiKey } = readEnv();
  const url = `${baseUrl}${resolvePath(target)}`;
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-API-Key": apiKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    // AbortSignal.timeout fires a DOMException with name "TimeoutError";
    // surface that as a 504 so the route handler distinguishes a hung
    // backend from a generic network failure (route catch reports the
    // SdaUpstreamError, otherwise it falls through to a 502).
    const isTimeout =
      err instanceof DOMException && err.name === "TimeoutError";
    if (isTimeout) {
      throw new SdaUpstreamError(
        `Upstream SDA request exceeded ${UPSTREAM_TIMEOUT_MS}ms`,
        504,
        null,
      );
    }
    throw err;
  }
  const body = await upstream.text();
  const contentType = upstream.headers.get("content-type") ?? "application/json";
  return { status: upstream.status, body, contentType };
}

/**
 * Shared proxy implementation for the `/api/pressure/*` route handlers.
 *
 * Pinning ``Content-Type: application/json`` rather than echoing the
 * upstream value is deliberate — the SDA pressure surface is always JSON
 * (FastAPI ``HTTPException`` + the explicit ``JSONResponse`` on the 404
 * path), and forwarding an unexpected ``text/html`` would let a body
 * containing markup render in-browser. See security-report.md.
 *
 * The ``SdaUpstreamError`` branch keeps the descriptive reason (env var
 * name, timeout value, ...) server-side and surfaces a generic detail to
 * the client — the status code already communicates the failure mode to
 * the arcade UI.
 */
export async function proxyPressurePack(
  target: PressurePackPath,
  logPrefix: string,
): Promise<NextResponse> {
  try {
    const { status, body } = await fetchPressurePack(target);
    return new NextResponse(body, {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof SdaUpstreamError) {
      console.error(`${logPrefix} SDA upstream error`, {
        proxyStatus: err.proxyStatus,
        reason: err.message,
      });
      return NextResponse.json(
        { detail: "Pressure pack service unavailable" },
        { status: err.proxyStatus },
      );
    }
    console.error(`${logPrefix} upstream fetch failed`, err);
    return NextResponse.json(
      { detail: "Failed to reach pressure pack service" },
      { status: 502 },
    );
  }
}
