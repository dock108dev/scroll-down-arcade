import { proxyPressurePack } from "@/lib/api/server";

/**
 * BFF proxy: forwards `GET /api/pressure/today` to
 * `GET /api/v1/scroll-down-mlb/pressure/today` on the SDA backend.
 *
 * Status passthrough — the SDA 404 carries `{detail, date}` and the
 * arcade client uses that shape to render "no games today". Rewriting
 * the status to 200 with an empty pack would hide that signal.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyPressurePack({ kind: "today" }, "[api/pressure/today]");
}
