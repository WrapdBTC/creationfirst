/**
 * CreationFirst chat relay — Cloudflare Worker + KV + Workers AI (interim)
 * Later: set GROK_WEBHOOK_URL + GROK_WEBHOOK_KEY to wake KI Beratung instead.
 */

const ALLOWED_ORIGINS = [
  "https://wrapdbtc.github.io",
  "http://localhost",
  "http://localhost:5500",
  "http://localhost:8080",
  "http://127.0.0.1",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:8080",
];

const SYSTEM_PROMPT = `Du bist der Live-Chat von CreationFirst (KI-Umsetzung für deutschsprachige KMUs).

ANREDE (hart): immer du/dein/dir/dich — niemals Sie/Ihnen/Ihr als Höflichkeitsform. Auch nicht gemischt.

TON: ruhig, hilfreich, knapp (meist 2–4 Sätze). Kein Hype, kein Crypto, keine erfundenen Cases.

SCOPE: nur CreationFirst, KI/Automatisierung, Produkte/Preise, Fit, Kontakt. Off-Topic höflich ablehnen.

PRODUKTE:
- 0€ Erstgespräch (30 Min, kein PDF)
- 199€ Kurzanalyse (PDF 4–8 Seiten, anrechenbar)
- KI-Audit 1.500–3.000€ (7–14 Tage): Interviews, Ist-Prozesse, 3–5 Quick Wins+Skizze, 90-Tage-Roadmap, Build-vs-Buy, Sprint-Angebot, Readout
- Sprint 4–12k € / 2–4 Wo: Lieferinkrement, Integration, Doku/Handoff, Review-Call
- Retainer 1.5–4k €/Monat: Priority-Queue, monatliches Review, laufende Verbesserungen, Response-Zeit

TERMINE / LEADS:
- Keinen konkreten Wochentag oder Uhrzeit vorschlagen oder bestätigen. Kein Kalender.
- Call-Wunsch: kurz erklären, dass es ein unverbindliches 0€-Erstgespräch gibt, und EINMAL nach Name, E-Mail und Telefon fragen — oder auf kontakt.html / info@creationfirst.io verweisen.
- Wenn Kontaktdaten da: danken, „wir melden uns zur Terminfindung“ — fertig. Nicht nachhaken, nicht Montag/Freitag anbieten.
- Keine Fragebögen (keine Bullet-Listen zu Branche/MA-Zahl).

Sprache: Deutsch mit Du, außer der Besucher schreibt EN/HR (dann passend, weiterhin locker: you / ti).`;


function looksOffTopic(text) {
  const s = String(text || "").toLowerCase();
  // Off-topic keywords always win (even if "ki" appears as substring elsewhere).
  const off = /\b(curry|rezept|kochen|backen|pizza|nudeln|suppe|kuchen|sport|fu[sß]ball|liebe|beziehung|wetter|witz|meme|hausaufgaben|minecraft|fortnite|hobby)\b/i;
  if (off.test(s)) return true;
  // Too-short / clearly non-business without any company signal
  const business = /\b(ki|künstliche intellig[eä]nz|automatis|audit|sprint|retainer|kurzanalyse|erstgespr[aä]ch|creation\s*first|unternehmen|firma|prozess|workflow|crm|leads?|website|angebot|preis|kosten|termin|kontakt|kmu|beratung)\b/i;
  if (s.length > 12 && !business.test(s) && /\b(wie|was|mach|hilfe|erkl[aä]r)\b/i.test(s)) {
    // Heuristic: question without business terms → refuse
    return true;
  }
  return false;
}

const OFFTOPIC_REPLY =
  "Dazu kann ich hier leider nicht helfen — dieser Chat ist nur für CreationFirst und KI in deinem Unternehmen. Wenn du magst, klären wir gern, wo Automatisierung bei dir Zeit oder Umsatz bringt. Passend wäre ein kurzes unverbindliches Erstgespräch.";


