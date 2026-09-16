import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function Magazine({ isOwner }) {
  const [articles, setArticles] = useState(null);
  const [selected, setSelected] = useState(null);
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState("");

  async function loadArticles() {
    const { data } = await supabase
      .from("consultant_articles")
      .select("*")
      .order("created_at", { ascending: false });
    setArticles(data || []);
  }

  useEffect(() => {
    loadArticles();
  }, []);

  async function generateArticle(e) {
    e.preventDefault();
    if (!GEMINI_API_KEY) {
      setErr("No Gemini API key found. Add VITE_GEMINI_API_KEY in Vercel and redeploy.");
      return;
    }
    setGenerating(true);
    setErr("");
    const subject = topic.trim() || "a practical tip for small business owners";
    try {
      const prompt = `Write a short, practical business-tips article about: ${subject}.
Respond in exactly this format, nothing else:
TITLE: <a punchy 5-10 word title>
SUMMARY: <one sentence, under 25 words>
BODY:
<the article, 3-5 short paragraphs, practical and specific, no fluff>`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          }),
        }
      );
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n") || "";
      if (!raw) {
        setErr(data?.error?.message || "Didn't get a usable response — try again.");
        setGenerating(false);
        return;
      }
      const titleMatch = raw.match(/TITLE:\s*(.+)/);
      const summaryMatch = raw.match(/SUMMARY:\s*(.+)/);
      const bodyMatch = raw.match(/BODY:\s*([\s\S]+)/);
      const title = titleMatch ? titleMatch[1].trim() : subject;
      const summary = summaryMatch ? summaryMatch[1].trim() : "";
      const content = bodyMatch ? bodyMatch[1].trim() : raw.trim();

      const { error } = await supabase.from("consultant_articles").insert({ title, summary, content });
      if (error) setErr(error.message);
      else {
        setTopic("");
        await loadArticles();
      }
    } catch (e) {
      setErr("Something went wrong generating the article. Try again.");
    }
    setGenerating(false);
  }

  async function deleteArticle(id) {
    await supabase.from("consultant_articles").delete().eq("id", id);
    setSelected(null);
    await loadArticles();
  }

  if (selected) {
    return (
      <div className="ownerDetail">
        <button className="linklike" onClick={() => setSelected(null)}>← all articles</button>
        <h2 className="ownerName">{selected.title}</h2>
        {selected.summary && <div className="ownerMeta">{selected.summary}</div>}
        <div className="articleBody">{selected.content}</div>
        {isOwner && (
          <button className="linklike" style={{ marginTop: 20, color: "var(--danger)" }} onClick={() => deleteArticle(selected.id)}>
            Delete this article
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="ownerList">
      {isOwner && (
        <form className="panel" style={{ maxWidth: "none", marginBottom: 24 }} onSubmit={generateArticle}>
          <div className="panelTitle">Write a new article</div>
          <label>
            Topic (optional — leave blank for a general tip)
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. pricing a new service" />
          </label>
          {err && <div className="msgLine">{err}</div>}
          <button type="submit" className="cta small" disabled={generating}>
            {generating ? "Writing…" : "Generate article"}
          </button>
        </form>
      )}
      {!articles ? (
        <div className="lede">Loading articles…</div>
      ) : articles.length === 0 ? (
        <p className="lede">No articles yet.{isOwner ? " Generate the first one above." : ""}</p>
      ) : (
        articles.map((a) => (
          <button key={a.id} className="ownerRow" onClick={() => setSelected(a)}>
            <div>
              <div className="ownerRowName">{a.title}</div>
              <div className="ownerRowSub">{a.summary || new Date(a.created_at).toLocaleDateString()}</div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
