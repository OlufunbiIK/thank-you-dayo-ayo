import "server-only";
import { NextResponse } from "next/server";

/** Very small gate for the host screen: the couple types the HOST_PIN you set on Vercel. */
export function checkPin(req: Request) {
  const pin = process.env.HOST_PIN;
  if (!pin) return NextResponse.json({ ok: false, error: "Set HOST_PIN in your environment variables first." }, { status: 503 });
  if (req.headers.get("x-host-pin") !== pin) return NextResponse.json({ ok: false, error: "Wrong PIN." }, { status: 401 });
  return null;
}
