import "server-only";
import { normalizePhone, type NetworkId } from "./phone";

/*
  Three ways a gift can go out:
  • live       real airtime, only for numbers listed in VTPASS_LIVE_NUMBERS (your own, while demoing)
  • sandbox    VTpass test mode: real API, no money moves (uses VTpass's test number 08011111111)
  • simulated  no VTpass keys yet: pretends to send, so the demo still works
*/
export type GiftMode = "live" | "sandbox" | "simulated";
const clean = (v?: string) =>
  (v || "").trim().replace(/^["']|["']$/g, "") || undefined;
const SANDBOX = {
  base: "https://sandbox.vtpass.com/api",
  api: clean(process.env.VTPASS_SANDBOX_API_KEY),
  secret: clean(process.env.VTPASS_SANDBOX_SECRET_KEY),
};
const LIVE = {
  base: "https://vtpass.com/api",
  api: clean(process.env.VTPASS_LIVE_API_KEY),
  secret: clean(process.env.VTPASS_LIVE_SECRET_KEY),
};
const SANDBOX_TEST_PHONE = "08011111111";

const liveNumbers = () =>
  (process.env.VTPASS_LIVE_NUMBERS || "")
    .split(",")
    .map((p) => normalizePhone(p))
    .filter(Boolean);

export function modeFor(phone: string | null | undefined): GiftMode {
  const p = normalizePhone(phone || "");
  if (p && liveNumbers().includes(p) && LIVE.api && LIVE.secret) return "live";
  if (SANDBOX.api && SANDBOX.secret) return "sandbox";
  return "simulated";
}

export const firstLiveNumber = () => liveNumbers()[0] || "";

/** VTpass wants a unique id that starts with the Lagos date and time: YYYYMMDDHHmm + extra characters. */
function requestId() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}${p.month}${p.day}${p.hour}${p.minute}${Math.random().toString(36).slice(2, 10)}`;
}

export type SendResult = {
  ok: boolean;
  mode: GiftMode;
  ref: string;
  status: string;
  error?: string;
};

export async function sendAirtime(opts: {
  phone: string;
  network: NetworkId;
  amount: number;
}): Promise<SendResult> {
  const mode = modeFor(opts.phone);
  const ref = requestId();

  if (mode === "simulated") {
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 700));
    return { ok: true, mode, ref: `SIM-${ref}`, status: "delivered" };
  }

  const cfg = mode === "live" ? LIVE : SANDBOX;
  try {
    const res = await fetch(`${cfg.base}/pay`, {
      method: "POST",
      headers: {
        "api-key": cfg.api!,
        "secret-key": cfg.secret!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        request_id: ref,
        serviceID: mode === "sandbox" ? "mtn" : opts.network,
        amount: opts.amount,
        phone: mode === "sandbox" ? SANDBOX_TEST_PHONE : opts.phone,
      }),
      cache: "no-store",
    });
    const raw = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(raw);
    } catch {}
    if (data?.code !== "000")
      console.error(
        "VTpass",
        res.status,
        "api-key:",
        cfg.api?.slice(0, 4),
        "secret:",
        cfg.secret?.slice(0, 4),
        raw.slice(0, 300),
      );
    const status: string = data?.content?.transactions?.status || "";
    if (data?.code === "000" && status !== "failed")
      return { ok: true, mode, ref, status: status || "delivered" };
    return {
      ok: false,
      mode,
      ref,
      status: status || "failed",
      error:
        data?.response_description ||
        data?.message ||
        `VTpass error (HTTP ${res.status}) ${raw.slice(0, 160)}`,
    };
  } catch (e) {
    return {
      ok: false,
      mode,
      ref,
      status: "failed",
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}
