import { describe, it, expect } from "vitest";
import {
  anualParaMensal,
  mensalParaAnual,
  pmtPrice,
  simular,
  calcularCET,
  validarCenario,
  temErros,
  type CenarioInput,
} from "../engine";

const BASE: CenarioInput = {
  valorBem: 100_000,
  entrada: 0,
  taxa: 1,
  periodoTaxa: "mensal",
  prazoMeses: 360,
  sistema: "price",
  custosFixos: 0,
  extra: { ativo: false, valor: 0, cadaMeses: 12, modo: "prazo" },
};

describe("Sistema Price", () => {
  it("PV=100.000, i=1% a.m., n=360 → PMT ≈ 1.028,61 (tol 0,05)", () => {
    expect(Math.abs(pmtPrice(100_000, 0.01, 360) - 1028.61)).toBeLessThan(0.05);
    const r = simular(BASE);
    expect(Math.abs(r.parcelaInicial - 1028.61)).toBeLessThan(0.05);
    // Parcela fixa do início ao fim (sem amortização extra).
    expect(Math.abs(r.parcelaFinal - r.parcelaInicial)).toBeLessThan(0.01);
  });

  it("saldo final ≈ 0 (tol 0,01) e prazo efetivo = contratado", () => {
    const r = simular(BASE);
    expect(r.prazoEfetivo).toBe(360);
    expect(Math.abs(r.tabela[r.tabela.length - 1].saldo)).toBeLessThan(0.01);
  });
});

describe("Sistema SAC", () => {
  it("PV=100.000, i=1% a.m., n=360 → 1ª parcela = 1.277,78 (tol 0,02)", () => {
    const r = simular({ ...BASE, sistema: "sac" });
    expect(Math.abs(r.parcelaInicial - 1277.78)).toBeLessThan(0.02);
    // Amortização constante: PV/n = 277,78 em todos os meses.
    expect(Math.abs(r.tabela[0].amortizacao - 277.78)).toBeLessThan(0.01);
    expect(Math.abs(r.tabela[199].amortizacao - 277.78)).toBeLessThan(0.01);
  });

  it("saldo final ≈ 0 (tol 0,01) e parcela decrescente", () => {
    const r = simular({ ...BASE, sistema: "sac" });
    expect(Math.abs(r.tabela[r.tabela.length - 1].saldo)).toBeLessThan(0.01);
    expect(r.parcelaFinal).toBeLessThan(r.parcelaInicial);
    // SAC paga menos juros totais que Price nas mesmas condições.
    expect(r.totalJuros).toBeLessThan(simular(BASE).totalJuros);
  });
});

describe("Conversão de taxas (composta)", () => {
  it("12,6825% a.a. → 1% a.m. (tol 1e-6)", () => {
    expect(Math.abs(anualParaMensal(0.126825) - 0.01)).toBeLessThan(1e-6);
    expect(Math.abs(mensalParaAnual(0.01) - 0.126825)).toBeLessThan(1e-6);
  });

  it("cenário com taxa anual usa a mensal equivalente", () => {
    const r = simular({ ...BASE, taxa: 12.6825, periodoTaxa: "anual" });
    expect(Math.abs(r.taxaMensal - 0.01)).toBeLessThan(1e-6);
    expect(Math.abs(r.parcelaInicial - 1028.61)).toBeLessThan(0.05);
  });
});

describe("CET por bisseção", () => {
  it("sem custos fixos, CET mensal ≈ taxa nominal (tol 1e-4) — Price e SAC", () => {
    const price = simular(BASE);
    expect(Math.abs(price.cetMensal - 0.01)).toBeLessThan(1e-4);
    const sac = simular({ ...BASE, sistema: "sac" });
    expect(Math.abs(sac.cetMensal - 0.01)).toBeLessThan(1e-4);
  });

  it("custos fixos elevam o CET acima da taxa nominal", () => {
    const r = simular({ ...BASE, custosFixos: 50 });
    expect(r.cetMensal).toBeGreaterThan(0.01);
    expect(r.cetAnual).toBeGreaterThan(r.taxaAnual);
  });

  it("CET anual = (1+r)^12 − 1", () => {
    const r = simular({ ...BASE, custosFixos: 50 });
    expect(Math.abs(r.cetAnual - (Math.pow(1 + r.cetMensal, 12) - 1))).toBeLessThan(1e-9);
  });
});

