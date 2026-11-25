import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getBackendBaseUrl(): string {
  const raw =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:8001";
  return raw.replace(/\/+$/, "");
}

async function proxyRequest(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  const backendBase = getBackendBaseUrl();
  const pathSegments = context.params.path?.join("/") || "";
  const search = req.nextUrl.search || "";
  const targetUrl = `${backendBase}/api/${pathSegments}${search}`;

  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    // Remove headers hop-by-hop que não devem ser repassados
    if (
      lower === "host" ||
      lower === "connection" ||
      lower === "content-length" ||
      lower === "transfer-encoding"
    ) {
      return;
    }
    forwardHeaders.set(key, value);
  });

  // Preserva o host original para resolução multi-tenant no backend FastAPI
  const originalHost =
    req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (originalHost) {
    forwardHeaders.set("x-forwarded-host", originalHost);
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: body && body.byteLength > 0 ? body : undefined,
      redirect: "manual",
    });

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === "transfer-encoding" || lower === "content-encoding") {
        return;
      }
      responseHeaders.set(key, value);
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[API Proxy] Falha ao conectar em ${targetUrl}:`, error);
    return NextResponse.json(
      { detail: "Serviço de API indisponível no momento." },
      { status: 502 }
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  return proxyRequest(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  return proxyRequest(req, context);
}

export async function PUT(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  return proxyRequest(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  return proxyRequest(req, context);
}

export async function DELETE(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  return proxyRequest(req, context);
}

export async function OPTIONS(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  return proxyRequest(req, context);
}
