export const config = { runtime: 'edge' };

// Cascata de provedores vision (padrão hackerai: fallback automático).
// Cada provedor é tentado em ordem; sem chave configurada ele é pulado.
// Env vars no Vercel: DEEPSEEK_API_KEY, NVIDIA_API_KEY, OPENROUTER_API_KEY
const PROVIDERS = [
  {
    name: 'deepseek',
    url: 'https://api.deepseek.com/chat/completions',
    keyEnv: 'DEEPSEEK_API_KEY',
    model: 'deepseek-flash',
    timeout: 8000
  },
  {
    name: 'nvidia',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    keyEnv: 'NVIDIA_API_KEY',
    model: 'meta/llama-3.2-11b-vision-instruct',
    timeout: 9000
  },
  {
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

export default async function handler(req) {
  try {
    const payload = await req.json();
    const { model, messages, temperature, max_tokens, stream } = payload;
    const useStream = stream === true;

    for (const provider of PROVIDERS) {
      const apiKey = process.env[provider.keyEnv];
      if (!apiKey) {
        console.log(`${provider.name}: chave não configurada (${provider.keyEnv})`);
        continue;
      }

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Accept": useStream ? "text/event-stream" : "application/json",
        ...(provider.extraHeaders || {})
      };

      const providerPayload = {
        model: provider.model,
        messages,
        temperature: temperature ?? 0.05,
        max_tokens: max_tokens ?? 768,
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
          console.warn(`${provider.name} erro ${resp.status}:`, errText.slice(0,200));
          continue; // tenta próximo provedor
        }

        console.log(`${provider.name} OK`);

        if (useStream) {
          return new Response(resp.body, {
            headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*" }
          });
        } else {
          const data = await resp.json();
          return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      } catch(e) {
        clearTimeout(timeoutId);
        console.warn(`${provider.name} falhou:`, e.message);
        continue; // tenta próximo provedor
      }
    }

    // Todos falharam
    return new Response(JSON.stringify({ error: "Todos provedores falharam (DeepSeek + Nvidia + OpenRouter). Use extração manual." }), {
      status: 502, headers: { "Content-Type": "application/json" }
    });

  } catch(e) {
    const msg = e.name === 'AbortError' ? "Timeout em todos provedores" : e.message;
    return new Response(JSON.stringify({ error: msg }), { status: 504, headers: { "Content-Type": "application/json" } });
  }
}
