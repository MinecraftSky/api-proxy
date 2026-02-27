// main.ts - Deno Deploy 多 AI API 代理（Groq 路徑最終修正版）

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE, PATCH",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
};

const HTML = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI API Proxy</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.7; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #1f2937; }
        h1 { color: #2563eb; }
        code { background: #f1f5f9; padding: 3px 6px; border-radius: 4px; font-family: monospace; }
        .note { color: #64748b; margin-top: 30px; font-size: 0.95em; }
    </style>
</head>
<body>
    <h1>🌐 多模型 AI API 代理服務</h1>
    <p><strong>此地址用於代理 ChatGPT、Claude、Gemini、Groq 和 Grok API。</strong><br>請使用以下前綴：</p>
    
    <h2>支援的前綴</h2>
    <ul>
        <li><strong>/chatgpt/</strong> → OpenAI (ChatGPT / GPT 系列)</li>
        <li><strong>/claude/</strong> → Anthropic Claude</li>
        <li><strong>/gemini/</strong> → Google Gemini</li>
        <li><strong>/groq/</strong> → Groq（極速推理）</li>
        <li><strong>/grok/</strong> → xAI Grok</li>
    </ul>

    <p>使用方式：在您的程式或工具中，將 base URL 設為：</p>
    <p><code>https://您的專案.deno.dev/chatgpt</code>（或其他前綴）</p>
    <p class="note">✅ 自動補 /v1 或 /v1beta • 完整支援 Streaming • CORS 已開啟<br>請自行在請求中帶上 Authorization: Bearer sk-...（或 x-api-key 等）</p>
</body>
</html>`;

function getVersionPrefix(prefix: string): string {
  if (prefix === "/gemini") return "/v1beta";
  if (prefix === "/groq") return "";  // Groq base 已包含 /openai/v1，不再補
  return "/v1";
}

async function handleProxy(req: Request, base: string, prefix: string): Promise<Response> {
  const url = new URL(req.url);
  let path = url.pathname.slice(prefix.length);

  if (!path || path === "/") path = "/";
  else if (!path.startsWith("/")) path = "/" + path;

  // 自動補版本前綴（如果 version 不為空且 path 未開頭匹配）
  const version = getVersionPrefix(prefix);
  if (version && !path.startsWith(version)) {
    path = version + (path === "/" ? "" : path);
  }

  const targetURL = new URL(path + url.search, base);

  // Debug log：可上線後移除，或留著查 Deno logs
  console.log(`[Proxy] Prefix: ${prefix}, Path: ${path}, Target: ${targetURL.toString()}`);

  const headers = new Headers(req.headers);

  const hopByHop = ["host", "connection", "keep-alive", "proxy-connection", "te", "trailers", "transfer-encoding", "upgrade"];
  hopByHop.forEach(h => headers.delete(h));

  for (const key of [...headers.keys()]) {
    if (key.toLowerCase().startsWith("cf-") || 
        (key.toLowerCase().startsWith("x-forwarded-") && key.toLowerCase() !== "x-forwarded-for")) {
      headers.delete(key);
    }
  }

  const proxyReqInit: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (req.body && !["GET", "HEAD"].includes(req.method)) {
    proxyReqInit.body = req.body;
    proxyReqInit.duplex = "half" as any;
  }

  try {
    const resp = await fetch(targetURL, proxyReqInit);

    const newHeaders = new Headers(resp.headers);
    newHeaders.delete("content-length");
    newHeaders.delete("transfer-encoding");

    Object.entries(CORS_HEADERS).forEach(([k, v]) => newHeaders.set(k, v));

    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    console.error("[Proxy Error]", err);
    return new Response(`Proxy Error: ${err?.message || String(err)}`, { status: 502, headers: CORS_HEADERS });
  }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname === "/" || pathname === "/index.html") {
    return new Response(HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const routes = [
    { prefix: "/chatgpt", base: "https://api.openai.com" },
    { prefix: "/claude",  base: "https://api.anthropic.com" },
    { prefix: "/gemini",  base: "https://generativelanguage.googleapis.com" },
    { prefix: "/groq",    base: "https://api.groq.com/openai/v1" },  // 官方正確 base（含 /v1）
    { prefix: "/grok",    base: "https://api.x.ai/v1" },
  ];

  for (const r of routes) {
    if (pathname === r.prefix || pathname === r.prefix + "/") {
      return new Response(
        `\( {r.prefix} 代理已就緒！\n\n請使用：\n \){r.prefix}/chat/completions\n（自動處理版本前綴）`,
        { headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }
  }

  for (const r of routes) {
    if (pathname.startsWith(r.prefix)) {
      return await handleProxy(req, r.base, r.prefix);
    }
  }

  return new Response(
    "404 - 請使用 /chatgpt/、/claude/、/gemini/、/groq/、/grok/ 前綴",
    { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } }
  );
});