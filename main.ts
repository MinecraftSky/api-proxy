// API 端點配置
const API_ENDPOINTS = {
  chatgpt: "https://api.openai.com",
  claude: "https://api.anthropic.com",
  gemini: "https://generativelanguage.googleapis.com",
  groq: "https://api.groq.com/openai",
  grok: "https://api.x.ai",
};

// 首頁 HTML
const HOME_PAGE = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API 代理服务</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 800px;
            width: 100%;
            padding: 40px;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 2em;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 1.1em;
        }
        .api-list {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
        }
        .api-item {
            background: white;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 5px;
            transition: transform 0.2s;
        }
        .api-item:hover {
            transform: translateX(5px);
        }
        .api-item:last-child {
            margin-bottom: 0;
        }
        .api-name {
            font-weight: bold;
            color: #667eea;
            font-size: 1.1em;
            margin-bottom: 5px;
        }
        .api-path {
            font-family: 'Courier New', monospace;
            color: #555;
            background: #f0f0f0;
            padding: 5px 10px;
            border-radius: 3px;
            display: inline-block;
        }
        .usage {
            margin-top: 30px;
            padding: 20px;
            background: #e3f2fd;
            border-radius: 10px;
        }
        .usage h2 {
            color: #1976d2;
            margin-bottom: 15px;
        }
        .code-block {
            background: #263238;
            color: #aed581;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            margin-top: 10px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #999;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 API 代理服务</h1>
        <p class="subtitle">此地址用于代理 ChatGPT、Claude、Gemini、Groq 和 Grok API</p>
        
        <div class="api-list">
            <div class="api-item">
                <div class="api-name">ChatGPT (OpenAI)</div>
                <div class="api-path">/chatgpt/*</div>
            </div>
            <div class="api-item">
                <div class="api-name">Claude (Anthropic)</div>
                <div class="api-path">/claude/*</div>
            </div>
            <div class="api-item">
                <div class="api-name">Gemini (Google)</div>
                <div class="api-path">/gemini/*</div>
            </div>
            <div class="api-item">
                <div class="api-name">Groq</div>
                <div class="api-path">/groq/*</div>
            </div>
            <div class="api-item">
                <div class="api-name">Grok (X.AI)</div>
                <div class="api-path">/grok/*</div>
            </div>
        </div>

        <div class="usage">
            <h2>📖 使用示例</h2>
            <p>将原始 API 地址替换为代理地址：</p>
            <div class="code-block">
# ChatGPT 示例
https://api.openai.com/v1/chat/completions
→ https://your-project.deno.dev/chatgpt/v1/chat/completions

# Claude 示例
https://api.anthropic.com/v1/messages
→ https://your-project.deno.dev/claude/v1/messages

# Gemini 示例
https://generativelanguage.googleapis.com/v1beta/models
→ https://your-project.deno.dev/gemini/v1beta/models
            </div>
        </div>

        <div class="footer">
            Powered by Deno Deploy 🦕
        </div>
    </div>
</body>
</html>
`;

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // 首頁
  if (pathname === "/") {
    return new Response(HOME_PAGE, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 檢查是否是 API 代理請求
  for (const [prefix, endpoint] of Object.entries(API_ENDPOINTS)) {
    if (pathname.startsWith(`/${prefix}/`)) {
      return proxyRequest(req, prefix, endpoint);
    }
  }

  // 404
  return new Response("Not Found", { status: 404 });
}

async function proxyRequest(
  req: Request,
  prefix: string,
  targetEndpoint: string
): Promise<Response> {
  try {
    const url = new URL(req.url);
    // 移除前綴，構建目標 URL
    const targetPath = url.pathname.replace(`/${prefix}`, "");
    const targetUrl = `${targetEndpoint}${targetPath}${url.search}`;

    console.log(`[${prefix}] Proxying: ${req.method} ${targetUrl}`);

    // 複製請求頭
    const headers = new Headers(req.headers);
    headers.delete("host"); // 刪除原始 host
    
    // 添加 CORS 頭
    headers.set("Access-Control-Allow-Origin", "*");

    // 構建代理請求
    const proxyReq = new Request(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.body,
    });

    // 發送請求到目標 API
    const response = await fetch(proxyReq);

    // 複製響應頭
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "*");

    // 返回響應
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[${prefix}] Error:`, error);
    return new Response(
      JSON.stringify({
        error: "代理請求失敗",
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

// 處理 CORS 預檢請求
function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// Deno Deploy 入口點
Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return handleOptions();
  }
  return handleRequest(req);
});