function sanitizeReply(text) {
  let s = String(text || "");
  const pairs = [
    [/\bteilen Sie uns\b/gi, "teil uns"],
    [/\bgeben Sie uns\b/gi, "gib uns"],
    [/\bsagen Sie uns\b/gi, "sag uns"],
    [/\bschreiben Sie uns\b/gi, "schreib uns"],
    [/\bBitte geben Sie\b/gi, "Bitte gib"],
    [/\bBitte teilen Sie\b/gi, "Bitte teil"],
    [/\bIhre(m|n|r|s)?\b/g, (m) => {
      const x = m.toLowerCase();
      if (x === "ihre") return "deine";
      if (x === "ihrem") return "deinem";
      if (x === "ihren") return "deinen";
      if (x === "ihrer") return "deiner";
      if (x === "ihres") return "deines";
      return "deine";
    }],
    [/\bIhr\b/g, "dein"],
    [/\bIhnen\b/g, "dir"],
    [/\bSie\b/g, "du"],
  ];
  for (const [re, rep] of pairs) s = s.replace(re, rep);
  s = s.replace(/damit ich den Termin\s*planen kann/gi, "damit wir uns zur Terminfindung melden können");
  s = s.replace(/wir werden dir einen Termin anbieten/gi, "wir melden uns zur Terminfindung");
  s = s.replace(/wir werden Ihnen einen Termin anbieten/gi, "wir melden uns zur Terminfindung");
  s = s.replace(/einen Termin anbieten/gi, "uns zur Terminfindung melden");
  s = s.replace(/\b(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/gi, "zeitnah");
  return s;
}

const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allow =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1") ||
    origin === "https://wrapdbtc.github.io"
      ? origin || "*"
      : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request),
    },
  });
}

function uuid() {
  return crypto.randomUUID();
}

function chatKey(id) {
  return `chat:${id}`;
}

async function loadChat(env, id) {
  const raw = await env.CHATS.get(chatKey(id));
  if (!raw) return { messages: [] };
  try {
    const parsed = JSON.parse(raw);
    return { messages: Array.isArray(parsed.messages) ? parsed.messages : [] };
  } catch {
    return { messages: [] };
  }
}

async function saveChat(env, id, data) {
  await env.CHATS.put(chatKey(id), JSON.stringify(data), {
    expirationTtl: 60 * 60 * 24 * 7,
  });
}

function bearerOk(request, secret) {
  if (!secret) return false;
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m && m[1] === secret;
}

