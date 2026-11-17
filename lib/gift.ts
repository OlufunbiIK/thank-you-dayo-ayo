import "server-only";
import { countDelivered, lockForSending, updateGuest, type Guest } from "./db";
import { giftAmount, maxGifts } from "./config";
import { isNetwork } from "./phone";
import { sendAirtime } from "./vtpass";

/** Locks the guest, sends the airtime, records the result. Safe to call twice: the second call is refused. */
export async function giveGift(guest: Guest): Promise<{ guest: Guest; error?: string }> {
  if (guest.gift_status === "delivered") return { guest };
  if (!guest.phone || !isNetwork(guest.network)) return { guest, error: "This guest needs a phone number and network first." };
  if ((await countDelivered()) >= maxGifts()) return { guest, error: "All the gifts have been given out." };

  const locked = await lockForSending(guest.id);
  if (!locked) return { guest, error: "This gift is already being sent." };

  const amount = giftAmount();
  const r = await sendAirtime({ phone: guest.phone, network: guest.network, amount });
  const updated = await updateGuest(guest.id, r.ok
    ? { gift_status: "delivered", gift_amount: amount, gift_mode: r.mode, gift_ref: r.ref, gift_error: null, gifted_at: new Date().toISOString() }
    : { gift_status: "failed", gift_amount: amount, gift_mode: r.mode, gift_ref: r.ref, gift_error: r.error || "Failed" });
  return { guest: updated || guest, error: r.ok ? undefined : r.error };
}
