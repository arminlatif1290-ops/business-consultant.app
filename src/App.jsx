import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";
import Equalizer, { equalizerCss } from "./Equalizer";
import Magazine from "./Magazine";

const GEMINI_MODEL = "gemini-flash-latest"; // Google keeps this alias pointed at their current flash model
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const TIERS = [
  {
    id: "quick",
    price: "$20",
    label: "Quick Read",
    desc: "A fast, focused answer to one clear question — what's working, what isn't, and the next move.",
    depth: "Keep answers short and direct: 3-5 sentences plus a single concrete next step. No long frameworks unless asked.",
  },
  {
    id: "growth",
    price: "$50",
    label: "Growth Plan",
    desc: "A structured plan: where the business stands, the top 3 opportunities, and a 30-day action sequence.",
    depth: "Give structured, moderately detailed answers with a short list of prioritized actions and reasoning. Ask 1-2 clarifying questions if key facts are missing before recommending.",
  },
  {
    id: "deep",
    price: "$100",
    label: "Deep Consulting",
    desc: "Full diagnostic work — root-cause analysis, research-backed reasoning, and a build-out plan you can hand to a team.",
    depth: "Go deep: ask clarifying questions, reason through root causes, weigh trade-offs explicitly, and produce thorough, well-organized recommendations with rationale.",
  },
];

const INTENTS = [
  { id: "start", title: "Start a business", copy: "I have an idea and need to shape it into something real." },
  { id: "grow", title: "Grow what I have", copy: "The business exists — I want more revenue, reach, or margin." },
  { id: "fix", title: "Solve a problem", copy: "Something specific is broken and I need to fix it." },
];

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [intent, setIntent] = useState(null);
  const [tier, setTier] = useState(null);
  const [step, setStep] = useState("intent");
  const [panel, setPanel] = useState("main"); // main | owner | magazine

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    (async () => {
      setDataLoading(true);
      const { data: prof } = await supabase
        .from("consultant_profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();
      setProfile(prof || null);

      if (prof) {
        const { data: sess } = await supabase
          .from("consultant_sessions")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (sess) {
          setIntent(sess.intent);
          setTier(sess.tier);
          setStep(sess.intent && sess.tier ? "workspace" : sess.intent ? "plan" : "intent");
        }
      }
      setDataLoading(false);
    })();
  }, [session]);

  if (authLoading) {
    return (
      <div className="wrap">
        <style>{baseCss + equalizerCss}</style>
        <div className="centerScreen">Loading…</div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <style>{baseCss + equalizerCss}</style>
      {!session ? (
        <AuthGate />
      ) : dataLoading ? (
        <div className="centerScreen">Loading your workspace…</div>
      ) : !profile ? (
        <ProfileSetup userId={session.user.id} onDone={setProfile} />
      ) : panel === "owner" && profile.is_owner ? (
        <>
          <TopBar profile={profile} onOpenOwner={() => setPanel("owner")} onOpenMagazine={() => setPanel("magazine")} onBack={() => setPanel("main")} />
          <OwnerDashboard />
        </>
      ) : panel === "magazine" ? (
        <>
          <TopBar profile={profile} onOpenOwner={() => setPanel("owner")} onOpenMagazine={() => setPanel("magazine")} onBack={() => setPanel("main")} />
          <div style={{ padding: 24 }}>
            <Magazine isOwner={profile.is_owner} />
          </div>
        </>
      ) : (
        <ClientArea
          profile={profile}
          intent={intent}
          setIntent={setIntent}
          tier={tier}
          setTier={setTier}
          step={step}
          setStep={setStep}
          onOpenOwner={() => setPanel("owner")}
          onOpenMagazine={() => setPanel("magazine")}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Auth ----

function AuthGate() {
  const [mode, setMode] = useState("signup"); // signup | signin
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Check your email to confirm your account, then sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
    }
    setBusy(false);
  }

  return (
    <div className="stage">
      <div className="heroCol">
        <div className="mark">◆</div>
        <h1>Two of us, running the business.</h1>
        <p className="lede">
          You handle the world — people, decisions, execution. I handle the analysis — patterns, research,
          plans. Create an account to get started.
        </p>
      </div>
      <form className="panel" onSubmit={submit}>
        <div className="panelTitle">{mode === "signup" ? "Create your account" : "Sign in"}</div>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>
        {msg && <div className="msgLine">{msg}</div>}
        <button type="submit" className="cta" disabled={busy}>
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
        <button
          type="button"
          className="linklikeCenter"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setMsg("");
          }}
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </form>
    </div>
  );
}

