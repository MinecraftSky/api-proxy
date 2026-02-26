// API 端點與金鑰配置（金鑰請務必從環境變數讀取）
const API_ENDPOINTS: Record<string, string> = {
  chatgpt: "https://api.openai.com",
  claude: "https://api.anthropic.com",
  gemini: "https://generativelanguage.googleapis.com",
  groq: "https://api.groq.com/openai",
  grok: "https://api.x.ai",
};

const API_KEYS: Record<string, string | undefined> = {
  chatgpt: Deno.env.get("OPENAI_API_KEY"),
  claude: Deno.env.get("ANTHROPIC_API_KEY"),
  gemini: Deno.env.get("GEMINI_API_KEY"),       // Google 常用 x-goog-api-key 或 Bearer
  groq: Deno.env.get("GROQ_API_KEY"),
  grok: Deno.env.get("XAI_API_KEY"),
};

const PROXY_TOKEN = Deno.env.get("PROXY_TOKEN");   // 若設定此值，則強制驗證 Bearer token

// 首頁 HTML（保持原樣，略過顯示）
const HOME_PAGE = `<!DOCTYPE html>...`;  // ← 請把你原本的 HOME_PAGE 完整內容貼回這裡

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // 首頁
  if (pathname === "/" || pathname === "") {
    return new Response(HOME_PAGE, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 處理 CORS 預檢
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, x-requested-with",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // 檢查是否為 API 代理請求
  for (const [prefix, endpoint] of Object.entries(API_ENDPOINTS)) {
    if (pathname.startsWith(`/${prefix}/`)) {
      return proxyRequest(req, prefix, endpoint);
    }
  }

  return new Response("Not Found", { status: 404 });
}

async function proxyRequest(
  req: Request,
  prefix: string,
  baseEndpoint: string,
): Promise<Response> {
  try {
    // 1. 驗證 Bearer Token（若有設定 PROXY_TOKEN）
    if (PROXY_TOKEN) {
      const auth = req.headers.get("authorization");
      if (!auth || auth !== `Bearer ${PROXY_TOKEN}`) {
        return new Response("Unauthorized", {
          status: 401,
          headers: { "Content-Type": "text/plain" },
        });
      }
    }

    // 2. 取得對應 API Key
    const apiKey = API_KEYS[prefix];
    if (!apiKey) {
      return new Response(`API key for ${prefix} is not configured`, { status: 500 });
    }

    // 3. 構建目標 URL
    const url = new URL(req.url);
    let targetPath = url.pathname.replace(`/${prefix}`, "");
    if (!targetPath.startsWith("/")) targetPath = "/" + targetPath;

    const targetUrl = new URL(targetPath + url.search, baseEndpoint);

    // 4. 準備 headers
    const headers = new Headers(req.headers);
    headers.delete("host");
    headers.delete("connection");
    headers.delete("keep-alive");

    // 根據不同服務設定 Authorization
    if (prefix === "gemini") {
      // Google Generative Language API 常用 x-goog-api-key
      headers.set("x-goog-api-key", apiKey);
      headers.delete("authorization"); // 避免衝突
    } else {
      // 其他大多數使用 Bearer
      headers.set("Authorization", `Bearer ${apiKey}`);
    }

    // 5. 建立代理請求
    const proxyReqInit: RequestInit = {
      method: req.method,
      headers,
      redirect: "follow",
    };

    // 支援 streaming 上傳與下傳（關鍵）
    if (req.body && !["GET", "HEAD"].includes(req.method)) {
      proxyReqInit.body = req.body;
      (proxyReqInit as any).duplex = "half";
    }

    const proxyRequest = new Request(targetUrl.toString(), proxyReqInit);

    // 6. 發送請求
    const response = await fetch(proxyRequest);

    // 7. 準備回應 headers（加入 CORS）
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Expose-Headers", "*");

    // 8. 回傳
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error(`[${prefix}] proxy error:`, err);
    return new Response(
      JSON.stringify({ error: "Proxy request failed" }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}

// Deno Deploy 入口
Deno.serve((req: Request) => {
  return handleRequest(req);
});