import type { CenarioInput } from "./engine";

// ── Compartilhamento por código (par A/B) ───────────────────────────────────
// Tenta a Pages Function /api/share (D1). Se ela não existir ou responder
// erro (ex.: `vite dev` sem wrangler, banco sem binding → 503), cai no
// fallback em localStorage para o recurso continuar funcionando offline.

export interface SharePayload {
  v: 1;
  a: CenarioInput;
  b: CenarioInput;
  comparar: boolean;
}

const LS_PREFIXO = "jurosforge:share:";

/**
 * Valida a forma mínima de um payload compartilhado antes de confiar nele.
 * Os cenários A/B ainda são saneados campo a campo no store (sanitizarCenario),
 * mas aqui rejeitamos lixo estrutural (não-objeto, sem A/B) para que a tela
 * mostre "código não encontrado" em vez de tentar importar dados inválidos.
 */
export function isSharePayload(x: unknown): x is SharePayload {
  if (!x || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  return (
    !!p.a &&
    typeof p.a === "object" &&
    !!p.b &&
    typeof p.b === "object"
  );
}

export async function saveShare(payload: SharePayload): Promise<string> {
  try {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { code: string };
    return data.code;
  } catch {
    // Fallback local: gera um código curto determinístico e guarda no navegador.
    const code = localCode(JSON.stringify(payload));
    try {
      localStorage.setItem(`${LS_PREFIXO}${code}`, JSON.stringify(payload));
    } catch {
      /* quota cheia / modo privado */
    }
    return code;
  }
}

export async function loadShare(code: string): Promise<SharePayload | null> {
  try {
    const res = await fetch(`/api/share?code=${encodeURIComponent(code)}`);
    if (res.ok) {
      const data = (await res.json()) as { payload?: unknown };
      if (isSharePayload(data.payload)) return data.payload;
    }
  } catch {
    /* sem rede / sem function — tenta o fallback local */
  }
  try {
    const local = localStorage.getItem(`${LS_PREFIXO}${code}`);
    if (!local) return null;
    const parsed = JSON.parse(local) as unknown;
    return isSharePayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function localCode(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = (h * 33) ^ seed.charCodeAt(i);
  return (h >>> 0).toString(36).slice(0, 7).toUpperCase();
}
