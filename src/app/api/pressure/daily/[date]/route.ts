import { proxyPressurePack } from "@/lib/api/server";

/**
 * BFF proxy: forwards `GET /api/pressure/daily/[date]` to
 * `GET /api/v1/scroll-down-mlb/pressure/daily/{date}` on the SDA backend.
 *
 * Date validation lives on the SDA side (422 for malformed, 400 for
 * future dates, 404 for empty packs). The proxy forwards whatever status
 * SDA returns so the arcade client can react to each case distinctly.
 */

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ date: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const { date } = await ctx.params;
  return proxyPressurePack({ kind: "daily", date }, "[api/pressure/daily]");
}
