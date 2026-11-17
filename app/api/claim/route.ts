import { NextResponse } from "next/server";
import { claimsOpen, giftAmount } from "@/lib/config";
import {
  dbReady,
  getGuestByCode,
  getGuestByPhone,
  insertGuests,
  newCode,
  updateGuest,
} from "@/lib/db";
import { giveGift } from "@/lib/gift";
import { isNetwork, maskPhone, normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

const fail = (error: string, status = 400) =>
  NextResponse.json({ ok: false, error }, { status });

/** Guest claims their airtime. Body: { code?, name?, phone?, network? } */
export async function POST(req: Request) {
  if (!dbReady())
    return fail("Gifts aren't switched on yet. Please check back soon.", 503);
  if (!claimsOpen())
    return fail(
      "Gift claiming has closed. Thank you for celebrating with us! 🤍",
      403,
    );

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const name =
    typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  const phone = body.phone ? normalizePhone(String(body.phone)) : "";
  const network = body.network;
  if (body.phone && !phone)
    return fail(
      "That phone number doesn't look right. Use the 11-digit format, e.g. 0805 039 6354.",
    );
  if (network !== undefined && !isNetwork(network))
    return fail("Please pick your network.");

  try {
    let guest = code ? await getGuestByCode(code) : null;
    if (code && !guest)
      return fail(
        "We couldn't find your invite link. Please use the link the couple sent you.",
        404,
      );

    if (guest) {
      if (guest.gift_status === "delivered")
        return NextResponse.json({
          ok: true,
          already: true,
          phone: maskPhone(guest.phone),
          amount: guest.gift_amount ?? giftAmount(),
        });
      // Guest chose a different number, or their RSVP had none.
      if (phone && (phone !== guest.phone || network !== guest.network)) {
        const taken = await getGuestByPhone(phone);
        if (taken && taken.id !== guest.id)
          return fail("That number has already been used for a gift.");
        guest = (await updateGuest(guest.id, { phone, network })) || guest;
      }
    } else {
      // General link (guests who didn't RSVP): name + phone required, one gift per number.
      if (!name || !phone || !network)
        return fail("Please add your name, number and network.");
      const existing = await getGuestByPhone(phone);
      if (existing?.gift_status === "delivered")
        return NextResponse.json({
          ok: true,
          already: true,
          phone: maskPhone(phone),
          amount: existing.gift_amount ?? giftAmount(),
        });
      guest =
        existing ||
        (
          await insertGuests([
            { code: newCode(name), name, phone, network, coming: "walk-in" },
          ])
        )[0];
    }

    const { guest: g, error } = await giveGift(guest);
    if (error) {
      console.error("Gift failed:", error); // full reason stays in your logs and on /host
      const friendly = /already|given out|needs a phone/i.test(error)
        ? error
        : "We couldn't send your gift just now. Please try again in a few minutes 🤍";
      if (process.env.NODE_ENV !== "production")
        return NextResponse.json(
          { ok: false, error: friendly, detail: error },
          { status: 409 },
        );
      return fail(friendly, 409);
    }
    return NextResponse.json({
      ok: true,
      phone: maskPhone(g.phone),
      amount: g.gift_amount,
      mode: g.gift_mode,
    });
  } catch (e) {
    console.error(e);
    return fail(
      "Something went wrong on our side. Please try again in a minute.",
      500,
    );
  }
}
