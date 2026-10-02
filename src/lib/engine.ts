// ─────────────────────────────────────────────────────────────────────────────
// JurosForge — motor financeiro puro (sem React, 100% testável)
//
// Sistemas de amortização:
//   • Price: parcela fixa  PMT = PV·i / (1 − (1+i)^−n)
//   • SAC:   amortização constante PV/n, juros sobre o saldo devedor
//
// Amortização extra (aporte a cada N meses):
//   • modo "prazo":   mantém a parcela/amortização e o contrato termina antes
//   • modo "parcela": recalcula parcela (Price) ou amortização (SAC) com o
//                     saldo restante e os meses que faltam do contrato
//
// CET (Custo Efetivo Total): taxa mensal r que zera o VPL do fluxo
//   +valorFinanciado no mês 0; −(parcela + extra + custosFixos) em cada mês t.
//   Resolvido por bisseção no intervalo [0, 20% a.m.] com precisão 1e-7.
// ─────────────────────────────────────────────────────────────────────────────

export type Sistema = "price" | "sac";
export type PeriodoTaxa = "mensal" | "anual";
export type ModoExtra = "prazo" | "parcela";

export interface ExtraConfig {
  ativo: boolean;
  /** Valor de cada aporte extra, em R$. */
  valor: number;
  /** Aplica o aporte a cada N meses (1 = todo mês). */
  cadaMeses: number;
  /** "prazo": mantém a parcela e quita antes · "parcela": recalcula a parcela. */
  modo: ModoExtra;
}

export interface CenarioInput {
  /** Valor do bem ou do empréstimo, em R$. */
  valorBem: number;
  /** Entrada em R$ (0 para empréstimo sem entrada). */
  entrada: number;
  /** Taxa de juros em % no período indicado (ex.: 1 = 1%). */
  taxa: number;
  periodoTaxa: PeriodoTaxa;
  /** Prazo contratado, em meses (1–480). */
  prazoMeses: number;
  sistema: Sistema;
  /** Custos fixos mensais (seguro + taxa administrativa), em R$. */
  custosFixos: number;
  extra: ExtraConfig;
}

export interface LinhaTabela {
  mes: number;
  parcela: number;
  juros: number;
  amortizacao: number;
  extra: number;
  saldo: number;
}

export interface AnoAgregado {
  ano: number;
  linhas: LinhaTabela[];
  parcelas: number;
  juros: number;
  amortizacao: number;
  extra: number;
  saldoFinal: number;
  temExtra: boolean;
}

export interface ResultadoSimulacao {
  valorFinanciado: number;
  /** Taxa mensal efetiva usada na simulação (decimal). */
  taxaMensal: number;
  /** Equivalente anual composto da taxa mensal (decimal). */
  taxaAnual: number;
  parcelaInicial: number;
  parcelaFinal: number;
  /** Meses efetivamente pagos (≤ prazo contratado quando há aportes extras). */
  prazoEfetivo: number;
  tabela: LinhaTabela[];
  totalParcelas: number;
  totalJuros: number;
  totalExtra: number;
  totalCustosFixos: number;
  /** Tudo que sai do bolso: parcelas + aportes extras + custos fixos. */
  totalPago: number;
  /** CET mensal (decimal). */
  cetMensal: number;
  /** CET anual composto (decimal): (1+r)^12 − 1. */
  cetAnual: number;
}

export const PRAZO_MAXIMO = 480;
/** Teto da bisseção do CET: 20% a.m. */
export const CET_MAX_MENSAL = 0.2;
const EPS = 1e-6;

/** Conversão composta anual → mensal: (1+ia) = (1+im)^12. */
export function anualParaMensal(taxaAnual: number): number {
  return Math.pow(1 + taxaAnual, 1 / 12) - 1;
}

/** Conversão composta mensal → anual: ia = (1+im)^12 − 1. */
export function mensalParaAnual(taxaMensal: number): number {
  return Math.pow(1 + taxaMensal, 12) - 1;
}

