import { NextResponse } from "next/server";
import { giftAmount, maxGifts } from "@/lib/config";
import {
  dbReady,
  deleteDemoGuests,
  insertGuests,
  listGuests,
  newCode,
  resetGifts,
  signVoices,
  type Guest,
} from "@/lib/db";
import { checkPin } from "@/lib/host";
import { firstLiveNumber, modeFor } from "@/lib/vtpass";
import { guessNetwork } from "@/lib/phone";

export const dynamic = "force-dynamic";

const view = (g: Guest, voices: Record<string, string> = {}) => ({
  voice: g.voice_path ? voices[g.voice_path] || null : null,
  id: g.id,
  code: g.code,
  name: g.name,
  phone: g.phone,
  network: g.network,
  coming: g.coming,
  is_demo: g.is_demo,
  gift_status: g.gift_status,
  gift_mode: g.gift_mode,
  gift_error: g.gift_error,
  gift_amount: g.gift_amount,
  mode: g.phone ? modeFor(g.phone) : null,
});

export async function GET(req: Request) {
  const denied = checkPin(req);
  if (denied) return denied;
  if (!dbReady())
    return NextResponse.json(
      { ok: false, error: "Database not connected." },
      { status: 503 },
    );
  const guests = await listGuests();
  const voices = await signVoices(
    guests.map((g) => g.voice_path).filter((p): p is string => !!p),
  ).catch(() => ({}));
  return NextResponse.json({
    ok: true,
    amount: giftAmount(),
    max: maxGifts(),
    guests: guests.map((g) => view(g, voices)),
  });
}

const DEMO: [string, string, string][] = [
  ["Aunty Bisi", "08031110001", "mtn"],
  ["Uncle Femi", "08021110002", "airtel"],
  ["Kemi Adeyemi", "08051110003", "glo"],
  ["Tunde", "08091110004", "etisalat"],
  ["Ngozi", "08061110005", "mtn"],
  ["Mummy Tobi", "08121110006", "airtel"],
  ["Seyi", "08151110007", "glo"],
  ["Pastor Dele", "07031110008", "mtn"],
  ["Ada", "09031110009", "mtn"],
  ["Ife", "08081110010", "airtel"],
  ["Bukky", "08171110011", "etisalat"],
];

/** { action: "demo" } loads demo guests (plus your live number), { action: "reset" } marks every gift as unsent again. */
export async function POST(req: Request) {
  const denied = checkPin(req);
  if (denied) return denied;
  if (!dbReady())
    return NextResponse.json(
      { ok: false, error: "Database not connected." },
      { status: 503 },
    );
  const { action } = await req.json().catch(() => ({}));
  try {
    if (action === "reset") {
      await resetGifts();
      return NextResponse.json({ ok: true });
    }
    if (action === "demo") {
      await deleteDemoGuests();
      const rows: Partial<Guest>[] = DEMO.map(([name, phone, network]) => ({
        name,
        phone,
        network,
        code: newCode(name),
        coming: "yes",
        is_demo: true,
      }));
      const live = firstLiveNumber();
      if (live)
        rows.splice(3, 0, {
          name: "You (live test)",
          phone: live,
          network: guessNetwork(live) || "mtn",
          code: newCode("you"),
          coming: "yes",
          is_demo: true,
        });
      await insertGuests(rows);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { ok: false, error: "Unknown action." },
      { status: 400 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json(
      {
        ok: false,
        error: msg.includes("duplicate")
          ? "One of those numbers is already on your guest list."
          : msg,
      },
      { status: 500 },
    );
  }
}
