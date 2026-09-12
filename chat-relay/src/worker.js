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

const SYSTEM_PROMPT = `Du bist der Live-Chat von CreationFirst (Sie-Form, klar, kein Hype, kein Crypto).
Produkte:
- 0€ Erstgespräch: 30 Min Call, kein PDF, 2–3 Chancen mündlich
- 199€ schriftliche Kurzanalyse: PDF 4–8 Seiten (Ist, 3–5 Chancen Impact×Aufwand, Budget-Bänder, Next Step), anrechenbar auf Audit/Sprint
- KI-Audit: 1.500–3.000€, 7–14 Tage (Interviews, Prozess-Map, Quick Wins, 90-Tage-Roadmap, Build-vs-Buy, Sprint-Angebot, Readout)
- Sprint: 4–12k €, 2–4 Wochen Umsetzung
- Retainer: 1.5–4k €/Monat
ICP: deutschsprachige KMU (ca. 10–150 MA), Fokus Umsetzung/Automationen.
Ziel: helfen und bei Fit zum Erstgespräch/Kontakt führen (info@creationfirst.io oder kontakt.html).
Keine erfundenen Case-Metrics. Antworte knapp (2–6 Sätze), außer Details werden gewünscht. Deutsch, außer der Besucher schreibt auf Englisch/Kroatisch.`;

const AI_MODEL = "@cf/meta/llama-3.2-3b-instruct";

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
    const reply = await replyWithWorkersAi(env, store.messages);
    store.messages.push({ role: "assistant", text: reply, ts: Date.now() });
    store.pending = false;
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
