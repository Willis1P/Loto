export const config = { runtime: 'edge' };

// Cascata de provedores vision (padrão hackerai: fallback automático).
// O CLIENTE dirige a cascata (um provedor por chamada) porque o plano
// Hobby limita cada execução a ~10s — 3 tentativas numa chamada só = 504.
// Cada provedor é tentado com timeout próprio; sem chave, é pulado.
// Env vars no Vercel: DEEPSEEK_API_KEY, NVIDIA_API_KEY, OPENROUTER_API_KEY
const PROVIDERS = [
  {
    id: 'deepseek',
    name: 'deepseek',
    url: 'https://api.deepseek.com/chat/completions',
    keyEnv: 'DEEPSEEK_API_KEY',
    model: 'deepseek-flash',
    timeout: 9000
  },
  {
    id: 'nvidia',
    name: 'nvidia',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    keyEnv: 'NVIDIA_API_KEY',
    model: 'meta/llama-3.2-11b-vision-instruct',
    timeout: 9000
  },
  {
    id: 'openrouter',
    name: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    keyEnv: 'OPENROUTER_API_KEY',
    model: 'gpt-4o-mini',
    timeout: 9000,
    extraHeaders: {
      "HTTP-Referer": "https://lotofacil-conferidor.vercel.app",
      "X-Title": "Lotofacil Conferidor"
    }
  }
];

async function tentarProvedor(provider, payload, useStream, diagnostico) {
  const apiKey = (process.env[provider.keyEnv] || "").trim();
  if (!apiKey) {
    console.log(`${provider.name}: chave não configurada (${provider.keyEnv})`);
    if (diagnostico) diagnostico.push(`${provider.name}: sem chave ${provider.keyEnv}`);
    return { skipped: true };
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "Accept": useStream ? "text/event-stream" : "application/json",
    ...(provider.extraHeaders || {})
  };

  const providerPayload = {
    model: provider.model,
    messages: payload.messages,
    temperature: payload.temperature ?? 0.05,
    max_tokens: payload.max_tokens ?? 768,
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

    if (!resp.ok) {
      const errText = await resp.text();
      console.warn(`${provider.name} erro ${resp.status}:`, errText.slice(0, 200));
      return { error: `${provider.name}: HTTP ${resp.status} — ${errText.slice(0, 150)}` };
    }

    console.log(`${provider.name} OK`);

    if (useStream) {
      return {
        ok: true,
        streamed: true,
        response: new Response(resp.body, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*" }
        })
      };
    }
    const data = await resp.json();
    return {
      ok: true,
      response: new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      })
    };
  } catch (e) {
    clearTimeout(timeoutId);
    console.warn(`${provider.name} falhou:`, e.message);
    if (diagnostico) diagnostico.push(`${provider.name}: ${e.name === 'AbortError' ? 'timeout' : e.message}`.slice(0, 120));
    return { error: `${provider.name}: ${e.name === 'AbortError' ? 'timeout' : e.message}` };
  }
}

export default async function handler(req) {
  try {
    // Diagnóstico rápido no navegador: GET /api/vision mostra quais chaves
    // o servidor enxerga (só true/false, nunca o valor). Use após o Redeploy.
    if (req.method === "GET") {
      const providers = PROVIDERS.map(p => ({
        id: p.id,
        model: p.model,
        hasKey: !!((process.env[p.keyEnv] || "").trim())
      }));
      return new Response(JSON.stringify({ ok: true, hint: "hasKey=false = chave ausente no Vercel (Settings → Environment Variables + Redeploy)", providers }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    const payload = await req.json();
    const useStream = payload.stream === true;
    const erros = [];
    const diagnostico = [];

    // Modo dirigido pelo cliente: tenta UM provedor (cada chamada tem 10s próprios)
    if (payload.provider && payload.provider !== 'auto') {
      const provider = PROVIDERS.find(p => p.id === payload.provider || p.name === payload.provider);
      if (!provider) {
        return new Response(JSON.stringify({ error: `Provedor desconhecido: ${payload.provider}` }), {
          status: 400, headers: { "Content-Type": "application/json" }
        });
      }
      const r = await tentarProvedor(provider, payload, useStream, diagnostico);
      if (r.ok) return r.response;
      return new Response(JSON.stringify({ error: r.error || `${provider.name} indisponível`, diagnostico }), {
        status: r.skipped ? 501 : 502, headers: { "Content-Type": "application/json" }
      });
    }

    // Modo auto (compat): tenta em ordem até o primeiro OK
    for (const provider of PROVIDERS) {
      const r = await tentarProvedor(provider, payload, useStream, diagnostico);
      if (r.ok) return r.response;
      if (!r.skipped && r.error) erros.push(r.error);
    }

    const detalheDiag = diagnostico.length ? " Diagnóstico: " + diagnostico.join(" | ").slice(0, 300) : "";
    return new Response(JSON.stringify({ error: "Todas IAs falharam." + detalheDiag, diagnostico }), {
      status: 502, headers: { "Content-Type": "application/json" }
    });

  } catch (e) {
    const msg = e.name === 'AbortError' ? "Timeout em todos provedores" : e.message;
    return new Response(JSON.stringify({ error: msg }), { status: 504, headers: { "Content-Type": "application/json" } });
  }
}
