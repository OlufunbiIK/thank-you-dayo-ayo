"use client";

import { useCallback, useEffect, useState } from "react";
import { COUPLE } from "@/lib/config";
import { NETWORKS, intlPhone } from "@/lib/phone";

type Row = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  network: string | null;
  coming: string | null;
  is_demo: boolean;
  gift_status: "none" | "sending" | "delivered" | "failed";
  gift_mode: string | null;
  gift_error: string | null;
  gift_amount: number | null;
  mode: "live" | "sandbox" | "simulated" | null;
  voice: string | null;
};

const naira = (n: number) => "₦" + n.toLocaleString("en-NG");
const netLabel = (id?: string | null) =>
  NETWORKS.find((n) => n.id === id)?.label || "—";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Host() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState("");

  const call = useCallback(
    async (path: string, body?: unknown, p = pin) => {
      const res = await fetch(path, {
        method: body ? "POST" : "GET",
        headers: { "x-host-pin": p, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      return res.json();
    },
    [pin],
  );

  const load = useCallback(
    async (p = pin) => {
      const data = await call("/api/host/guests", undefined, p);
      if (!data.ok) {
        setMsg(data.error);
        return false;
      }
      setRows(data.guests);
      setAmount(data.amount);
      setMsg("");
      return true;
    },
    [call, pin],
  );

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("host-pin");
      if (saved) {
        setPin(saved);
        load(saved).then((ok) => ok && setAuthed(true));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await load()) {
      setAuthed(true);
      try {
        sessionStorage.setItem("host-pin", pin);
      } catch {}
    }
  };

  const patch = (id: string, p: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const sendOne = async (r: Row) => {
    patch(r.id, { gift_status: "sending", gift_error: null });
    const data = await call("/api/host/send", { id: r.id });
    if (data.guest) patch(r.id, data.guest);
    else patch(r.id, { gift_status: "failed", gift_error: data.error });
  };

  const sendAll = async () => {
    const todo = rows.filter(
      (r) =>
        r.phone &&
        r.network &&
        (r.gift_status === "none" || r.gift_status === "failed"),
    );
    if (!todo.length) return;
    if (
      !confirm(
        `Send ${naira(amount)} airtime to ${todo.length} guest${todo.length > 1 ? "s" : ""}?`,
      )
    )
      return;
    setBusy(true);
    for (const r of todo) {
      await sendOne(r);
      await sleep(350);
    }
    setBusy(false);
  };

  const action = async (a: "demo" | "reset") => {
    if (a === "reset" && !confirm("Start over?")) return;
    setBusy(true);
    const data = await call("/api/host/guests", { action: a });
    if (!data.ok) setMsg(data.error);
    await load();
    setBusy(false);
  };

  const link = (r: Row) => `${location.origin}/?g=${r.code}`;
  const copy = async (r: Row) => {
    try {
      await navigator.clipboard.writeText(link(r));
    } catch {}
    setCopied(r.id);
    setTimeout(() => setCopied(""), 1500);
  };
  const wa = (r: Row) =>
    `https://wa.me/${r.phone ? intlPhone(r.phone) : ""}?text=${encodeURIComponent(`Hi ${r.name.split(" ")[0]}! Thank you for celebrating with us 🤍 We left a little something for you 🎁 ${link(r)}`)}`;

  if (!authed) {
    return (
      <main className="host-login">
        <form onSubmit={login} className="gift-card">
          <p className="kicker">
            {COUPLE.bride} &amp; {COUPLE.groom}
          </p>
          <h1 className="host-h">Thank-you gifts</h1>
          <input
            className="in"
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Host PIN"
            aria-label="Host PIN"
            autoFocus
          />
          {msg && <p className="err">{msg}</p>}
          <button className="btn" type="submit">
            Open dashboard
          </button>
        </form>
      </main>
    );
  }

  const sent = rows.filter((r) => r.gift_status === "delivered").length;
  const ready = rows.filter(
    (r) => r.phone && r.network && r.gift_status !== "delivered",
  ).length;

  return (
    <main className="host">
      <header className="host-top">
        <div>
          <p className="kicker">
            {COUPLE.bride} &amp; {COUPLE.groom}
          </p>
          <h1 className="host-h">Thank-you gifts</h1>
        </div>
        <div className="stats">
          <span>
            <b>{rows.length}</b> guests
          </span>
          <span>
            <b>{sent}</b> sent
          </span>
          <span>
            <b>{naira(amount)}</b> each
          </span>
          <span>
            <b>{naira(sent * amount)}</b> given
          </span>
        </div>
      </header>

      <div className="host-actions">
        <button className="btn" onClick={sendAll} disabled={busy || !ready}>
          {busy ? (
            <>
              <span className="spin" /> Sending…
            </>
          ) : (
            `Send gifts to all (${ready})`
          )}
        </button>
        <button
          className="chip icon-only"
          onClick={() => action("reset")}
          disabled={busy}
          aria-label="Refresh list"
          title=""
        >
          ↺
        </button>
        <button
          className="chip"
          onClick={() => action("reset")}
          disabled={busy}
        >
          Reset for re-filming
        </button>
        <button className="chip" onClick={() => load()} disabled={busy}>
          Refresh
        </button>
      </div>
      {msg && <p className="err">{msg}</p>}

      {!rows.length ? (
        <p className="note empty">
          No guests yet. RSVPs from the IV will appear here, or tap{" "}
          <b>Load demo guests</b>.
        </p>
      ) : (
        <ul className="rows">
          {rows.map((r) => (
            <li key={r.id} className={`row st-${r.gift_status}`}>
              <span className="av">{r.name.slice(0, 1)}</span>
              <div className="who">
                <b>{r.name}</b>
                <small>
                  {r.phone || "No number"} · {netLabel(r.network)}
                  {r.coming === "walk-in" ? " · claimed via link" : ""}
                </small>
              </div>
              {r.mode && (
                <span className={`mode m-${r.mode}`}>
                  {r.mode === "live"
                    ? "LIVE"
                    : r.mode === "sandbox"
                      ? "Test"
                      : "Simulated"}
                </span>
              )}
              <span className="status">
                {r.gift_status === "delivered" ? (
                  "Delivered ✅"
                ) : r.gift_status === "sending" ? (
                  <>
                    <span className="spin dark" /> Sending
                  </>
                ) : r.gift_status === "failed" ? (
                  <button
                    className="linkbtn"
                    title={r.gift_error || ""}
                    onClick={() => sendOne(r)}
                  >
                    Failed · retry
                  </button>
                ) : r.phone ? (
                  <button
                    className="linkbtn"
                    onClick={() => sendOne(r)}
                    disabled={busy}
                  >
                    Send
                  </button>
                ) : (
                  "—"
                )}
              </span>
              <span className="row-links">
                <button className="linkbtn" onClick={() => copy(r)}>
                  {copied === r.id ? "Copied ✓" : "Copy link"}
                </button>
                {r.phone && (
                  <a
                    className="linkbtn"
                    href={wa(r)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                )}
              </span>
              {r.voice && (
                <div className="row-voice">
                  <span>🎙️ Voice gift</span>
                  <audio src={r.voice} controls preload="none" />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="note legend">
        <b>LIVE</b> real airtime · <b>Test</b> VTpass sandbox, no money moves ·{" "}
        <b>Simulated</b> no VTpass keys yet
      </p>
    </main>
  );
}