// -------------------------------------------------------- Profile setup --

function ProfileSetup({ userId, onDone }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [business, setBusiness] = useState("");
  const [industry, setIndustry] = useState("");
  const [contact, setContact] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || !business.trim()) return;
    setBusy(true);
    setErr("");
    const { data, error } = await supabase
      .from("consultant_profiles")
      .insert({
        id: userId,
        name: name.trim(),
        role: role.trim() || "Owner",
        business: business.trim(),
        industry: industry.trim() || "General",
        contact: contact.trim(),
      })
      .select()
      .single();
    setBusy(false);
    if (error) setErr(error.message);
    else onDone(data);
  }

  return (
    <div className="stage">
      <div className="heroCol">
        <div className="mark">◆</div>
        <h1>One more step.</h1>
        <p className="lede">Tell me about the business so the advice actually fits.</p>
      </div>
      <form className="panel" onSubmit={submit}>
        <div className="panelTitle">Your profile</div>
        <label>
          Your name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" required />
        </label>
        <label>
          Your role
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Founder, Manager, Freelancer…" />
        </label>
        <label>
          Business name
          <input value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Rivera Coffee Roasters" required />
        </label>
        <label>
          Industry
          <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Food & beverage, SaaS, retail…" />
        </label>
        <label>
          Contact (for your QR business card)
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="email or phone" />
        </label>
        {err && <div className="msgLine">{err}</div>}
        <button type="submit" className="cta" disabled={busy}>Continue</button>
      </form>
    </div>
  );
}

// ------------------------------------------------------------ Client area

function ClientArea({ profile, intent, setIntent, tier, setTier, step, setStep, onOpenOwner, onOpenMagazine }) {
  async function chooseIntent(id) {
    setIntent(id);
    await supabase
      .from("consultant_sessions")
      .upsert({ user_id: profile.id, intent: id, tier: null, updated_at: new Date().toISOString() });
    setStep("plan");
  }

  async function choosePlan(id) {
    setTier(id);
    await supabase
      .from("consultant_sessions")
      .upsert({ user_id: profile.id, intent, tier: id, updated_at: new Date().toISOString() });
    setStep("workspace");
  }

  async function resetSession() {
    await supabase
      .from("consultant_sessions")
      .upsert({ user_id: profile.id, intent: null, tier: null, updated_at: new Date().toISOString() });
    setIntent(null);
    setTier(null);
    setStep("intent");
  }

  return (
    <>
      <TopBar profile={profile} onOpenOwner={onOpenOwner} onOpenMagazine={onOpenMagazine} />
      {step === "intent" ? (
        <IntentPicker profile={profile} onPick={chooseIntent} />
      ) : step === "plan" ? (
        <PlanPicker intent={intent} onPick={choosePlan} onBack={() => setStep("intent")} />
      ) : (
        <Workspace profile={profile} intent={intent} tier={tier} onReset={resetSession} />
      )}
    </>
  );
}

function TopBar({ profile, onOpenOwner, onOpenMagazine, onBack }) {
  return (
    <div className="topBar">
      <div className="topBarMark">◆ {profile.business}</div>
      <div className="topBarRight">
        {onBack && <button className="linklike" onClick={onBack}>← my workspace</button>}
        <button className="linklike" onClick={onOpenMagazine}>Magazine</button>
        {profile.is_owner && (
          <button className="linklike" onClick={onOpenOwner}>Owner dashboard</button>
        )}
        <button className="linklike" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    </div>
  );
}

