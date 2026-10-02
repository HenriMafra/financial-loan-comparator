/// <reference types="@cloudflare/workers-types" />

// Pages Function: compartilhamento de cenários por código curto.
//   POST /api/share        body { payload }   -> { code }
//   GET  /api/share?code=XXXXXX               -> { payload }
//
// Sem binding de D1 → responde 503 e o cliente cai no fallback localStorage.

interface Env {
  DB?: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let body: { payload?: unknown };
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  const payload = body.payload;
  if (!payload || typeof payload !== "object") {
    return json({ error: "payload obrigatório" }, 400);
  }
  const serializado = JSON.stringify(payload);
  if (serializado.length > 32_000) {
    return json({ error: "payload grande demais" }, 413);
  }

  // Sem banco vinculado → avisa o cliente para usar o fallback local
  // (mantém o compartilhamento funcionando em `vite dev` / deploy sem D1).
  if (!ctx.env.DB) return json({ error: "persistência indisponível" }, 503);

  const code = genCode();
  try {
    await ctx.env.DB.prepare(
      "INSERT INTO shares (code, payload, created_at) VALUES (?, ?, ?)"
    )
      .bind(code, serializado, new Date().toISOString())
      .run();
  } catch (e) {
    return json({ error: "falha ao salvar", detail: String(e) }, 500);
  }
  return json({ code });
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const code = url.searchParams.get("code");
  if (!code) return json({ error: "code obrigatório" }, 400);

  if (ctx.env.DB) {
    const row = await ctx.env.DB.prepare("SELECT payload FROM shares WHERE code = ?")
      .bind(code)
      .first<{ payload: string }>();
    if (row) return json({ payload: JSON.parse(row.payload) as unknown });
  }
  return json({ error: "não encontrado" }, 404);
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });

// Código de 6 caracteres seguro para URL (sem caracteres ambíguos).
function genCode(): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}
