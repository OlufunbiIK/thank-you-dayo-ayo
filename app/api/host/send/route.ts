import { NextResponse } from "next/server";
import { getGuestById } from "@/lib/db";
import { giveGift } from "@/lib/gift";
import { checkPin } from "@/lib/host";
import { modeFor } from "@/lib/vtpass";

export const dynamic = "force-dynamic";

/** Host sends one guest's gift. Body: { id } */
export async function POST(req: Request) {
  const denied = checkPin(req); if (denied) return denied;
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ ok: false, error: "Missing guest." }, { status: 400 });
  try {
    const guest = await getGuestById(id);
    if (!guest) return NextResponse.json({ ok: false, error: "Guest not found." }, { status: 404 });
    const { guest: g, error } = await giveGift(guest);
    return NextResponse.json({
      ok: !error, error,
      guest: { id: g.id, gift_status: g.gift_status, gift_mode: g.gift_mode, gift_error: g.gift_error, gift_amount: g.gift_amount, mode: g.phone ? modeFor(g.phone) : null },
    }, { status: error ? 409 : 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
