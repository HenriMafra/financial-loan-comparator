import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Check, Minus, Scale, Trophy } from "lucide-react";
import clsx from "clsx";
import type { CenarioInput, ResultadoSimulacao } from "../lib/engine";
import { money, pct } from "../lib/format";

const rotulo = (c: CenarioInput) => (c.sistema === "price" ? "Price" : "SAC");

function menor(va: number, vb: number): "a" | "b" | null {
  if (Math.abs(va - vb) < 0.005) return null;
  return va < vb ? "a" : "b";
}

interface LinhaComparacao {
  label: string;
  a: string;
  b: string;
  melhor: "a" | "b" | null;
  destaque?: boolean;
}

export function CompareView({
  ca,
  cb,
  ra,
  rb,
}: {
  ca: CenarioInput;
  cb: CenarioInput;
  ra: ResultadoSimulacao;
  rb: ResultadoSimulacao;
}) {
  // Deltas sempre na direção B − A.
  const dTotal = rb.totalPago - ra.totalPago;
  const dJuros = rb.totalJuros - ra.totalJuros;
  const dPrazo = rb.prazoEfetivo - ra.prazoEfetivo;
  const dParcela = rb.parcelaInicial - ra.parcelaInicial;

  const empate = Math.abs(dTotal) < 1;
  const vencedor: "a" | "b" | null = empate ? null : dTotal < 0 ? "b" : "a";

  // ── Veredicto textual ──────────────────────────────────────────────────────
  let titulo: string;
  let corpo: string[];
  if (empate || !vencedor) {
    titulo = "Empate técnico";
    corpo = [
      "Os dois cenários terminam com um total pago praticamente idêntico (diferença menor que R$ 1,00).",
      "Escolha pelo fluxo de caixa: parcela fixa e previsível (Price) ou decrescente, começando mais pesada (SAC).",
    ];
  } else {
    const v = vencedor === "a" ? ra : rb;
    const p = vencedor === "a" ? rb : ra;
    const nomeV = vencedor === "a" ? `Cenário A (${rotulo(ca)})` : `Cenário B (${rotulo(cb)})`;
    const nomeP = vencedor === "a" ? `Cenário B (${rotulo(cb)})` : `Cenário A (${rotulo(ca)})`;
    const economia = p.totalPago - v.totalPago;

    titulo = `${nomeV} vence esta comparação`;
    corpo = [
      `Total pago de ${money(v.totalPago)} contra ${money(p.totalPago)} do ${nomeP} — economia de ${money(economia)} (${pct(economia / p.totalPago)}).`,
    ];
    const difJuros = p.totalJuros - v.totalJuros;
    if (difJuros >= 1) corpo.push(`São ${money(difJuros)} a menos só em juros.`);
    else if (difJuros <= -1)
      corpo.push(`Mesmo pagando ${money(-difJuros)} a mais em juros, o custo total compensa.`);
    const difPrazo = p.prazoEfetivo - v.prazoEfetivo;
    if (difPrazo > 0)
      corpo.push(`A dívida é quitada ${difPrazo} ${difPrazo === 1 ? "mês" : "meses"} antes.`);
    else if (difPrazo < 0)
      corpo.push(
        `Em compensação, a quitação demora ${-difPrazo} ${-difPrazo === 1 ? "mês" : "meses"} a mais.`
      );
    const difParcela = v.parcelaInicial - p.parcelaInicial;
    if (difParcela > 0.005)
      corpo.push(
        `O preço disso: a parcela inicial é ${money(difParcela)} maior — exige mais folga no orçamento no começo.`
      );
    else if (difParcela < -0.005)
      corpo.push(`E ainda começa com uma parcela ${money(-difParcela)} menor.`);
  }

  // ── Cards de diferença (Δ = B − A) ─────────────────────────────────────────
  const fmtMeses = (v: number) => `${Math.abs(v)} ${Math.abs(v) === 1 ? "mês" : "meses"}`;
  const deltas: { label: string; diff: number; texto: string }[] = [
    { label: "Δ total pago", diff: dTotal, texto: money(Math.abs(dTotal)) },
    { label: "Δ total de juros", diff: dJuros, texto: money(Math.abs(dJuros)) },
    { label: "Δ prazo efetivo", diff: dPrazo, texto: fmtMeses(dPrazo) },
    { label: "Δ parcela inicial", diff: dParcela, texto: money(Math.abs(dParcela)) },
  ];

  // ── Grade lado a lado ──────────────────────────────────────────────────────
  const linhas: LinhaComparacao[] = [
    {
      label: "Parcela inicial",
      a: money(ra.parcelaInicial),
      b: money(rb.parcelaInicial),
      melhor: menor(ra.parcelaInicial, rb.parcelaInicial),
      destaque: true,
    },
    {
      label: "Parcela final",
      a: money(ra.parcelaFinal),
      b: money(rb.parcelaFinal),
      melhor: menor(ra.parcelaFinal, rb.parcelaFinal),
    },
    {
      label: "Total pago",
      a: money(ra.totalPago),
      b: money(rb.totalPago),
      melhor: menor(ra.totalPago, rb.totalPago),
      destaque: true,
    },
    {
      label: "Total de juros",
      a: money(ra.totalJuros),
      b: money(rb.totalJuros),
      melhor: menor(ra.totalJuros, rb.totalJuros),
      destaque: true,
    },
    {
      label: "Custos fixos totais",
      a: money(ra.totalCustosFixos),
      b: money(rb.totalCustosFixos),
      melhor: menor(ra.totalCustosFixos, rb.totalCustosFixos),
    },
    {
      label: "CET",
      a: `${pct(ra.cetMensal)} a.m. · ${pct(ra.cetAnual)} a.a.`,
      b: `${pct(rb.cetMensal)} a.m. · ${pct(rb.cetAnual)} a.a.`,
      melhor: menor(ra.cetAnual, rb.cetAnual),
    },
    {
      label: "Prazo efetivo",
      a: `${ra.prazoEfetivo} meses`,
      b: `${rb.prazoEfetivo} meses`,
      melhor: menor(ra.prazoEfetivo, rb.prazoEfetivo),
      destaque: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* veredicto */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={clsx(
          "card border-l-4 p-4 sm:p-5",
          vencedor === "a" && "border-l-brand-400",
          vencedor === "b" && "border-l-neon-cyan",
          !vencedor && "border-l-slate-500"
        )}
      >
        <div className="flex items-center gap-2">
          {vencedor ? (
            <Trophy
              size={18}
              className={vencedor === "a" ? "text-brand-400" : "text-neon-cyan"}
            />
          ) : (
            <Scale size={18} className="text-slate-400" />
          )}
          <h3 className="text-base font-extrabold text-white">{titulo}</h3>
        </div>
        <ul className="mt-2 space-y-1">
          {corpo.map((frase, i) => (
            <li key={i} className="text-sm leading-relaxed text-slate-300">
              {frase}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* deltas */}
      <div>
        <p className="mb-2 text-[11px] text-slate-500">
          Diferenças do <span className="font-semibold text-neon-cyan">Cenário B</span> em relação
          ao <span className="font-semibold text-brand-400">Cenário A</span> (Δ = B − A); verde =
          menor/melhor para o B.
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {deltas.map((d, idx) => {
            const zero = Math.abs(d.diff) < 0.005;
            const Icon = zero ? Minus : d.diff < 0 ? ArrowDown : ArrowUp;
            const cor = zero ? "text-slate-400" : d.diff < 0 ? "text-emerald-400" : "text-rose-400";
            return (
              <motion.div
                key={d.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="card p-4"
              >
                <span className="label">{d.label}</span>
                <p className={clsx("mt-2 flex items-center gap-1 text-lg font-extrabold sm:text-xl", cor)}>
                  <Icon size={18} />
                  {zero ? "igual" : d.texto}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* lado a lado completo */}
      <div className="card overflow-x-auto">
        <div className="min-w-[480px]">
          <div className="grid grid-cols-[1.1fr_1fr_1fr] border-b border-white/5 px-4 py-3 text-xs font-bold">
            <span className="text-slate-500">Métrica</span>
            <span className="flex items-center gap-1.5 text-brand-300">
              <span className="h-2 w-2 rounded-full bg-brand-400" />
              Cenário A · {rotulo(ca)}
            </span>
            <span className="flex items-center gap-1.5 text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-neon-cyan" />
              Cenário B · {rotulo(cb)}
            </span>
          </div>
          {linhas.map((linha) => (
            <div
              key={linha.label}
              className={clsx(
                "grid grid-cols-[1.1fr_1fr_1fr] items-center border-b border-white/[0.03] px-4 py-2.5 last:border-b-0",
                linha.destaque ? "text-sm" : "text-xs"
              )}
            >
              <span className="font-medium text-slate-400">{linha.label}</span>
              <span
                className={clsx(
                  "font-mono",
                  linha.melhor === "a" ? "font-bold text-white" : "text-slate-300"
                )}
              >
                {linha.melhor === "a" && (
                  <Check size={12} className="mr-1 inline text-emerald-400" aria-label="melhor" />
                )}
                {linha.a}
              </span>
              <span
                className={clsx(
                  "font-mono",
                  linha.melhor === "b" ? "font-bold text-white" : "text-slate-300"
                )}
              >
                {linha.melhor === "b" && (
                  <Check size={12} className="mr-1 inline text-emerald-400" aria-label="melhor" />
                )}
                {linha.b}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
