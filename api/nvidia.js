export const config = { runtime: 'edge' };
export default async function handler(req) {
  try {
    const payload = await req.json();
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: "NVIDIA_API_KEY não configurada" }), { status: 401, headers: { "Content-Type": "application/json" } });

    const { model, messages, temperature, max_tokens, stream } = payload;
    const useStream = stream === true;

    const nvidiaHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Accept": useStream ? "text/event-stream" : "application/json"
    };

    const nvidiaPayload = { 
      model: model || "meta/llama-3.2-11b-vision-instruct", 
      messages, 
      temperature: temperature ?? 0.05, 
      max_tokens: max_tokens ?? 512, 
      stream: useStream 
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const resp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: nvidiaHeaders,
      body: JSON.stringify(nvidiaPayload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({ error: "NVIDIA retornou: " + errText.slice(0,300) }), { status: resp.status, headers: { "Content-Type": "application/json" } });
    }

    if (useStream) {
      return new Response(resp.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*" } });
    } else {
      const data = await resp.json();
      return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
  } catch(e) {
    const msg = e.name === 'AbortError' ? "Tempo esgotado (Vercel 10s). Tente imagem menor ou use extração manual." : e.message;
    return new Response(JSON.stringify({ error: msg }), { status: 504, headers: { "Content-Type": "application/json" } });
  }
}