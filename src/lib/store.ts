import { create } from "zustand";
import type { CenarioInput, ExtraConfig } from "./engine";
import { PRAZO_MAXIMO } from "./engine";
import type { SharePayload } from "./api";
import { CENARIO_PADRAO_A, CENARIO_PADRAO_B } from "../data/presets";

// Persistência manual em localStorage: todo o estado de domínio é salvo a
// cada mutação na chave "jurosforge:state" e recarregado no boot.
const LS_KEY = "jurosforge:state";

export type IdCenario = "a" | "b";

interface Persistido {
  a: CenarioInput;
  b: CenarioInput;
  comparar: boolean;
}

interface JurosForgeState extends Persistido {
  aba: IdCenario;
  setCenario: (id: IdCenario, patch: Partial<Omit<CenarioInput, "extra">>) => void;
  setExtra: (id: IdCenario, patch: Partial<ExtraConfig>) => void;
  setComparar: (v: boolean) => void;
  setAba: (id: IdCenario) => void;
  aplicarCenario: (id: IdCenario, cenario: CenarioInput) => void;
  copiarCenario: (de: IdCenario, para: IdCenario) => void;
  carregarExemplo: () => void;
  importarShare: (payload: SharePayload) => void;
  resetar: () => void;
}

function clonar(c: CenarioInput): CenarioInput {
  return { ...c, extra: { ...c.extra } };
}

function num(v: unknown, padrao: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : padrao;
}

/** Saneia um cenário vindo de fora (localStorage ou link compartilhado). */
export function sanitizarCenario(raw: unknown, padrao: CenarioInput): CenarioInput {
  if (!raw || typeof raw !== "object") return clonar(padrao);
  const r = raw as Record<string, unknown>;
  const extraRaw = (r.extra && typeof r.extra === "object" ? r.extra : {}) as Record<
    string,
    unknown
  >;
  return {
    valorBem: Math.max(0, num(r.valorBem, padrao.valorBem)),
    entrada: Math.max(0, num(r.entrada, padrao.entrada)),
    taxa: Math.max(0, num(r.taxa, padrao.taxa)),
    periodoTaxa:
      r.periodoTaxa === "anual" || r.periodoTaxa === "mensal"
        ? r.periodoTaxa
        : padrao.periodoTaxa,
    prazoMeses: Math.min(
      PRAZO_MAXIMO,
      Math.max(1, Math.round(num(r.prazoMeses, padrao.prazoMeses)))
    ),
    sistema: r.sistema === "sac" || r.sistema === "price" ? r.sistema : padrao.sistema,
    custosFixos: Math.max(0, num(r.custosFixos, padrao.custosFixos)),
    extra: {
      ativo: extraRaw.ativo === true,
      valor: Math.max(0, num(extraRaw.valor, padrao.extra.valor)),
      cadaMeses: Math.min(
        PRAZO_MAXIMO,
        Math.max(1, Math.round(num(extraRaw.cadaMeses, padrao.extra.cadaMeses)))
      ),
      modo: extraRaw.modo === "parcela" ? "parcela" : "prazo",
    },
  };
}

function carregarPersistido(): Persistido {
  const base: Persistido = {
    a: clonar(CENARIO_PADRAO_A),
    b: clonar(CENARIO_PADRAO_B),
    comparar: false,
  };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return base;
    const data = JSON.parse(raw) as Record<string, unknown>;
    return {
      a: sanitizarCenario(data.a, CENARIO_PADRAO_A),
      b: sanitizarCenario(data.b, CENARIO_PADRAO_B),
      comparar: data.comparar === true,
    };
  } catch {
    return base;
  }
}

function persistir(estado: Persistido) {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ a: estado.a, b: estado.b, comparar: estado.comparar })
    );
  } catch {
    /* quota cheia / modo privado */
  }
}

export const useJurosForge = create<JurosForgeState>((set, get) => ({
  ...carregarPersistido(),
  aba: "a",

  setCenario: (id, patch) => {
    set({ [id]: { ...get()[id], ...patch } } as Partial<JurosForgeState>);
    persistir(get());
  },

  setExtra: (id, patch) => {
    const cenario = get()[id];
    set({
      [id]: { ...cenario, extra: { ...cenario.extra, ...patch } },
    } as Partial<JurosForgeState>);
    persistir(get());
  },

  setComparar: (v) => {
    set({ comparar: v, aba: v ? get().aba : "a" });
    persistir(get());
  },

  setAba: (id) => set({ aba: id }),

  aplicarCenario: (id, cenario) => {
    set({ [id]: clonar(cenario) } as Partial<JurosForgeState>);
    persistir(get());
  },

  copiarCenario: (de, para) => {
    set({ [para]: clonar(get()[de]) } as Partial<JurosForgeState>);
    persistir(get());
  },

  carregarExemplo: () => {
    set({
      a: clonar(CENARIO_PADRAO_A),
      b: clonar(CENARIO_PADRAO_B),
      comparar: true,
      aba: "a",
    });
    persistir(get());
  },

  importarShare: (payload) => {
    set({
      a: sanitizarCenario(payload.a, CENARIO_PADRAO_A),
      b: sanitizarCenario(payload.b, CENARIO_PADRAO_B),
      comparar: payload.comparar === true,
      aba: "a",
    });
    persistir(get());
  },

  resetar: () => {
    set({
      a: clonar(CENARIO_PADRAO_A),
      b: clonar(CENARIO_PADRAO_B),
      comparar: false,
      aba: "a",
    });
    persistir(get());
  },
}));
