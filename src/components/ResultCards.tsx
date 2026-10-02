import { motion } from "framer-motion";
import {
  CalendarCheck,
  Coins,
  Gauge,
  Landmark,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ResultadoSimulacao } from "../lib/engine";
import { money, pct, prazoHumano } from "../lib/format";

interface CardInfo {
  label: string;
  valor: string;
  sub: string;
  icon: LucideIcon;
  cor: string;
}

export function ResultCards({
  res,
  prazoContratado,
}: {
  res: ResultadoSimulacao;
  prazoContratado: number;
}) {
  const quitouAntes = res.prazoEfetivo < prazoContratado;
  const parcelaVaria = Math.abs(res.parcelaFinal - res.parcelaInicial) > 0.005;

  const cards: CardInfo[] = [
    {
      label: "Parcela inicial",
      valor: money(res.parcelaInicial),
      sub: parcelaVaria ? `última parcela: ${money(res.parcelaFinal)}` : "fixa até a quitação",
      icon: Wallet,
      cor: "text-brand-400",
    },
    {
      label: "Total pago",
      valor: money(res.totalPago),
      sub: "parcelas + aportes extras + custos fixos",
      icon: Coins,
      cor: "text-brand-400",
    },
    {
      label: "Total de juros",
      valor: money(res.totalJuros),
      sub:
        res.valorFinanciado > 0
          ? `${pct(res.totalJuros / res.valorFinanciado)} do valor financiado`
          : "—",
      icon: TrendingUp,
      cor: "text-rose-400",
    },
    {
      label: "CET efetivo",
      valor: `${pct(res.cetMensal)} a.m.`,
      sub: `${pct(res.cetAnual)} a.a. — inclui custos fixos`,
      icon: Gauge,
      cor: "text-neon-cyan",
    },
    {
      label: "Quitação",
      valor: `${res.prazoEfetivo} meses`,
      sub: quitouAntes
        ? `${prazoHumano(res.prazoEfetivo)} · ${prazoContratado - res.prazoEfetivo} meses antes do contratado`
        : prazoHumano(res.prazoEfetivo),
      icon: CalendarCheck,
      cor: "text-neon-lime",
    },
    {
      label: "Valor financiado",
      valor: money(res.valorFinanciado),
      sub: `custos fixos somam ${money(res.totalCustosFixos)}`,
      icon: Landmark,
      cor: "text-slate-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.3 }}
            className="card p-4"
          >
            <div className="flex items-center gap-2">
              <Icon size={15} className={c.cor} />
              <span className="label">{c.label}</span>
            </div>
            <p className="mt-2 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              {c.valor}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{c.sub}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
