import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Zap } from "lucide-react";
import clsx from "clsx";
import { agregarPorAno, type ResultadoSimulacao } from "../lib/engine";
import { money, money0 } from "../lib/format";

/** Tabela completa mês a mês, agrupada por ano em accordion. */
export function AmortTable({ res }: { res: ResultadoSimulacao }) {
  const anos = useMemo(() => agregarPorAno(res.tabela), [res]);
  const [abertos, setAbertos] = useState<Set<number>>(() => new Set([1]));

  function alternar(ano: number) {
    setAbertos((prev) => {
      const novo = new Set(prev);
      if (novo.has(ano)) novo.delete(ano);
      else novo.add(ano);
      return novo;
    });
  }

  if (anos.length === 0) return null;

  return (
    <div className="space-y-2">
      {anos.map((ano) => {
        const aberto = abertos.has(ano.ano);
        return (
          <div
            key={ano.ano}
            className="overflow-hidden rounded-xl border border-white/5 bg-ink-900/40"
          >
            <button
              type="button"
              onClick={() => alternar(ano.ano)}
              aria-expanded={aberto}
              className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-left transition hover:bg-white/5"
            >
              <ChevronDown
                size={15}
                className={clsx(
                  "shrink-0 text-slate-500 transition-transform",
                  aberto && "rotate-180"
                )}
              />
              <span className="text-sm font-bold text-white">Ano {ano.ano}</span>
              {ano.temExtra && (
                <span className="chip border-brand-400/30 !py-0.5 text-brand-300">
                  <Zap size={11} /> aporte extra
                </span>
              )}
              <span className="ml-auto flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500">
                <span>
                  {ano.linhas.length} {ano.linhas.length === 1 ? "parcela" : "parcelas"}
                </span>
                <span>
                  juros <b className="font-semibold text-rose-300/90">{money0(ano.juros)}</b>
                </span>
                <span>
                  amort.{" "}
                  <b className="font-semibold text-emerald-300/90">
                    {money0(ano.amortizacao + ano.extra)}
                  </b>
                </span>
                <span>
                  saldo <b className="font-semibold text-slate-300">{money0(ano.saldoFinal)}</b>
                </span>
              </span>
            </button>

            <AnimatePresence initial={false}>
              {aberto && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                >
                  <div className="overflow-x-auto border-t border-white/5">
                    <table className="w-full min-w-[560px] text-right text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                          <th scope="col" className="px-3 py-2 text-left font-semibold">
                            Mês
                          </th>
                          <th scope="col" className="px-3 py-2 font-semibold">
                            Parcela
                          </th>
                          <th scope="col" className="px-3 py-2 font-semibold">
                            Juros
                          </th>
                          <th scope="col" className="px-3 py-2 font-semibold">
                            Amortização
                          </th>
                          <th scope="col" className="px-3 py-2 font-semibold">
                            Extra
                          </th>
                          <th scope="col" className="px-3 py-2 font-semibold">
                            Saldo
                          </th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        {ano.linhas.map((linha) => (
                          <tr
                            key={linha.mes}
                            className={clsx(
                              "border-t border-white/[0.03]",
                              linha.extra > 0
                                ? "bg-brand-400/[0.08]"
                                : "odd:bg-white/[0.015]"
                            )}
                          >
                            <td className="px-3 py-1.5 text-left font-sans font-semibold text-slate-400">
                              {linha.mes}
                              {linha.extra > 0 && (
                                <Zap
                                  size={10}
                                  className="ml-1 inline text-brand-400"
                                  aria-label="mês com amortização extra"
                                />
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-slate-200">{money(linha.parcela)}</td>
                            <td className="px-3 py-1.5 text-rose-300/90">{money(linha.juros)}</td>
                            <td className="px-3 py-1.5 text-emerald-300/90">
                              {money(linha.amortizacao)}
                            </td>
                            <td
                              className={clsx(
                                "px-3 py-1.5",
                                linha.extra > 0 ? "font-semibold text-brand-300" : "text-slate-600"
                              )}
                            >
                              {linha.extra > 0 ? money(linha.extra) : "—"}
                            </td>
                            <td className="px-3 py-1.5 text-slate-300">{money(linha.saldo)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
