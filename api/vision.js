export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const payload = await req.json();
    const { model, messages, temperature, max_tokens, stream } = payload;
    const useStream = stream === true;

    // Tenta Nvidia primeiro
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    if (nvidiaKey) {
      try {
        const nvidiaResp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${nvidiaKey}`,
            Accept: useStream ? "text/event-stream" : "application/json"
          },
          body: JSON.stringify({
            model: model || "meta/llama-3.2-11b-vision-instruct",
            messages,
            temperature: temperature ?? 0,
            max_tokens: max_tokens ?? 1024,
            stream: useStream
          }),
          signal: AbortSignal.timeout(8000)
        });

        if (nvidiaResp.ok) {
          if (useStream) {
            return new Response(nvidiaResp.body, {
              headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*" }
            });
          }
          const data = await nvidiaResp.json();
          return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        }
        console.warn("[Vision] Nvidia falhou:", nvidiaResp.status, await nvidiaResp.text());
      } catch (e) {
        console.warn("[Vision] Nvidia erro:", e.message);
      }
    }

    // Fallback DeepSeek (OpenRouter)
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      const dr = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterKey}`,
          "HTTP-Referer": "https://lotofacil.app",
          "X-Title": "Lotofácil Conferidor"
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat-v3-0324:free",
          messages: messages.map(m => ({
            role: m.role,
            content: Array.isArray(m.content) ? m.content.map(c => c.type === "text" ? c.text : "[image]").join(" ") : m.content
          })),
          temperature: temperature ?? 0,
          max_tokens: max_tokens ?? 1024,
          stream: useStream
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (dr.ok) {
        if (useStream) return new Response(dr.body, { headers: { "Content-Type": "text/event-stream", "Access-Control-Allow-Origin": "*" } });
        const data = await dr.json();
        return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
      console.warn("[Vision] OpenRouter falhou:", dr.status, await dr.text());
    }

    return new Response(JSON.stringify({ error: "Nenhum provedor de IA configurado (NVIDIA_API_KEY ou OPENROUTER_API_KEY)" }), { status: 503, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e.name === 'TimeoutError' || e.name === 'AbortError' ? "Timeout (8-10s). Tente imagem menor." : e.message;
    return new Response(JSON.stringify({ error: msg }), { status: 504, headers: { "Content-Type": "application/json" } });
  }
}