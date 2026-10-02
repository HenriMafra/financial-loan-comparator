import type { CenarioInput } from "../lib/engine";

/** Cenário padrão A: imóvel financiado pela tabela Price. */
export const CENARIO_PADRAO_A: CenarioInput = {
  valorBem: 400_000,
  entrada: 80_000,
  taxa: 10.49,
  periodoTaxa: "anual",
  prazoMeses: 360,
  sistema: "price",
  custosFixos: 120,
  extra: { ativo: false, valor: 5000, cadaMeses: 12, modo: "prazo" },
};

/** Cenário padrão B: o mesmo imóvel, agora em SAC — comparação clássica. */
export const CENARIO_PADRAO_B: CenarioInput = {
  ...CENARIO_PADRAO_A,
  sistema: "sac",
  extra: { ...CENARIO_PADRAO_A.extra },
};

export interface Preset {
  id: string;
  nome: string;
  descricao: string;
  cenario: CenarioInput;
}

export const PRESETS: Preset[] = [
  {
    id: "imovel-price",
    nome: "Imóvel · Price",
    descricao: "R$ 400 mil, 20% de entrada, 10,49% a.a., 360 meses, custos de R$ 120/mês",
    cenario: CENARIO_PADRAO_A,
  },
  {
    id: "imovel-sac",
    nome: "Imóvel · SAC",
    descricao: "R$ 400 mil, 20% de entrada, 10,49% a.a., 360 meses, custos de R$ 120/mês",
    cenario: CENARIO_PADRAO_B,
  },
  {
    id: "carro",
    nome: "Carro",
    descricao: "R$ 90 mil, entrada de R$ 20 mil, 1,49% a.m., 48 meses, custos de R$ 60/mês",
    cenario: {
      valorBem: 90_000,
      entrada: 20_000,
      taxa: 1.49,
      periodoTaxa: "mensal",
      prazoMeses: 48,
      sistema: "price",
      custosFixos: 60,
      extra: { ativo: false, valor: 1000, cadaMeses: 6, modo: "prazo" },
    },
  },
  {
    id: "pessoal",
    nome: "Empréstimo pessoal",
    descricao: "R$ 20 mil, sem entrada, 3,20% a.m., 24 meses, sem custos fixos",
    cenario: {
      valorBem: 20_000,
      entrada: 0,
      taxa: 3.2,
      periodoTaxa: "mensal",
      prazoMeses: 24,
      sistema: "price",
      custosFixos: 0,
      extra: { ativo: false, valor: 500, cadaMeses: 3, modo: "prazo" },
    },
  },
  {
    id: "consignado",
    nome: "Consignado",
    descricao: "R$ 15 mil, sem entrada, 1,80% a.m., 36 meses, sem custos fixos",
    cenario: {
      valorBem: 15_000,
      entrada: 0,
      taxa: 1.8,
      periodoTaxa: "mensal",
      prazoMeses: 36,
      sistema: "price",
      custosFixos: 0,
      extra: { ativo: false, valor: 500, cadaMeses: 6, modo: "prazo" },
    },
  },
];
