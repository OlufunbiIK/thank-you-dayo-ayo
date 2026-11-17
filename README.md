# Thank-you gifts — Morayo & Dayo (Eventlybuilt)

Guests open a gift the day after the wedding and claim airtime. The couple sends gifts to everyone from /host.

    npm install
    npm run dev        # http://localhost:3000  ·  host screen: /host

## Setup
1. Supabase → SQL Editor → run `supabase/guests.sql` (once).
2. Vercel → new project from this folder → add the variables in `.env.example` → Deploy.
3. In the IV project, add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and EVENT_SLUG so RSVPs land in the same guest list.

## Gift modes (shown as a badge on each guest in /host)
- Simulated: no VTpass keys yet. Nothing is sent; good for designing and filming.
- Test: VTpass sandbox keys set. Real API calls, no money moves.
- LIVE: real airtime. Only for numbers in VTPASS_LIVE_NUMBERS, so you can't send real money to demo guests by mistake.

## Links
- Personal: https://your-site.vercel.app/?g=<code>  (copy from /host, or tap WhatsApp next to a guest)
- General (walk-ins, no RSVP): https://your-site.vercel.app/  (one gift per phone number)

Edit the couple's names and message in lib/config.ts. Photos are in public/img.
# thank-you-dayo-ayo
