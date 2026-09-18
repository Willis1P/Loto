export default async function handler(req) {
  try {
    const payload = await req.json();
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: "NVIDIA_API_KEY não configurada" }), { status: 401, headers: { "Content-Type": "application/json" } });

    const { model, messages, temperature, max_tokens, seed, stream, reasoning_effort } = payload;

    const nvidiaHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Accept": "text/event-stream"
    };

    const nvidiaPayload = { model, messages, temperature: 0.1, max_tokens: 1024, seed: 0, stream: true };

    const resp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: nvidiaHeaders,
      body: JSON.stringify(nvidiaPayload)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(errText, { status: resp.status, headers: { "Content-Type": "text/plain" } });
    }

    return new Response(resp.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*" } });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message || "Timeout ou erro na API" }), { status: 504, headers: { "Content-Type": "application/json" } });
  }
}
