# Business Consultant App

A web app where a client signs up, picks what they need help with (start / grow / fix), chooses a
plan, and talks to an AI business consultant through a voice-reactive equalizer. Real accounts and
data live in Supabase; the AI runs on Google's free Gemini API. One account — yours — has an owner
dashboard that can see and edit every client and their conversation.

## What's already done for you

- **Database is live.** Tables `consultant_profiles`, `consultant_sessions`, `consultant_messages`
  exist in your Supabase project, with Row Level Security so each client can only ever see their own
  data — except you.
- **Owner access is locked to your email**, `armin.latif1290@gmail.com`, by a database trigger. No
  one, including a client who edits their own request, can grant themselves owner access — it's
  checked server-side against your login email every time, not something the app trusts the browser to say.
- **Security scan run and fixed**: RLS is on for every table, three previously-public internal
  functions were locked down, and search paths are pinned.

## Deploy it for free

1. **Get a free Gemini API key** at https://aistudio.google.com/apikey.
2. **Get your Supabase keys**: in your Supabase project, go to Settings -> API. You need the
   **Project URL** and the **anon / publishable key** (never the `service_role` key — that one must
   never appear in frontend code).
3. **Put this project on GitHub**: create a free account at https://github.com, make a new repository
   named `business-consultant-app`, and use "uploading an existing file" to drag this whole folder in.
4. **Deploy on Vercel**: sign up at https://vercel.com with "Continue with GitHub," then "Add New...
   -> Project" and pick your repo. Before clicking Deploy, add three Environment Variables:
   - `VITE_GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   Click Deploy. You'll get a live URL in about a minute.
5. **Sign up as yourself first**, using armin.latif1290@gmail.com, so your account gets owner access.
   After that, anyone else who signs up is a normal client and only you can see the "Owner dashboard"
   link in the top bar.

## How the pieces fit together

- **Auth** — Supabase handles email/password accounts. By default Supabase requires clicking a
  confirmation link sent by email before first sign-in; you can turn that off in Supabase ->
  Authentication -> Providers -> Email if you want instant sign-up during testing.
- **The equalizer** — a CSS-animated ring in the middle of the workspace. It idles gently, speeds up
  while Gemini is "thinking," and pulses differently while you're speaking (mic) versus while it's
  replying.
- **Voice input** — uses the browser's built-in speech recognition (no extra service, works in
  Chrome/Edge; Safari/Firefox support varies). If a browser doesn't support it, the mic button just
  doesn't appear — everything else still works by typing.
- **Owner dashboard** — lists every signed-up client, lets you open their full conversation, and has
  a notes box only you can write in, saved straight to their profile row.

## Still worth doing before this handles real customers

- **Hide the Gemini key.** It currently ships inside the browser bundle. Fine for testing; before
  real traffic, move the Gemini call into a small Vercel serverless function (`/api/chat.js`) so the
  key never reaches the browser.
- **Real payments.** The $20/$50/$100 cards are labels only. Add Stripe Checkout
  (https://stripe.com, free test mode) when you're ready to actually charge.
- **Turn on leaked-password protection** in Supabase -> Authentication if you haven't yet — one
  toggle, blocks known-breached passwords at signup.

## Running it locally (optional, needs Node.js)

```
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in your real keys first.
