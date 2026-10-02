import { useState } from "react";
import { agregarPorAno, type ResultadoSimulacao } from "../lib/engine";
import { money0, moneyCompact } from "../lib/format";

const CORES = {
  juros: "#fb7185",
  amortizacao: "#34d399",
  extra: "#fbbf24",
};

const W = 720;
const H = 230;
const M = { l: 64, r: 10, t: 16, b: 30 };
const PLOT_W = W - M.l - M.r;
const PLOT_H = H - M.t - M.b;

/** Barras empilhadas de juros × amortização (× extra) agregadas por ano. */
export function YearlyBars({ res }: { res: ResultadoSimulacao }) {
  const [hover, setHover] = useState<number | null>(null);
  const anos = agregarPorAno(res.tabela);
  if (anos.length === 0) return null;

  const maxTotal = Math.max(...anos.map((a) => a.juros + a.amortizacao + a.extra), 1);
  const bw = PLOT_W / anos.length;
  const labelCada = Math.max(1, Math.ceil(anos.length / 10));
  const temExtra = res.totalExtra > 0;
  const yBase = M.t + PLOT_H;
  const escala = (v: number) => (v / maxTotal) * PLOT_H;

  const tooltipW = 190;
  const tooltipH = temExtra ? 70 : 54;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full select-none"
        role="img"
        aria-label="Barras empilhadas de juros e amortização agregadas por ano"
        onMouseLeave={() => setHover(null)}
      >
        {/* grade horizontal */}
        {[0.25, 0.5, 0.75, 1].map((f) => {
          const vy = yBase - PLOT_H * f;
          return (
            <g key={f}>
              <line x1={M.l} x2={W - M.r} y1={vy} y2={vy} stroke="rgba(255,255,255,0.06)" />
              <text x={M.l - 8} y={vy + 3.5} textAnchor="end" fontSize="10" fill="#64748b">
                {moneyCompact(maxTotal * f)}
              </text>
            </g>
          );
        })}
        <line x1={M.l} x2={W - M.r} y1={yBase} y2={yBase} stroke="rgba(255,255,255,0.12)" />

        {/* barras */}
        {anos.map((ano, idx) => {
          const x0 = M.l + idx * bw + bw * 0.15;
          const wBar = Math.max(1.5, bw * 0.7);
          const hAmort = escala(ano.amortizacao);
          const hExtra = escala(ano.extra);
          const hJuros = escala(ano.juros);
          const apagada = hover !== null && hover !== idx;
          return (
            <g
              key={ano.ano}
              opacity={apagada ? 0.45 : 1}
              onMouseEnter={() => setHover(idx)}
            >
              {/* área de captura do hover (coluna inteira) */}
              <rect
                x={M.l + idx * bw}
                y={M.t}
                width={bw}
                height={PLOT_H}
                fill="transparent"
              />
              <rect x={x0} y={yBase - hAmort} width={wBar} height={hAmort} fill={CORES.amortizacao} rx="1" />
              {hExtra > 0 && (
                <rect x={x0} y={yBase - hAmort - hExtra} width={wBar} height={hExtra} fill={CORES.extra} rx="1" />
              )}
              <rect x={x0} y={yBase - hAmort - hExtra - hJuros} width={wBar} height={hJuros} fill={CORES.juros} rx="1" />
              {(idx === 0 || (idx + 1) % labelCada === 0) && (
                <text
                  x={x0 + wBar / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#64748b"
                >
                  {ano.ano}
                </text>
              )}
            </g>
          );
        })}

        {/* legenda do eixo X */}
        <text x={W - M.r} y={H - 8} textAnchor="end" fontSize="9" fill="#475569">
          ano do contrato
        </text>

        {/* tooltip */}
        {hover !== null && anos[hover] && (
          (() => {
            const ano = anos[hover];
            const cx = M.l + hover * bw + bw / 2;
            const tx = cx + tooltipW + 12 > W - M.r ? cx - tooltipW - 8 : cx + 8;
            return (
              <g transform={`translate(${tx}, ${M.t})`} pointerEvents="none">
                <rect width={tooltipW} height={tooltipH} rx="8" fill="#0b0f1a" stroke="rgba(255,255,255,0.12)" />
                <text x="10" y="15" fontSize="10" fontWeight="700" fill="#fff">
                  Ano {ano.ano} · {ano.linhas.length} {ano.linhas.length === 1 ? "parcela" : "parcelas"}
                </text>
                <circle cx="13" cy="27.5" r="3" fill={CORES.juros} />
                <text x="21" y="31" fontSize="10" fill="#cbd5e1">
                  Juros: {money0(ano.juros)}
                </text>
                <circle cx="13" cy="43.5" r="3" fill={CORES.amortizacao} />
                <text x="21" y="47" fontSize="10" fill="#cbd5e1">
                  Amortização: {money0(ano.amortizacao)}
                </text>
                {temExtra && (
                  <>
                    <circle cx="13" cy="59.5" r="3" fill={CORES.extra} />
                    <text x="21" y="63" fontSize="10" fill="#cbd5e1">
                      Aportes extras: {money0(ano.extra)}
                    </text>
                  </>
                )}
              </g>
            );
          })()
        )}
      </svg>

      <div className="mt-2 flex flex-wrap gap-2">
        <span className="chip">
          <span className="h-2 w-2 rounded-full" style={{ background: CORES.juros }} /> Juros
        </span>
        <span className="chip">
          <span className="h-2 w-2 rounded-full" style={{ background: CORES.amortizacao }} /> Amortização
        </span>
        {temExtra && (
          <span className="chip">
            <span className="h-2 w-2 rounded-full" style={{ background: CORES.extra }} /> Aportes extras
          </span>
        )}
      </div>
    </div>
  );
}