describe("Amortização extra", () => {
  it("modo 'reduzir prazo' encurta o prazo efetivo e mantém a parcela", () => {
    const sem = simular(BASE);
    const com = simular({
      ...BASE,
      extra: { ativo: true, valor: 500, cadaMeses: 1, modo: "prazo" },
    });
    expect(com.prazoEfetivo).toBeLessThan(360);
    expect(Math.abs(com.tabela[com.tabela.length - 1].saldo)).toBeLessThan(0.01);
    expect(com.totalJuros).toBeLessThan(sem.totalJuros);
    // Parcela regular continua a mesma (exceto o acerto do último mês).
    expect(Math.abs(com.tabela[5].parcela - 1028.61)).toBeLessThan(0.05);
  });

  it("modo 'reduzir parcela' mantém o prazo e derruba a parcela", () => {
    const r = simular({
      ...BASE,
      extra: { ativo: true, valor: 1000, cadaMeses: 12, modo: "parcela" },
    });
    expect(r.prazoEfetivo).toBe(360);
    expect(Math.abs(r.tabela[r.tabela.length - 1].saldo)).toBeLessThan(0.01);
    // Após o aporte do mês 12, a parcela do mês 13 cai.
    expect(r.tabela[12].parcela).toBeLessThan(r.tabela[11].parcela - 1);
    expect(r.parcelaFinal).toBeLessThan(r.parcelaInicial);
  });

  it("aporte maior que o saldo restante quita antes mesmo no modo 'parcela'", () => {
    const r = simular({
      ...BASE,
      extra: { ativo: true, valor: 5000, cadaMeses: 12, modo: "parcela" },
    });
    // 30 aportes de R$ 5.000 superam o principal → o saldo zera antes do mês 360
    // (o aporte é limitado ao saldo devedor; nunca se paga mais do que se deve).
    expect(r.prazoEfetivo).toBeLessThan(360);
    expect(Math.abs(r.tabela[r.tabela.length - 1].saldo)).toBeLessThan(0.01);
  });

  it("aporte registrado na coluna extra do mês correto", () => {
    const r = simular({
      ...BASE,
      extra: { ativo: true, valor: 5000, cadaMeses: 12, modo: "prazo" },
    });
    expect(r.tabela[11].extra).toBeCloseTo(5000, 6);
    expect(r.tabela[10].extra).toBe(0);
    expect(r.totalExtra).toBeGreaterThan(0);
  });
});

describe("Entrada, custos e casos-limite", () => {
  it("entrada reduz o valor financiado", () => {
    const r = simular({ ...BASE, entrada: 20_000 });
    expect(r.valorFinanciado).toBe(80_000);
    expect(Math.abs(r.parcelaInicial - 1028.6126 * 0.8)).toBeLessThan(0.05);
  });

  it("taxa zero: parcela = PV/n e juros totais nulos", () => {
    const r = simular({ ...BASE, taxa: 0 });
    expect(Math.abs(r.parcelaInicial - 100_000 / 360)).toBeLessThan(0.01);
    expect(r.totalJuros).toBeLessThan(1e-6);
    expect(r.cetMensal).toBe(0);
  });

  it("custos fixos somam custosFixos × prazo efetivo no total pago", () => {
    const r = simular({ ...BASE, custosFixos: 120 });
    expect(Math.abs(r.totalCustosFixos - 120 * r.prazoEfetivo)).toBeLessThan(1e-9);
    expect(Math.abs(r.totalPago - (r.totalParcelas + r.totalExtra + r.totalCustosFixos))).toBeLessThan(1e-9);
  });

  it("validação aponta entrada ≥ valor e prazo fora de 1–480", () => {
    expect(temErros(validarCenario({ ...BASE, entrada: 100_000 }))).toBe(true);
    expect(temErros(validarCenario({ ...BASE, prazoMeses: 481 }))).toBe(true);
    expect(temErros(validarCenario({ ...BASE, prazoMeses: 0 }))).toBe(true);
    expect(temErros(validarCenario(BASE))).toBe(false);
  });

  it("prazo n=1 quita em um mês, sem laço infinito (Price e SAC)", () => {
    const price = simular({ ...BASE, prazoMeses: 1 });
    expect(price.prazoEfetivo).toBe(1);
    expect(Math.abs(price.tabela[0].saldo)).toBeLessThan(0.01);
    const sac = simular({ ...BASE, prazoMeses: 1, sistema: "sac" });
    expect(sac.prazoEfetivo).toBe(1);
    expect(Math.abs(sac.tabela[0].saldo)).toBeLessThan(0.01);
  });

  it("amortização extra em modo 'parcela' nunca gera saldo negativo", () => {
    const r = simular({
      ...BASE,
      prazoMeses: 12,
      extra: { ativo: true, valor: 2000, cadaMeses: 1, modo: "parcela" },
    });
    expect(r.tabela.every((l) => l.saldo >= -1e-6)).toBe(true);
    expect(Math.abs(r.tabela[r.tabela.length - 1].saldo)).toBeLessThan(0.01);
  });
});

describe("CET — robustez do fluxo (guardas)", () => {
  it("fluxo com valor não-finito ou vazio devolve CET 0, sem travar", () => {
    expect(calcularCET(0, [100, 100])).toBe(0);
    expect(calcularCET(1000, [])).toBe(0);
    // Um pagamento NaN/Infinity não pode virar o teto de 20% a.m. silenciosamente.
    expect(calcularCET(1000, [100, NaN, 100])).toBe(0);
    expect(calcularCET(1000, [100, Infinity])).toBe(0);
  });

  it("fluxo extremo (pagamentos >> principal) satura no teto sem laço infinito", () => {
    const inicio = Date.now();
    expect(calcularCET(1000, Array(24).fill(9999))).toBe(0.2);
    expect(Date.now() - inicio).toBeLessThan(100);
  });
});