function publicBase(request, env) {
  if (env.PUBLIC_BASE_URL) return env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function toAiMessages(history) {
  const out = [{ role: "system", content: SYSTEM_PROMPT }];
  for (const m of history.slice(-12)) {
    if (!m || !m.text) continue;
    if (m.role === "user") out.push({ role: "user", content: String(m.text).slice(0, 4000) });
    else if (m.role === "assistant") out.push({ role: "assistant", content: String(m.text).slice(0, 4000) });
  }
  return out;
}

async function replyWithWorkersAi(env, history) {
  if (!env.AI) throw new Error("AI binding missing");
  const result = await env.AI.run(AI_MODEL, {
    messages: toAiMessages(history),
    max_tokens: 400,
    temperature: 0.4,
  });
  const text =
    (typeof result === "string" && result) ||
    (result && typeof result.response === "string" && result.response) ||
    (result && typeof result.result === "string" && result.result) ||
    "";
  const cleaned = String(text).trim();
  if (!cleaned) throw new Error("empty AI response");
  return cleaned.slice(0, 4000);
}

async function handleChatPost(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, request);
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 4000) {
    return json({ error: "message required (max 4000 chars)" }, 400, request);
  }

  const conversation_id =
    (typeof body.conversation_id === "string" && body.conversation_id.trim()) ||
    uuid();

  const store = await loadChat(env, conversation_id);
  store.messages.push({ role: "user", text: message, ts: Date.now() });

  const webhookUrl = env.GROK_WEBHOOK_URL;
  const webhookKey = env.GROK_WEBHOOK_KEY || "";

  // Prefer Grok Bot webhook when configured; otherwise Workers AI (instant).
  if (webhookUrl) {
    store.pending = true;
    await saveChat(env, conversation_id, store);
    const reply_url = `${publicBase(request, env)}/api/chat/reply`;
    try {
      const wh = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${webhookKey}`,
          "X-Webhook-Key": webhookKey,
        },
        body: JSON.stringify({
          conversation_id,
          message,
          history: store.messages,
          reply_url,
        }),
      });
      if (!wh.ok) console.log("webhook status", wh.status);
    } catch (err) {
      console.log("webhook error", String(err));
    }
    return json({ conversation_id, status: "pending" }, 200, request);
  }

  try {
    let reply;
    if (looksOffTopic(message)) {
      reply = OFFTOPIC_REPLY;
    } else {
      reply = sanitizeReply(await replyWithWorkersAi(env, store.messages));
      if (/\b(curry|rezept|kochen|backen|pizza)\b/i.test(reply)) {
        reply = OFFTOPIC_REPLY;
      }
    }
    store.messages.push({ role: "assistant", text: reply, ts: Date.now() });
    store.pending = false;
    try {
      await maybeNotifyChatLead(env, conversation_id, store, message);
    } catch (e) {
      console.log("lead notify", String(e));
    }
    await saveChat(env, conversation_id, store);
    return json({ conversation_id, status: "ok", reply }, 200, request);
  } catch (err) {
    console.log("ai error", String(err));
    store.pending = false;
    await saveChat(env, conversation_id, store);
    const fallback =
      "Danke für Ihre Nachricht. Der Assistent ist gerade nicht erreichbar. Schreiben Sie uns bitte an info@creationfirst.io oder über die Kontaktseite — wir melden uns.";
    store.messages.push({ role: "assistant", text: fallback, ts: Date.now() });
    await saveChat(env, conversation_id, store);
    return json({ conversation_id, status: "ok", reply: fallback }, 200, request);
  }
}

async function handleReplyPost(request, env) {
  if (!bearerOk(request, env.REPLY_SECRET)) {
    return json({ error: "Unauthorized" }, 401, request);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, request);
  }

  const conversation_id =
    typeof body.conversation_id === "string" ? body.conversation_id.trim() : "";
  const reply = typeof body.reply === "string" ? body.reply.trim() : "";

  if (!conversation_id || !reply) {
    return json({ error: "conversation_id and reply required" }, 400, request);
  }
  if (reply.length > 16000) {
    return json({ error: "reply too long" }, 400, request);
  }

  const store = await loadChat(env, conversation_id);
  store.messages.push({ role: "assistant", text: reply, ts: Date.now() });
  store.pending = false;
  await saveChat(env, conversation_id, store);

  return json({ ok: true }, 200, request);
}

async function handleChatGet(request, env) {
  const url = new URL(request.url);
  const conversation_id = (url.searchParams.get("conversation_id") || "").trim();
  if (!conversation_id) {
    return json({ error: "conversation_id required" }, 400, request);
  }
  const store = await loadChat(env, conversation_id);
  return json({ messages: store.messages }, 200, request);
}



function extractEmail(text) {
  const m = String(text || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0] : "";
}

function extractPhone(text) {
  const m = String(text || "").match(/(?:\+|00)?[\d][\d\s\/().-]{6,}\d/);
  if (!m) return "";
  const digits = m[0].replace(/\D/g, "");
  return digits.length >= 7 ? m[0].trim() : "";
}

function isLeadSignal(text) {
  return /\b(termin|anruf|anrufen|rückruf|rueckruf|audit|kurzanalyse|erstgespräch|erstgespraech|sprint|retainer|angebot|preis|kontakt|meldem|zurückrufen|zurueckrufen|call|meeting)\b/i.test(
    String(text || "")
  );
}

async function postDiscord(env, payload) {
  const webhook = env.DISCORD_CONTACT_WEBHOOK_URL;
  if (!webhook) return false;
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.log("discord status", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.log("discord error", String(err));
    return false;
  }
}

function field(name, value, inline) {
  return {
    name,
    value: String(value || "—").slice(0, 1024) || "—",
    inline: !!inline,
  };
}

async function notifyContactDiscord(env, data) {
  const embed = {
    title: "Neue Website-Anfrage",
    color: 0x22d3ee,
    timestamp: new Date().toISOString(),
    fields: [
      field("Name", data.name, true),
      field("E-Mail", data.email, true),
      field("Telefon", data.phone, true),
      field("Unternehmen", data.company || "—", true),
      field("Thema", data.service || "—", true),
      field("Budget", data.budget || "—", true),
      field("Nachricht", data.message, false),
    ],
    footer: { text: "CreationFirst · Kontaktformular" },
  };
  return postDiscord(env, {
    username: "CreationFirst Kontakt",
    avatar_url: "https://wrapdbtc.github.io/creationfirst/assets/images/discord-avatar.png",
    embeds: [embed],
  });
}

async function notifyChatLeadDiscord(env, data) {
  const lines = (data.history || [])
    .slice(-8)
    .map((m) => `**${m.role === "user" ? "Besucher" : "Bot"}:** ${String(m.text || "").slice(0, 280)}`)
    .join("\n");
  const embed = {
    title: "Chat-Lead (Site Widget)",
    color: 0xa78bfa,
    timestamp: new Date().toISOString(),
    fields: [
      field("Conversation", data.conversation_id, false),
      field("E-Mail", data.email || "—", true),
      field("Telefon", data.phone || "—", true),
      field("Signal", data.signal || "Kontakt/Interesse", true),
      field("Letzte Nachricht", data.message, false),
      field("Verlauf", lines || "—", false),
    ],
    footer: { text: "CreationFirst · Live-Chat" },
  };
  return postDiscord(env, {
    username: "CreationFirst Chat",
    avatar_url: "https://wrapdbtc.github.io/creationfirst/assets/images/discord-avatar.png",
    embeds: [embed],
  });
}

async function maybeNotifyChatLead(env, conversation_id, store, message) {
  const email = extractEmail(message);
  const phone = extractPhone(message);
  const lead = isLeadSignal(message);
  if (!email && !phone && !lead) return;

  // Avoid spamming: one Discord ping per conversation unless new contact details appear
  const prevEmail = store.leadEmail || "";
  const prevPhone = store.leadPhone || "";
  const already = !!store.leadNotified;
  const newContact = (email && email !== prevEmail) || (phone && phone !== prevPhone);
  if (already && !newContact) return;

  if (email) store.leadEmail = email;
  if (phone) store.leadPhone = phone;
  store.leadNotified = true;

  await notifyChatLeadDiscord(env, {
    conversation_id,
    message,
    email: store.leadEmail,
    phone: store.leadPhone,
    signal: email || phone ? "Kontaktdaten im Chat" : "Kauf-/Termin-Signal",
    history: store.messages,
  });
}

async function handleContactPost(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, request);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const budget = typeof body.budget === "string" ? body.budget.trim() : "";
  const service = typeof body.service === "string" ? body.service.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const hp = typeof body._gotcha === "string" ? body._gotcha.trim() : "";

  if (hp) return json({ ok: true }, 200, request);

  if (!name || name.length > 200) return json({ error: "name required" }, 400, request);
  if (!email || email.length > 320 || !email.includes("@")) return json({ error: "email required" }, 400, request);
  if (!phone || phone.length < 5 || phone.length > 40) return json({ error: "phone required" }, 400, request);
  if (!message || message.length > 5000) return json({ error: "message required" }, 400, request);

  if (!env.DISCORD_CONTACT_WEBHOOK_URL) {
    return json({ error: "contact not configured" }, 503, request);
  }

  const ok = await notifyContactDiscord(env, {
    name,
    email,
    phone,
    company,
    budget,
    service,
    message,
  });
  if (!ok) return json({ error: "delivery failed" }, 502, request);
  return json({ ok: true }, 200, request);
}


export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    try {
      if (path === "/api/chat" && request.method === "POST") {
        return await handleChatPost(request, env);
      }
      if (path === "/api/contact" && request.method === "POST") {
        return await handleContactPost(request, env);
      }
      if (path === "/api/chat/reply" && request.method === "POST") {
        return await handleReplyPost(request, env);
      }
      if (path === "/api/chat" && request.method === "GET") {
        return await handleChatGet(request, env);
      }
      if (path === "/" || path === "/health") {
        return json(
          {
            ok: true,
            service: "creationfirst-chat",
            mode: env.GROK_WEBHOOK_URL ? "grok-webhook" : "workers-ai",
          },
          200,
          request
        );
      }
      return json({ error: "Not found" }, 404, request);
    } catch (err) {
      console.log("handler error", String(err));
      return json({ error: "Internal error" }, 500, request);
    }
  },
};
