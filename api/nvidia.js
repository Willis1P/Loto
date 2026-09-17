export const config = { runtime: "edge" };

export async function POST(req) {
  try {
    const { model, messages, temperature, max_tokens } = await req.json();
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: "NVIDIA_API_KEY não configurada" }), { status: 401, headers: { "Content-Type": "application/json" } });

    const resp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Accept": "application/json"
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens })
    });

    const data = await resp.json();
    if (!resp.ok) return new Response(JSON.stringify(data.error || { error: "NVIDIA API error" }), { status: resp.status, headers: { "Content-Type": "application/json" } });

    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
