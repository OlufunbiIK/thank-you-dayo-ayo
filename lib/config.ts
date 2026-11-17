/* ─────────────────────────  Edit the couple's details here  ───────────────────────── */
export const COUPLE = {
  bride: "Morayo",
  groom: "Dayo",
  hashtag: "#MoDay27",
  eventSlug: "moday27", // must match EVENT_SLUG in the IV's /api/rsvp
  dateShort: "17 · 04 · 2027",
  city: "Abuja",
  message:
    "We're still smiling from the weekend. Thank you for the prayers, the dancing, the spraying and for showing up for us. Our home starts with people like you in it.",
  ivUrl: "https://dayo-and-ayo.vercel.app",
  madeBy: "https://eventlybuilt-portfolio.vercel.app",
};
/* ───────────────────────────────────────────────────────────────────────────────────── */

/** Airtime per guest, in naira. Keep it small while testing. */
export function giftAmount() {
  const n = parseInt(process.env.GIFT_AMOUNT || "100", 10);
  return Math.min(10000, Math.max(50, Number.isFinite(n) ? n : 100));
}

/** Stop handing out gifts after this many deliveries (protects the couple's wallet). */
export function maxGifts() {
  const n = parseInt(process.env.MAX_GIFTS || "50", 10);
  return Number.isFinite(n) ? n : 50;
}

export const claimsOpen = () => (process.env.CLAIMS_OPEN ?? "true") !== "false";