function IntentPicker({ profile, onPick }) {
  return (
    <div className="stage narrow">
      <div className="heroCol">
        <div className="eyebrowless">Welcome, {profile.name.split(" ")[0]}</div>
        <h1>What are we working on?</h1>
        <p className="lede">Pick the situation that fits right now — you can change this later.</p>
      </div>
      <div className="intentGrid">
        {INTENTS.map((it) => (
          <button key={it.id} className="intentCard" onClick={() => onPick(it.id)}>
            <div className="intentTitle">{it.title}</div>
            <div className="intentCopy">{it.copy}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlanPicker({ intent, onPick, onBack }) {
  const intentObj = INTENTS.find((i) => i.id === intent);
  return (
    <div className="stage narrow">
      <div className="heroCol">
        <div className="eyebrowless" onClick={onBack} role="button">← change focus</div>
        <h1>Choose how deep to go</h1>
        <p className="lede">
          Working on: <strong>{intentObj.title}</strong>. Every tier gets you the same consultant — the difference
          is depth and how much back-and-forth you want.
        </p>
      </div>
      <div className="planGrid">
        {TIERS.map((t, i) => (
          <button key={t.id} className="planCard" onClick={() => onPick(t.id)}>
            <div className="planNum">{i + 1}</div>
            <div className="planPrice">{t.price}</div>
            <div className="planLabel">{t.label}</div>
            <div className="planDesc">{t.desc}</div>
          </button>
        ))}
      </div>
      <p className="fineprint">Demo pricing — no payment is processed here yet.</p>
    </div>
  );
}

// --------------------------------------------------------------- Workspace

function Workspace({ profile, intent, tier, onReset }) {
  const tierObj = TIERS.find((t) => t.id === tier);
  const intentObj = INTENTS.find((i) => i.id === intent);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [eqState, setEqState] = useState("idle");
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("consultant_messages")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: true });
      if (data && data.length) {
        setMessages(data);
      } else {
        const opener = {
          role: "assistant",
          content: `You're set up on the ${tierObj.label} tier. I have your profile — ${profile.business} in ${profile.industry}, focused on "${intentObj.title.toLowerCase()}." Tell me what's on your mind, and I'll work it with you.`,
        };
        await supabase.from("consultant_messages").insert({ user_id: profile.id, ...opener });
        setMessages([opener]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + text : text));
    };
    rec.onend = () => {
      setListening(false);
      setEqState("idle");
    };
    recognitionRef.current = rec;
    setVoiceSupported(true);
  }, []);

  function startListening() {
    if (!recognitionRef.current) return;
    setListening(true);
    setEqState("listening");
    recognitionRef.current.start();
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    if (!GEMINI_API_KEY) {
      setErr("No Gemini API key found. Add VITE_GEMINI_API_KEY in your Vercel project settings, then redeploy.");
      return;
    }
    const userMsg = { role: "user", content: input.trim() };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput("");
    setSending(true);
    setEqState("thinking");
    setErr("");
    await supabase.from("consultant_messages").insert({ user_id: profile.id, ...userMsg });

    try {
      const system = `You are an expert business consultant working alongside a human partner (the user, who is a real person handling outreach, contracts, and execution in the real world). You are the analytical brain of the partnership.

Client profile:
- Name: ${profile.name}
- Role: ${profile.role}
- Business: ${profile.business}
- Industry: ${profile.industry}

Client's goal right now: ${intentObj.title} — "${intentObj.copy}"
Service tier: ${tierObj.label} (${tierObj.price}). ${tierObj.depth}

Be direct, practical, and specific to this business — avoid generic platitudes. When you don't have enough information to give a real answer, ask for it rather than guessing.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: nextMsgs.map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
          }),
        }
      );
      const data = await res.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n").trim() ||
        data?.error?.message ||
        "I didn't get a usable response — try asking again.";
      const assistantMsg = { role: "assistant", content: reply };
      setEqState("speaking");
      await supabase.from("consultant_messages").insert({ user_id: profile.id, ...assistantMsg });
      setMessages((prev) => [...prev, assistantMsg]);
      setTimeout(() => setEqState("idle"), 1400);
    } catch (e) {
      setErr("Something went wrong reaching the consultant. Check your connection and try again.");
      setEqState("idle");
    }
    setSending(false);
  }, [input, sending, messages, profile, intentObj, tierObj]);

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const qrData = `BUSINESS CARD\n${profile.name}\n${profile.role}\n${profile.business}\n${profile.industry}${
    profile.contact ? "\n" + profile.contact : ""
  }`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(qrData)}`;

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="sideBlock">
          <div className="sideLabel">Client</div>
          <div className="sideValue">{profile.name}</div>
          <div className="sideSub">{profile.role} · {profile.business}</div>
        </div>
        <div className="sideBlock">
          <div className="sideLabel">Focus</div>
          <div className="sideValue">{intentObj.title}</div>
        </div>
        <div className="sideBlock">
          <div className="sideLabel">Plan</div>
          <div className="sideValue">{tierObj.price} · {tierObj.label}</div>
        </div>
        <div className="sideBlock qrBlock">
          <div className="sideLabel">Your business card</div>
          <img src={qrUrl} alt="QR code linking to business card details" className="qrImg" />
          <div className="sideSub">Scan to share {profile.business}'s contact</div>
        </div>
        <button className="linklike" onClick={onReset}>Start a new focus</button>
      </aside>

      <main className="chatCol">
        <Equalizer state={eqState} />
        <div className="chatHeader">
          <div className="chatHeaderTitle">Consultant</div>
          <div className="chatHeaderSub">Powered by Gemini · working the {intentObj.title.toLowerCase()} problem</div>
        </div>
        <div className="chatScroll" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={m.id || i} className={m.role === "user" ? "bubble user" : "bubble assistant"}>
              {m.content}
            </div>
          ))}
          {sending && <div className="bubble assistant thinking">thinking…</div>}
          {err && <div className="errLine">{err}</div>}
        </div>
        <div className="composer">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about pricing, a launch plan, why sales dropped, anything…"
            rows={2}
          />
          {voiceSupported && (
            <button
              type="button"
              className={listening ? "micBtn micOn" : "micBtn"}
              onClick={startListening}
              title="Speak your question"
            >
              🎙
            </button>
          )}
          <button className="cta" onClick={sendMessage} disabled={sending || !input.trim()}>
            Send
          </button>
        </div>
      </main>
    </div>
  );
}

