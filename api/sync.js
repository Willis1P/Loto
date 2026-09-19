// ─── SYNC ENTRE APARELHOS (Upstash Redis via REST, sem dependências) ───
// Requer no Vercel: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// Store: loto:sync:<code> = { rev, updatedAt, deviceId, state }
// Política: last-writer-wins por rev (só sobrescreve se rev maior).

const TTL_SEGUNDOS = 7776000; // 90 dias

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}

function sanitizarCode(code) {
  const c = String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return c.length >= 4 ? c : null;
}

async function redis(cmd, ...args) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    const e = new Error("SYNC_NAO_CONFIGURADO");
    e.code = "SYNC_NAO_CONFIGURADO";
    throw e;
  }
  const r = await fetch(`${url.replace(/\/$/, "")}/${cmd}/${args.map(a => encodeURIComponent(a)).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!r.ok) throw new Error(`Redis HTTP ${r.status}`);
  return r.json();
}

export default async function handler(req) {
  try {
    const u = new URL(req.url);
    if (req.method === "GET") {
      const code = sanitizarCode(u.searchParams.get("code"));
      if (!code) return json(400, { error: "Informe ?code=XXXX" });
      const data = await redis("GET", `loto:sync:${code}`);
      const raw = data && data.result ? data.result : null;
      if (!raw) return json(200, { ok: true, found: false });
      try {
        return json(200, { ok: true, found: true, snapshot: JSON.parse(raw) });
      } catch (_) {
        return json(200, { ok: true, found: false });
      }
    }

    if (req.method === "POST") {
      const body = await req.json();
      const code = sanitizarCode(body.code);
      const rev = Number(body.rev);
      if (!code) return json(400, { error: "Informe code" });
      if (!Number.isFinite(rev)) return json(400, { error: "Informe rev numérico" });
      if (!body.state || typeof body.state !== "object") return json(400, { error: "Informe state" });

      const key = `loto:sync:${code}`;
      const atual = await redis("GET", key);
      if (atual && atual.result) {
        try {
          const cur = JSON.parse(atual.result);
          if (Number(cur.rev) >= rev) {
            return json(200, { ok: false, reason: "stale", current: cur });
          }
        } catch (_) {}
      }
      const snap = JSON.stringify({
        rev,
        updatedAt: Date.now(),
        deviceId: String(body.deviceId || "web").slice(0, 40),
        state: body.state
      });
      await redis("SET", key, snap, "EX", String(TTL_SEGUNDOS));
      return json(200, { ok: true, rev });
    }

    return json(405, { error: "Use GET (puxar) ou POST (enviar)" });
  } catch (e) {
    if (e && e.code === "SYNC_NAO_CONFIGURADO") {
      return json(501, { error: "Sync não configurado no servidor. Adicione UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN no Vercel." });
    }
    return json(500, { error: String((e && e.message) || e) });
  }
}