/** Taxa mensal (decimal) a partir do campo taxa/período do cenário. */
export function taxaMensalDoCenario(c: Pick<CenarioInput, "taxa" | "periodoTaxa">): number {
  const t = c.taxa / 100;
  return c.periodoTaxa === "anual" ? anualParaMensal(t) : t;
}

/** Parcela fixa do sistema Price: PMT = PV·i / (1 − (1+i)^−n). */
export function pmtPrice(pv: number, i: number, n: number): number {
  if (n <= 0 || pv <= 0) return 0;
  if (i === 0) return pv / n;
  return (pv * i) / (1 - Math.pow(1 + i, -n));
}

/**
 * CET mensal por bisseção: taxa r que zera o VPL do fluxo
 * (+valorFinanciado no mês 0; −pagamentos[t−1] no mês t).
 * Intervalo [0, CET_MAX_MENSAL], precisão 1e-7.
 */
export function calcularCET(valorFinanciado: number, pagamentos: number[]): number {
  if (!Number.isFinite(valorFinanciado) || valorFinanciado <= 0) return 0;
  if (pagamentos.length === 0) return 0;
  // Fluxo degenerado (NaN/Infinity) → CET indefinido; devolve 0 em vez de
  // deixar a bisseção convergir para o teto e exibir um custo falso.
  if (!pagamentos.every((p) => Number.isFinite(p))) return 0;

  const vpl = (r: number): number => {
    let acc = valorFinanciado;
    const fator = 1 + r;
    let desconto = 1;
    for (let t = 0; t < pagamentos.length; t++) {
      desconto *= fator;
      acc -= pagamentos[t] / desconto;
    }
    return acc;
  };

  const emZero = vpl(0);
  // Pagamentos somam menos (ou o mesmo) que o principal → custo efetivo nulo.
  if (emZero >= -1e-9) return 0;
  // CET acima do teto suportado → devolve o teto (a validação impede chegar aqui).
  if (vpl(CET_MAX_MENSAL) <= 0) return CET_MAX_MENSAL;

  let lo = 0;
  let hi = CET_MAX_MENSAL;
  while (hi - lo > 1e-7) {
    const meio = (lo + hi) / 2;
    if (vpl(meio) > 0) hi = meio;
    else lo = meio;
  }
  return (lo + hi) / 2;
}

/** Roda a simulação completa de um cenário: tabela mês a mês, totais e CET. */
export function simular(input: CenarioInput): ResultadoSimulacao {
  const valorFinanciado = Math.max(0, input.valorBem - input.entrada);
  const i = taxaMensalDoCenario(input);
  const n = Math.max(1, Math.floor(input.prazoMeses));
  const custos = Math.max(0, input.custosFixos);
  const extraAtivo = input.extra.ativo && input.extra.valor > 0 && input.extra.cadaMeses >= 1;
  const cadaMeses = Math.max(1, Math.floor(input.extra.cadaMeses));

  const tabela: LinhaTabela[] = [];
  let saldo = valorFinanciado;
  let pmt = input.sistema === "price" ? pmtPrice(valorFinanciado, i, n) : 0;
  let amortConst = input.sistema === "sac" ? valorFinanciado / n : 0;

  let mes = 0;
  while (saldo > EPS && mes < n) {
    mes += 1;
    const juros = saldo * i;
    const amortizacao =
      input.sistema === "price"
        ? Math.min(Math.max(pmt - juros, 0), saldo)
        : Math.min(amortConst, saldo);
    const parcela = juros + amortizacao;
    saldo -= amortizacao;

    let extraPago = 0;
    if (extraAtivo && saldo > EPS && mes % cadaMeses === 0) {
      extraPago = Math.min(input.extra.valor, saldo);
      saldo -= extraPago;
      if (input.extra.modo === "parcela" && saldo > EPS && mes < n) {
        const restantes = n - mes;
        if (input.sistema === "price") pmt = pmtPrice(saldo, i, restantes);
        else amortConst = saldo / restantes;
      }
    }
    if (saldo < EPS) saldo = 0;
    tabela.push({ mes, parcela, juros, amortizacao, extra: extraPago, saldo });
  }

  const prazoEfetivo = tabela.length;
  let totalParcelas = 0;
  let totalJuros = 0;
  let totalExtra = 0;
  for (const linha of tabela) {
    totalParcelas += linha.parcela;
    totalJuros += linha.juros;
    totalExtra += linha.extra;
  }
  const totalCustosFixos = custos * prazoEfetivo;
  const totalPago = totalParcelas + totalExtra + totalCustosFixos;

  // Fluxo do CET: tudo que o tomador desembolsa a cada mês.
  const pagamentos = tabela.map((linha) => linha.parcela + linha.extra + custos);
  const cetMensal = calcularCET(valorFinanciado, pagamentos);

  return {
    valorFinanciado,
    taxaMensal: i,
    taxaAnual: mensalParaAnual(i),
    parcelaInicial: tabela[0]?.parcela ?? 0,
    parcelaFinal: tabela[tabela.length - 1]?.parcela ?? 0,
    prazoEfetivo,
    tabela,
    totalParcelas,
    totalJuros,
    totalExtra,
    totalCustosFixos,
    totalPago,
    cetMensal,
    cetAnual: mensalParaAnual(cetMensal),
  };
}

