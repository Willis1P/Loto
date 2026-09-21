export const config = { runtime: 'edge' };

const PROVIDER = {
  id: 'deepseek',
  name: 'deepseek',
  url: 'https://api.deepseek.com/chat/completions',
  keyEnv: 'DEEPSEEK_API_KEY',
  model: 'deepseek-flash',
  timeout: 8000
};

// Vercel Edge: export fetch (Web API)
export async function fetch(request) {
  try {
    if (request.method === "GET") {
      const hasKey = !!((process.env[PROVIDER.keyEnv] || "").trim());
      return new Response(JSON.stringify({ 
        ok: true, 
        providers: [{ id: PROVIDER.id, model: PROVIDER.model, hasKey }]
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const payload = await request.json();
    const useStream = payload.stream === true;

    const apiKey = (process.env[PROVIDER.keyEnv] || "").trim();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: `deepseek: chave não configurada` }), {
        status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Accept": useStream ? "text/event-stream" : "application/json"
    };

    const providerPayload = {
      model: PROVIDER.model,
      messages: payload.messages,
      temperature: payload.temperature ?? 0.01,
      max_tokens: payload.max_tokens ?? 1024,
      stream: useStream
    };

    console.log("Tentando deepseek...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROVIDER.timeout);

    try {
      const resp = await fetch(PROVIDER.url, {
        method: "POST",
        headers,
        body: JSON.stringify(providerPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const responseText = await resp.text();
      
      if (!resp.ok) {
        console.warn("deepseek erro", resp.status, responseText.slice(0, 200));
        return new Response(JSON.stringify({ error: `deepseek: HTTP ${resp.status} — ${responseText.slice(0, 150)}` }), {
          status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      console.log("deepseek OK");

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("deepseek resposta não é JSON:", responseText.slice(0, 200));
        return new Response(JSON.stringify({ error: "deepseek: resposta inválida" }), {
          status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
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
      console.error("deepseek exceção:", e.message, e.stack);
      return new Response(JSON.stringify({ error: `deepseek: ${e.name === 'AbortError' ? 'timeout' : e.message}` }), {
        status: 504, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  } catch (e) {
    console.error("handler error:", e.message, e.stack);
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
    });
  }
}