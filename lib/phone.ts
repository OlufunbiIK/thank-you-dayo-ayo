export const NETWORKS = [
  { id: "mtn", label: "MTN" },
  { id: "airtel", label: "Airtel" },
  { id: "glo", label: "Glo" },
  { id: "etisalat", label: "9mobile" },
] as const;
export type NetworkId = (typeof NETWORKS)[number]["id"];

/** "+234 805 036 6355", "2348050366355", "0805 036 6355" → "08050366355". Returns "" if invalid. */
export function normalizePhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("234")) d = "0" + d.slice(3);
  if (d.length === 10 && !d.startsWith("0")) d = "0" + d;
  return /^0[789][01]\d{8}$/.test(d) ? d : "";
}

export const isNetwork = (n: unknown): n is NetworkId => NETWORKS.some((x) => x.id === n);

const PREFIX: Record<string, NetworkId> = {};
const add = (net: NetworkId, list: string) => list.split(" ").forEach((p) => (PREFIX[p] = net));
add("mtn", "0803 0806 0703 0706 0813 0816 0810 0814 0903 0906 0913 0916 0704 07025 07026");
add("airtel", "0802 0808 0708 0812 0701 0902 0907 0901 0912 0911");
add("glo", "0805 0807 0705 0815 0811 0905 0915");
add("etisalat", "0809 0818 0817 0909 0908");

/** Best guess from the prefix. People port numbers, so always let them change it. */
export function guessNetwork(phone: string): NetworkId | "" {
  const d = phone.replace(/\D/g, "").replace(/^234/, "0");
  return PREFIX[d.slice(0, 5)] || PREFIX[d.slice(0, 4)] || "";
}

export const maskPhone = (p?: string | null) => (p && p.length >= 8 ? `${p.slice(0, 4)}•••${p.slice(-3)}` : "");
export const intlPhone = (p: string) => "234" + p.replace(/^0/, "");
