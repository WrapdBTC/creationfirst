# CreationFirst Chat Relay

Cloudflare Worker that stores site-chat messages in **Workers KV** and notifies a Grok Bot routine via webhook. The Worker does **not** call xAI; the agent replies by POSTing back to `/api/chat/reply`.

Pierre only needs to deploy this **once**; the static GitHub Pages site talks to the Worker URL.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `OPTIONS` | `*` | CORS preflight |
| `POST` | `/api/chat` | Body `{ conversation_id?, message }` → append user msg, fire webhook, return `{ conversation_id, status: "pending" }` |
| `GET` | `/api/chat?conversation_id=` | Poll `{ messages: [{ role, text, ts }] }` |
| `POST` | `/api/chat/reply` | Body `{ conversation_id, reply }` — Bearer `REPLY_SECRET` — append assistant msg |

## Webhook payload (to Grok Bot)

`POST` `GROK_WEBHOOK_URL` with JSON:

```json
{
  "conversation_id": "…",
  "message": "user text",
  "history": [{ "role": "user|assistant", "text": "…", "ts": 0 }],
  "reply_url": "https://<worker>/api/chat/reply"
}
```

Auth headers sent (use whichever your routine expects):

- `Authorization: Bearer ${GROK_WEBHOOK_KEY}`
- `X-Webhook-Key: ${GROK_WEBHOOK_KEY}`

Reply callback:

```http
POST /api/chat/reply
Authorization: Bearer ${REPLY_SECRET}
Content-Type: application/json

{ "conversation_id": "…", "reply": "assistant text" }
```

## Deploy (once)

1. Install Wrangler and log in: `npm i -g wrangler && wrangler login`
2. Create KV: `wrangler kv:namespace create CHATS` → paste the `id` into `wrangler.toml` under `[[kv_namespaces]]`
3. Set secrets:

```bash
wrangler secret put GROK_WEBHOOK_URL
wrangler secret put GROK_WEBHOOK_KEY
wrangler secret put REPLY_SECRET
```

Optional: `PUBLIC_BASE_URL` as a plain var if the Worker is behind a custom domain (so `reply_url` is correct).

4. Deploy: `wrangler deploy`
5. Copy the workers.dev (or custom) URL into the site config:

`assets/js/site-chat-config.js` → `window.CREATIONFIRST_CHAT_API = "https://creationfirst-chat.<subdomain>.workers.dev/api/chat";`

## CORS

Allowed: `https://wrapdbtc.github.io` and `localhost` / `127.0.0.1` (any port).

## Secrets summary

| Secret | Used for |
|--------|----------|
| `GROK_WEBHOOK_URL` | Where to notify the agent of new user messages |
| `GROK_WEBHOOK_KEY` | Shared key on the outbound webhook (`Authorization` + `X-Webhook-Key`) |
| `REPLY_SECRET` | Bearer token required on `/api/chat/reply` |
