export const config = { runtime: 'edge' };

const FREE_VISION_MODELS = [
  { id: 'google/gemini-flash-1.5', name: 'Gemini 1.5 Flash', vision: true },
  { id: 'google/gemini-flash-1.5-8b', name: 'Gemini 1.5 Flash 8B', vision: true },
  { id: 'meta-llama/llama-3.2-11b-vision-instruct:free', name: 'Llama 3.2 11B Vision (free)', vision: true },
];

const PROVIDERS = [
  {
    id: 'openrouter',
    name: 'OpenRouter (free vision models)',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    keyEnv: 'OPENROUTER_API_KEY',
    models: FREE_VISION_MODELS,
    timeout: 8000,
    extraHeaders: {
      'HTTP-Referer': 'https://loto-coral.vercel.app',
      'X-Title': 'Lotofácil Conferidor'
    }
  }
];

// Handler padrão (evita conflito com fetch global)
export default async function handler(request) {
  try {
    if (request.method === "GET") {
      const status = await Promise.all(PROVIDERS.map(async (p) => {
        const hasKey = !!((process.env[p.keyEnv] || "").trim());
        return {
          id: p.id,
          hasKey,
          models: p.models.map(m => ({ id: m.id, name: m.name, vision: m.vision }))
        };
      }));
      return new Response(JSON.stringify({ ok: true, providers: status }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const payload = await request.json();
    const useStream = payload.stream === true;
    const requestedModel = payload.model;

    for (const provider of PROVIDERS) {
      const apiKey = (process.env[provider.keyEnv] || "").trim();
      if (!apiKey) {
        console.log(`${provider.name}: chave não configurada (${provider.keyEnv})`);
        continue;
      }

      let modelId = requestedModel;
      if (!modelId) {
        const visionModel = provider.models.find(m => m.vision);
        modelId = visionModel?.id || provider.models[0]?.id;
      }
      if (!modelId) continue;

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Accept": useStream ? "text/event-stream" : "application/json",
        ...(provider.extraHeaders || {})
      };

      const providerPayload = {
        model: modelId,
        messages: payload.messages,
        temperature: payload.temperature ?? 0.01,
        max_tokens: payload.max_tokens ?? 1024,
        stream: useStream
      };

      console.log(`Tentando ${provider.name} com ${modelId}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), provider.timeout);

      try {
        // USA globalThis.fetch para evitar recursão com export fetch
        const resp = await globalThis.fetch(provider.url, {
          method: "POST",
          headers,
          body: JSON.stringify(providerPayload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const responseText = await resp.text();
        
        if (!resp.ok) {
          console.warn(`${provider.name} (${modelId}) erro ${resp.status}:`, responseText.slice(0, 200));
          continue;
        }

        console.log(`${provider.name} (${modelId}) OK`);

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`${provider.name} resposta não é JSON:`, responseText.slice(0, 200));
          continue;
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
        console.error(`${provider.name} (${modelId}) exceção:`, e.message, e.stack);
        continue;
      }
    }

    return new Response(JSON.stringify({ 
      error: "Todos provedores gratuitos falharam. Use extração local (Tesseract) ou manual.",
      hint: "Configure OPENROUTER_API_KEY no Vercel para modelos grátis com vision, ou use OCR local."
    }), {
      status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (e) {
    console.error("handler error:", e.message, e.stack);
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
    });
  }
}