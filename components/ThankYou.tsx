"use client";

import { useEffect, useMemo, useState } from "react";
import { COUPLE } from "@/lib/config";
import {
  NETWORKS,
  guessNetwork,
  normalizePhone,
  type NetworkId,
} from "@/lib/phone";

export type GuestView = {
  code: string;
  name: string;
  phoneMasked: string;
  network: string | null;
  wish: string | null;
  claimed: boolean;
};

const naira = (n: number) => "₦" + n.toLocaleString("en-NG");
const netLabel = (id?: string | null) =>
  NETWORKS.find((n) => n.id === id)?.label || "";

function Burst({ n = 26 }: { n?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        a: (i / n) * 360 + (i % 3) * 7,
        d: 90 + (i % 4) * 34,
        k: i % 4,
      })),
    [n],
  );
  return (
    <div className="burst" aria-hidden="true">
      {bits.map((b, i) => (
        <i
          key={i}
          className={`k${b.k}`}
          style={
            {
              "--a": `${b.a}deg`,
              "--d": `${b.d}px`,
              animationDelay: `${(i % 5) * 0.03}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default function ThankYou({
  guest,
  fallbackName,
  amount,
  giftsOn,
}: {
  guest: GuestView | null;
  fallbackName: string;
  amount: number;
  giftsOn: boolean;
}) {
  const name = guest?.name || fallbackName;
  const first = name.length <= 16 ? name : name.split(" ")[0] || "";
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0); // 0 wrapped · 1 shaking · 2 lid off · 3 open
  const [claim, setClaim] = useState<"idle" | "sending" | "done" | "error">(
    guest?.claimed ? "done" : "idle",
  );
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState(guest?.claimed ? guest.phoneMasked : "");
  const [useOther, setUseOther] = useState(!guest?.phoneMasked);
  const [form, setForm] = useState({
    name: guest ? "" : fallbackName,
    phone: "",
    network: "" as NetworkId | "",
  });

  useEffect(() => {
    document.body.style.overflow = stage === 3 ? "" : "hidden";
  }, [stage]);
  useEffect(() => {
    if (stage !== 3) return;
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.15 },
    );
    document.querySelectorAll(".rv").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [stage]);

  const unwrap = () => {
    if (stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return setStage(3);
    setStage(1);
    setTimeout(() => setStage(2), 650);
    setTimeout(() => setStage(3), 2300);
  };

  const onPhone = (v: string) => {
    const guess = guessNetwork(v);
    setForm((f) => ({
      ...f,
      phone: v,
      network: f.network && !guess ? f.network : guess || f.network,
    }));
  };

  const send = async () => {
    setError("");
    const payload: Record<string, string> = {};
    if (guest) payload.code = guest.code;
    if (useOther || !guest) {
      const p = normalizePhone(form.phone);
      if (!guest && !form.name.trim()) return setError("Please add your name.");
      if (!p)
        return setError(
          "That number doesn't look right. Use the 11-digit format, e.g. 0805 036 6355.",
        );
      if (!form.network) return setError("Please pick your network.");
      Object.assign(payload, {
        phone: p,
        network: form.network,
        name: form.name.trim(),
      });
    }
    setClaim("sending");
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setClaim("error");
        setError(data.error || "Something went wrong.");
        return;
      }
      setSentTo(data.phone || "");
      setClaim("done");
    } catch {
      setClaim("error");
      setError("No connection. Please try again.");
    }
  };

  return (
    <>
      {/* ═════════ The wrapped gift ═════════ */}
      {stage < 3 && (
        <div
          className={`gate s${stage}`}
          role="dialog"
          aria-label="A thank-you gift"
        >
          <img
            className="bloom tl"
            src="/img/florals.jpg"
            alt=""
            aria-hidden="true"
          />
          <img
            className="bloom br"
            src="/img/florals.jpg"
            alt=""
            aria-hidden="true"
          />
          <div className="gate-copy">
            <p className="kicker">
              From {COUPLE.bride} &amp; {COUPLE.groom}
            </p>
            <h1 className="gate-title">
              Thank you
              {first ? (
                <>
                  ,<br />
                  <span className="foil">{first}</span>
                </>
              ) : null}{" "}
              🤍
            </h1>
          </div>
          <button
            className="giftbox"
            onClick={unwrap}
            aria-label="Unwrap your gift"
          >
            <span className="glow" />
            <img
              className="gift-img closed"
              src="/img/gift-closed.jpg"
              alt=""
            />
            <img className="gift-img open" src="/img/gift-open.jpg" alt="" />
            {stage >= 2 && <Burst />}
            {stage >= 2 && (
              <span className="peek">
                <b>{naira(amount)}</b>
                <small>airtime</small>
              </span>
            )}
          </button>
          <button className="open-btn" onClick={unwrap}>
            {stage ? "Unwrapping…" : "Tap to unwrap"}
          </button>
        </div>
      )}

      <main className={`page ${stage === 3 ? "shown" : ""}`}>
        {/* ═════════ Gift card ═════════ */}
        <section className="gift">
          <div className="gift-card">
            <span className="tagline-k">A little thank-you</span>
            <p className="big-amt foil">{naira(amount)}</p>
            <p className="amt-sub">
              airtime, on {COUPLE.bride} &amp; {COUPLE.groom} 🎁
            </p>

            {!giftsOn ? (
              <p className="note">Gifts are being wrapped. Check back soon!</p>
            ) : claim === "done" ? (
              <div className="done">
                <Burst n={20} />
                <span className="tick">✓</span>
                <p className="done-t">
                  Sent
                  {sentTo ? (
                    <>
                      {" "}
                      to <b>{sentTo}</b>
                    </>
                  ) : null}
                  !
                </p>
                <p className="note">
                  Check your phone 📱 It can take a minute to land.
                </p>
              </div>
            ) : (
              <div className="claim">
                {guest && !useOther ? (
                  <>
                    <p className="note">
                      We&rsquo;ll send it to the number on your RSVP:
                    </p>
                    <p className="num">
                      {guest.phoneMasked}{" "}
                      <span>· {netLabel(guest.network)}</span>
                    </p>
                  </>
                ) : (
                  <>
                    {!guest && (
                      <input
                        className="in"
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        placeholder="Your name"
                        aria-label="Your name"
                      />
                    )}
                    <input
                      className="in"
                      inputMode="tel"
                      value={form.phone}
                      onChange={(e) => onPhone(e.target.value)}
                      placeholder="Phone number, e.g. 0805 036 6355"
                      aria-label="Phone number"
                    />
                    <div
                      className="nets"
                      role="radiogroup"
                      aria-label="Network"
                    >
                      {NETWORKS.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          role="radio"
                          aria-checked={form.network === n.id}
                          className={form.network === n.id ? "on" : ""}
                          onClick={() => setForm({ ...form, network: n.id })}
                        >
                          {n.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {error && <p className="err">{error}</p>}
                <button
                  className="btn"
                  onClick={send}
                  disabled={claim === "sending"}
                >
                  {claim === "sending" ? (
                    <>
                      <span className="spin" /> Sending…
                    </>
                  ) : (
                    "Send it to me 📲"
                  )}
                </button>
                {guest && (
                  <button
                    className="linkbtn"
                    onClick={() => {
                      setUseOther(!useOther);
                      setError("");
                    }}
                  >
                    {useOther
                      ? "← Use my RSVP number"
                      : "Use a different number"}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ═════════ Letter ═════════ */}
        <section className="letter">
          <div className="letter-grid">
            <div className="photo rv">
              <img
                src="/img/couple.jpg"
                alt={`${COUPLE.bride} and ${COUPLE.groom}`}
              />
            </div>
            <div className="words rv">
              <p className="kicker">A note from us</p>
              <p className="msg">
                {first ? `Dear ${first}, ` : ""}
                {COUPLE.message}
              </p>
              <p className="sign">
                With love,{" "}
                <span className="foil">
                  {COUPLE.bride} &amp; {COUPLE.groom}
                </span>
              </p>
            </div>
          </div>
        </section>

        {guest?.wish && (
          <section className="wish rv">
            <p className="kicker">You wrote to us</p>
            <blockquote>&ldquo;{guest.wish}&rdquo;</blockquote>
            <p className="note">We read every single one. Thank you 🤍</p>
          </section>
        )}

        <section className="moments">
          <div className="head rv">
            <p className="kicker">The weekend</p>
            <h2>Some moments we&rsquo;ll never forget</h2>
          </div>
          <div className="strip rv">
            <img src="/img/details.jpg" alt="" loading="lazy" />
            <img src="/img/hero-wide.jpg" alt="" loading="lazy" />
            <img src="/img/venue.jpg" alt="" loading="lazy" />
          </div>
          <p className="note rv">
            The full gallery is coming soon. Keep this link! 📸
          </p>
        </section>

        <footer>
          <p className="names-sm">
            {COUPLE.bride} <i>&amp;</i> {COUPLE.groom}
          </p>
          <p className="tag">
            {COUPLE.dateShort} · {COUPLE.hashtag}
          </p>
          <a
            className="made"
            href={COUPLE.madeBy}
            target="_blank"
            rel="noreferrer"
          >
            Made with love by Eventlybuilt
          </a>
        </footer>
      </main>
    </>
  );
}
