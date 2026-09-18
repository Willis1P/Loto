export default async function handler(req) {
  try {
    const payload = await req.json();
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: "NVIDIA_API_KEY não configurada" }), { status: 401, headers: { "Content-Type": "application/json" } });

    const { model, messages, temperature, max_tokens, seed, stream, reasoning_effort } = payload;

    const nvidiaHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Accept": stream ? "text/event-stream" : "application/json"
    };

    const nvidiaPayload = { model, messages, temperature, max_tokens, seed, stream };
    if (reasoning_effort) nvidiaPayload.reasoning_effort = reasoning_effort;

    const resp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: nvidiaHeaders,
      body: JSON.stringify(nvidiaPayload)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(errText, { status: resp.status, headers: { "Content-Type": "application/json" } });
    }

    const contentType = resp.headers.get("content-type");
    if (contentType && contentType.includes("text/event-stream")) {
      return new Response(resp.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" } });
    }

    const data = await resp.json();
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
