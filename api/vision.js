export const config = { runtime: 'edge' };

// Provedor único: DeepSeek (deepseek-flash vision).
// Env var no Vercel: DEEPSEEK_API_KEY
const PROVIDERS = [
  {
    id: 'deepseek',
    name: 'deepseek',
    url: 'https://api.deepseek.com/chat/completions',
    keyEnv: 'DEEPSEEK_API_KEY',
    model: 'deepseek-flash',
    timeout: 8000
  }
];

async function tentarProvedor(provider, payload, useStream) {
  const apiKey = (process.env[provider.keyEnv] || "").trim();
  if (!apiKey) {
    console.log(`${provider.name}: chave não configurada (${provider.keyEnv})`);
    return { error: `${provider.name}: chave não configurada (${provider.keyEnv})` };
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "Accept": useStream ? "text/event-stream" : "application/json"
  };

  const providerPayload = {
    model: provider.model,
    messages: payload.messages,
    temperature: payload.temperature ?? 0.01,
    max_tokens: payload.max_tokens ?? 1024,
    stream: useStream
  };

  console.log(`Tentando ${provider.name}...`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), provider.timeout);

  try {
    const resp = await fetch(provider.url, {
      method: "POST",
      headers,
      body: JSON.stringify(providerPayload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const responseText = await resp.text();
    
    if (!resp.ok) {
      console.warn(`${provider.name} erro ${resp.status}:`, responseText.slice(0, 200));
      return { error: `${provider.name}: HTTP ${resp.status} — ${responseText.slice(0, 150)}` };
    }

    console.log(`${provider.name} OK`);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`${provider.name} resposta não é JSON:`, responseText.slice(0, 200));
      return { error: `${provider.name}: resposta inválida (não JSON)` };
    }

    if (useStream) {
      return new Response(responseText, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*" }
      });
    }
    
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (e) {
    clearTimeout(timeoutId);
    console.error(`${provider.name} exceção:`, e.message, e.stack);
    return { error: `${provider.name}: ${e.name === 'AbortError' ? 'timeout' : e.message}` };
  }
}

// Vercel Edge Function: export fetch (Web API style)
export async function fetch(request) {
  try {
    // GET para diagnóstico
    if (request.method === "GET") {
      const providers = PROVIDERS.map(p => ({
        id: p.id,
        model: p.model,
        hasKey: !!((process.env[p.keyEnv] || "").trim())
      }));
      return new Response(JSON.stringify({ ok: true, hint: "hasKey=false = chave ausente no Vercel (Settings → Environment Variables + Redeploy)", providers }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const payload = await request.json();
    const useStream = payload.stream === true;

    // Modo dirigido pelo cliente: tenta UM provedor
    if (payload.provider && payload.provider !== 'auto') {
      const provider = PROVIDERS.find(p => p.id === payload.provider || p.name === payload.provider);
      if (!provider) {
        return new Response(JSON.stringify({ error: `Provedor desconhecido: ${payload.provider}` }), {
          status: 400, headers: { "Content-Type": "application/json" }
        });
      }
      const r = await tentarProvedor(provider, payload, useStream);
      if (r instanceof Response) return r;
      return new Response(JSON.stringify({ error: r.error || `${provider.name} indisponível` }), {
        status: 502, headers: { "Content-Type": "application/json" }
      });
    }

    // Modo auto: tenta em ordem até o primeiro OK
    for (const provider of PROVIDERS) {
      const r = await tentarProvedor(provider, payload, useStream);
      if (r instanceof Response) return r;
    }

    return new Response(JSON.stringify({ error: "Todas IAs falharam." }), {
      status: 502, headers: { "Content-Type": "application/json" }
    });

  } catch (e) {
    const msg = e.name === 'AbortError' ? "Timeout em todos provedores" : e.message;
    return new Response(JSON.stringify({ error: msg }), { status: 504, headers: { "Content-Type": "application/json" } });
  }
}
