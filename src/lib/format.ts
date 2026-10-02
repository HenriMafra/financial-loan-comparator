// Formatação pt-BR usada em toda a interface.

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const BRL_INTEIRO = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** "R$ 1.028,61" */
export function money(valor: number): string {
  return BRL.format(valor);
}

/** "R$ 1.029" — para chips e resumos compactos. */
export function money0(valor: number): string {
  return BRL_INTEIRO.format(valor);
}

function decBR(n: number, casas: number): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  });
}

/** "R$ 320 mil" · "R$ 1,2 mi" — para eixos de gráfico. */
export function moneyCompact(valor: number): string {
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) return `R$ ${decBR(valor / 1_000_000, 1)} mi`;
  if (abs >= 1_000) return `R$ ${decBR(valor / 1_000, 0)} mil`;
  return `R$ ${decBR(valor, 0)}`;
}

/** Formata taxa decimal como percentual: pct(0.1049) → "10,49%". */
export function pct(decimal: number, casas = 2): string {
  return `${(decimal * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

/** "27 anos e 2 meses" · "9 meses" · "1 ano" */
export function prazoHumano(meses: number): string {
  if (meses < 12) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const parteAnos = `${anos} ${anos === 1 ? "ano" : "anos"}`;
  if (resto === 0) return parteAnos;
  return `${parteAnos} e ${resto} ${resto === 1 ? "mês" : "meses"}`;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