/** Agrupa a tabela mês a mês em blocos de 12 meses (ano 1, ano 2, …). */
export function agregarPorAno(tabela: LinhaTabela[]): AnoAgregado[] {
  const anos: AnoAgregado[] = [];
  for (const linha of tabela) {
    const ano = Math.ceil(linha.mes / 12);
    let agg = anos[anos.length - 1];
    if (!agg || agg.ano !== ano) {
      agg = {
        ano,
        linhas: [],
        parcelas: 0,
        juros: 0,
        amortizacao: 0,
        extra: 0,
        saldoFinal: linha.saldo,
        temExtra: false,
      };
      anos.push(agg);
    }
    agg.linhas.push(linha);
    agg.parcelas += linha.parcela;
    agg.juros += linha.juros;
    agg.amortizacao += linha.amortizacao;
    agg.extra += linha.extra;
    agg.saldoFinal = linha.saldo;
    if (linha.extra > 0) agg.temExtra = true;
  }
  return anos;
}

// ── Validação ────────────────────────────────────────────────────────────────

export type CampoErro =
  | "valorBem"
  | "entrada"
  | "taxa"
  | "prazoMeses"
  | "custosFixos"
  | "extraValor"
  | "extraCadaMeses";

export type ErrosCenario = Partial<Record<CampoErro, string>>;

export function validarCenario(c: CenarioInput): ErrosCenario {
  const erros: ErrosCenario = {};
  if (!(c.valorBem > 0)) erros.valorBem = "Informe um valor maior que zero.";
  if (c.entrada < 0) erros.entrada = "A entrada não pode ser negativa.";
  else if (c.valorBem > 0 && c.entrada >= c.valorBem)
    erros.entrada = "A entrada precisa ser menor que o valor do bem.";
  if (c.taxa < 0) erros.taxa = "A taxa não pode ser negativa.";
  else if (taxaMensalDoCenario(c) >= CET_MAX_MENSAL)
    erros.taxa = "Taxa equivalente a 20% a.m. ou mais não é suportada.";
  if (!Number.isInteger(c.prazoMeses) || c.prazoMeses < 1 || c.prazoMeses > PRAZO_MAXIMO)
    erros.prazoMeses = "Use um número inteiro entre 1 e 480 meses.";
  if (c.custosFixos < 0) erros.custosFixos = "Os custos não podem ser negativos.";
  if (c.extra.ativo) {
    if (!(c.extra.valor > 0)) erros.extraValor = "Informe o valor do aporte extra.";
    if (
      !Number.isInteger(c.extra.cadaMeses) ||
      c.extra.cadaMeses < 1 ||
      c.extra.cadaMeses > c.prazoMeses
    )
      erros.extraCadaMeses = "Use um intervalo entre 1 e o prazo em meses.";
  }
  return erros;
}

export function temErros(erros: ErrosCenario): boolean {
  return Object.keys(erros).length > 0;
}
