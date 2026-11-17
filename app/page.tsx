import ThankYou, { type GuestView } from "@/components/ThankYou";
import { giftAmount } from "@/lib/config";
import { dbReady, getGuestByCode } from "@/lib/db";
import { maskPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ g?: string; to?: string }> }) {
  const sp = await searchParams;
  let guest: GuestView | null = null;
  if (sp.g && dbReady()) {
    try {
      const g = await getGuestByCode(sp.g);
      if (g) guest = {
        code: g.code,
        name: g.name,
        phoneMasked: maskPhone(g.phone),
        network: g.network,
        wish: g.wish,
        claimed: g.gift_status === "delivered",
      };
    } catch (e) {
      console.error(e);
    }
  }
  return <ThankYou guest={guest} fallbackName={(sp.to || "").slice(0, 40)} amount={giftAmount()} giftsOn={dbReady()} />;
}
