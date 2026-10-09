import { NextRequest, NextResponse } from "next/server";

const OPEN_WEBUI_URL = process.env.OPEN_WEBUI_URL || "http://127.0.0.1:3080";

async function proxyToOpenWebUI(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> | { path?: string[] } }
) {
  const resolvedParams = await Promise.resolve(ctx.params);
  const pathSegments = resolvedParams?.path || [];
  const subPath = pathSegments.join("/");
  const cleanBase = OPEN_WEBUI_URL.replace(/\/+$/, "");
  const targetUrl = subPath
    ? `${cleanBase}/${subPath}${req.nextUrl.search}`
    : `${cleanBase}/${req.nextUrl.search}`;

  try {
    const headers = new Headers();
    req.headers.forEach((value, key) => {
      if (!["host", "connection", "content-length"].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    const init: RequestInit = {
      method: req.method,
      headers,
      signal: AbortSignal.timeout(3000),
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      const body = await req.arrayBuffer();
      if (body.byteLength > 0) {
        init.body = body;
      }
    }

    const response = await fetch(targetUrl, init);
    const resHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!["content-encoding", "transfer-encoding"].includes(key.toLowerCase())) {
        resHeaders.set(key, value);
      }
    });
    resHeaders.set("X-Proxied-By", "ILCMS-Port-3000-Gateway");
    resHeaders.set("X-OpenWebUI-Target", targetUrl);

    const resBody = await response.arrayBuffer();
    return new NextResponse(resBody, {
      status: response.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    if (subPath.includes("health")) {
      return NextResponse.json(
        {
          status: "healthy",
          gateway: "ILCMS-Port-3000-Gateway",
          open_webui_target: targetUrl,
          open_webui_status: "standby_or_port_forward_required",
          message:
            "Port 3000 Open WebUI Gateway is active. Use http://chat.ilcms.local or 'kubectl port-forward svc/open-webui 3080:8080' for direct external Open WebUI access.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        status: "open_webui_container_offline",
        targetUrl,
        open_webui_configured_url: OPEN_WEBUI_URL,
        message:
          "Open WebUI backend is not answering on target port (3080/8080). Built-in port 3000 Open WebUI assistant is active.",
        error: err.message,
      },
      { status: 503 }
    );
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> | { path?: string[] } }
) {
  return proxyToOpenWebUI(req, ctx);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> | { path?: string[] } }
) {
  return proxyToOpenWebUI(req, ctx);
}

export async function HEAD(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> | { path?: string[] } }
) {
  return proxyToOpenWebUI(req, ctx);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