// ------------------------------------------------------------ Owner view

function OwnerDashboard() {
  const [clients, setClients] = useState(null);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState([]);
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("consultant_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      setClients(data || []);
    })();
  }, []);

  async function openClient(c) {
    setSelected(c);
    setNotesDraft(c.owner_notes || "");
    const { data } = await supabase
      .from("consultant_messages")
      .select("*")
      .eq("user_id", c.id)
      .order("created_at", { ascending: true });
    setThread(data || []);
  }

  async function saveNotes() {
    setSaving(true);
    const { data, error } = await supabase
      .from("consultant_profiles")
      .update({ owner_notes: notesDraft })
      .eq("id", selected.id)
      .select()
      .single();
    setSaving(false);
    if (!error) {
      setSelected(data);
      setClients((prev) => prev.map((c) => (c.id === data.id ? data : c)));
    }
  }

  return (
    <div className="ownerWrap">
      {!clients ? (
        <div className="centerScreen">Loading clients…</div>
      ) : selected ? (
        <div className="ownerDetail">
          <button className="linklike" onClick={() => setSelected(null)}>← all clients</button>
          <h2 className="ownerName">{selected.name} · {selected.business}</h2>
          <div className="ownerMeta">{selected.role} · {selected.industry} · {selected.contact || "no contact given"}</div>

          <div className="ownerNotes">
            <div className="sideLabel">Your notes on this client</div>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={4}
              placeholder="Findings, results, next steps…"
            />
            <button className="cta small" onClick={saveNotes} disabled={saving}>
              {saving ? "Saving…" : "Save notes"}
            </button>
          </div>

          <div className="sideLabel" style={{ marginTop: 20 }}>Conversation</div>
          <div className="ownerThread">
            {thread.map((m) => (
              <div key={m.id} className={m.role === "user" ? "bubble user" : "bubble assistant"}>
                {m.content}
              </div>
            ))}
            {thread.length === 0 && <div className="lede">No messages yet.</div>}
          </div>
        </div>
      ) : (
        <div className="ownerList">
          {clients.length === 0 && <p className="lede">No clients yet.</p>}
          {clients.map((c) => (
            <button key={c.id} className="ownerRow" onClick={() => openClient(c)}>
              <div>
                <div className="ownerRowName">{c.name} · {c.business}</div>
                <div className="ownerRowSub">{c.industry} — joined {new Date(c.created_at).toLocaleDateString()}</div>
              </div>
              {c.owner_notes && <span className="ownerHasNotes">has notes</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const baseCss = `
.wrap {
  --ink: #EDE9F5;
  --ink-soft: #A79BC2;
  --paper: #0A0A0F;
  --paper-raised: #17121F;
  --surface2: #120E1C;
  --teal: #7C3AED;
  --teal-deep: #5B21B6;
  --brass: #E879F9;
  --line: #2E2740;
  --danger: #FB7185;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  color: var(--ink);
  background: var(--paper);
  min-height: 100vh;
  width: 100%;
}
.wrap * { box-sizing: border-box; }
.centerScreen { min-height: 100vh; display: flex; align-items: center; justify-content: center; color: var(--ink-soft); }

.stage {
  min-height: 100vh;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 48px;
  padding: 64px 8vw;
}
.stage.narrow { max-width: 960px; margin: 0 auto; flex-direction: column; align-items: stretch; padding: 64px 24px; }

.mark { font-size: 22px; color: var(--teal); }
.heroCol { flex: 1 1 360px; min-width: 280px; }
.heroCol h1 {
  font-family: Georgia, "Iowan Old Style", "Times New Roman", serif;
  font-size: clamp(32px, 4vw, 46px);
  line-height: 1.12;
  margin: 18px 0 16px;
  font-weight: 500;
  color: var(--ink);
}
.lede { font-size: 16px; line-height: 1.6; color: var(--ink-soft); max-width: 46ch; }
.eyebrowless { font-size: 13px; color: var(--teal); cursor: default; letter-spacing: 0.02em; }
[role="button"].eyebrowless { cursor: pointer; }

.panel {
  flex: 1 1 380px;
  max-width: 420px;
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-top: 3px solid var(--teal);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.panelTitle { font-size: 13px; color: var(--ink-soft); font-weight: 600; margin-bottom: 4px; }
.panel label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--ink-soft); }
.panel input, .panel textarea, .ownerNotes textarea {
  font-size: 15px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--ink);
  font-family: inherit;
}
.panel input:focus, .panel textarea:focus { outline: 2px solid var(--teal); outline-offset: 1px; }
.msgLine { color: var(--danger); font-size: 13px; }

.cta {
  margin-top: 8px;
  background: var(--teal);
  color: #fff;
  border: none;
  padding: 13px 20px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.cta.small { padding: 8px 14px; font-size: 13px; margin-top: 10px; }
.cta:hover { background: var(--teal-deep); }
.cta:disabled { opacity: 0.5; cursor: default; }
.linklikeCenter {
  background: none; border: none; color: var(--ink-soft); text-decoration: underline;
  font-size: 13px; cursor: pointer; font-family: inherit; text-align: center;
}

.intentGrid { display: flex; flex-direction: column; gap: 14px; margin-top: 8px; }
.intentCard {
  text-align: left;
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-left: 3px solid var(--brass);
  padding: 20px 22px;
  cursor: pointer;
  font-family: inherit;
  color: var(--ink);
}
.intentCard:hover { border-left-color: var(--teal); }
.intentTitle { font-size: 18px; font-weight: 600; margin-bottom: 6px; }
.intentCopy { font-size: 14px; color: var(--ink-soft); }

.planGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 12px; }
.planCard {
  text-align: left;
  background: var(--paper-raised);
  border: 1px solid var(--line);
  padding: 24px 20px;
  cursor: pointer;
  font-family: inherit;
  color: var(--ink);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.planCard:hover { border-color: var(--teal); }
.planNum { font-size: 12px; color: var(--ink-soft); }
.planPrice { font-family: Georgia, serif; font-size: 30px; color: var(--brass); }
.planLabel { font-size: 15px; font-weight: 600; }
.planDesc { font-size: 13px; color: var(--ink-soft); line-height: 1.5; margin-top: 4px; }
.fineprint { font-size: 12px; color: var(--ink-soft); margin-top: 18px; }

.topBar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 28px; border-bottom: 1px solid var(--line); background: var(--paper-raised);
}
.topBarMark { font-family: Georgia, serif; font-size: 16px; color: var(--ink); }
.topBarRight { display: flex; gap: 18px; }

.workspace { display: flex; min-height: calc(100vh - 57px); }
.sidebar {
  width: 260px;
  flex-shrink: 0;
  background: var(--surface2);
  color: var(--ink);
  padding: 28px 22px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.sideLabel { font-size: 11px; color: #8A7FA6; margin-bottom: 4px; }
.sideValue { font-size: 15px; font-weight: 600; }
.sideSub { font-size: 12px; color: #8A7FA6; margin-top: 2px; }
.qrBlock { background: #1F1730; padding: 14px; }
.qrImg { width: 100%; max-width: 160px; display: block; margin: 6px 0; background: #fff; padding: 6px; }
.linklike {
  background: none; border: none; color: var(--ink-soft); text-align: left; font-size: 13px;
  cursor: pointer; text-decoration: underline; padding: 0; font-family: inherit;
}
.sidebar .linklike { margin-top: auto; color: #C7B8E8; }

.chatCol { flex: 1; display: flex; flex-direction: column; min-width: 0; padding-top: 20px; }
.chatHeader { padding: 0 32px 16px; text-align: center; }
.chatHeaderTitle { font-family: Georgia, serif; font-size: 22px; }
.chatHeaderSub { font-size: 12px; color: var(--ink-soft); margin-top: 2px; }
.chatScroll { flex: 1; overflow-y: auto; padding: 10px 32px; display: flex; flex-direction: column; gap: 14px; }
.bubble { max-width: 68ch; padding: 14px 16px; font-size: 14.5px; line-height: 1.6; white-space: pre-wrap; }
.bubble.assistant { background: var(--paper-raised); border: 1px solid var(--line); border-left: 3px solid var(--teal); align-self: flex-start; }
.bubble.user { background: var(--teal); color: #fff; align-self: flex-end; }
.bubble.thinking { color: var(--ink-soft); font-style: italic; }
.errLine { color: var(--danger); font-size: 13px; }
.composer { display: flex; gap: 10px; padding: 18px 32px 28px; border-top: 1px solid var(--line); }
.composer textarea {
  flex: 1; resize: none; font-family: inherit; font-size: 14.5px; padding: 12px 14px;
  border: 1px solid var(--line); background: var(--paper-raised); color: var(--ink);
}
.composer textarea:focus { outline: 2px solid var(--teal); outline-offset: 1px; }
.composer .cta { align-self: flex-end; }
.micBtn {
  align-self: flex-end; border: 1px solid var(--line); background: var(--paper-raised);
  font-size: 18px; padding: 10px 14px; cursor: pointer;
}
.micBtn.micOn { background: var(--teal); border-color: var(--teal); }

.ownerWrap { min-height: 100vh; }
.ownerList { display: flex; flex-direction: column; max-width: 760px; margin: 0 auto; padding: 24px; }
.ownerRow {
  display: flex; justify-content: space-between; align-items: center;
  background: var(--paper-raised); border: 1px solid var(--line); border-left: 3px solid var(--brass);
  padding: 16px 18px; margin-bottom: 10px; cursor: pointer; font-family: inherit; text-align: left;
}
.ownerRowName { font-weight: 600; font-size: 15px; }
.ownerRowSub { font-size: 12px; color: var(--ink-soft); margin-top: 2px; }
.ownerHasNotes { font-size: 11px; color: var(--teal); border: 1px solid var(--teal); padding: 3px 8px; }
.ownerDetail { max-width: 760px; margin: 0 auto; padding: 24px; }
.ownerName { font-family: Georgia, serif; margin: 14px 0 4px; }
.ownerMeta { font-size: 13px; color: var(--ink-soft); margin-bottom: 18px; }
.ownerNotes textarea { width: 100%; }
.ownerThread { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
.articleBody { white-space: pre-wrap; line-height: 1.7; font-size: 15px; margin-top: 18px; color: var(--ink); }

@media (max-width: 720px) {
  .workspace { flex-direction: column; }
  .sidebar { width: 100%; flex-direction: row; flex-wrap: wrap; gap: 16px; }
  .sidebar .linklike { margin-top: 0; }
  .chatHeader, .chatScroll, .composer { padding-left: 18px; padding-right: 18px; }
}
`;
