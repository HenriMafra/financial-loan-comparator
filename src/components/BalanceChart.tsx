import { useRef, useState, type MouseEvent, type TouchEvent } from "react";
import type { ResultadoSimulacao } from "../lib/engine";
import { money, moneyCompact } from "../lib/format";

export interface SerieGrafico {
  id: "a" | "b";
  rotulo: string;
  res: ResultadoSimulacao;
}

const COR: Record<"a" | "b", string> = { a: "#fbbf24", b: "#22d3ee" };
const NOME: Record<"a" | "b", string> = { a: "Cenário A", b: "Cenário B" };

const W = 720;
const H = 260;
const M = { l: 64, r: 16, t: 14, b: 30 };
const PLOT_W = W - M.l - M.r;
const PLOT_H = H - M.t - M.b;

export function BalanceChart({ series }: { series: SerieGrafico[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverMes, setHoverMes] = useState<number | null>(null);

  if (series.length === 0) return null;

  const maxMes = Math.max(1, ...series.map((s) => s.res.prazoEfetivo));
  const maxSaldo = Math.max(1, ...series.map((s) => s.res.valorFinanciado));
  const x = (mes: number) => M.l + (mes / maxMes) * PLOT_W;
  const y = (saldo: number) => M.t + (1 - saldo / maxSaldo) * PLOT_H;
  const yBase = M.t + PLOT_H;

  function saldoNoMes(res: ResultadoSimulacao, mes: number): number | null {
    if (mes === 0) return res.valorFinanciado;
    if (mes > res.prazoEfetivo) return null;
    return res.tabela[mes - 1]?.saldo ?? null;
  }

  function caminho(res: ResultadoSimulacao): string {
    const partes = [`M${x(0).toFixed(1)},${y(res.valorFinanciado).toFixed(1)}`];
    for (const linha of res.tabela) {
      partes.push(`L${x(linha.mes).toFixed(1)},${y(linha.saldo).toFixed(1)}`);
    }
    return partes.join(" ");
  }

  // Ticks do eixo X em passos "redondos" de meses.
  const candidatos = [1, 2, 3, 6, 12, 24, 36, 60, 120];
  const passo = candidatos.find((p) => maxMes / p <= 8) ?? 120;
  const ticksX: number[] = [];
  for (let m = 0; m <= maxMes; m += passo) ticksX.push(m);

  function mesDoEvento(clientX: number) {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    const mes = Math.round(((px - M.l) / PLOT_W) * maxMes);
    setHoverMes(Math.max(0, Math.min(maxMes, mes)));
  }

  const onMove = (e: MouseEvent<SVGSVGElement>) => mesDoEvento(e.clientX);
  const onTouch = (e: TouchEvent<SVGSVGElement>) => {
    const t = e.touches[0];
    if (t) mesDoEvento(t.clientX);
  };

  // Tooltip
  let tooltip: { tx: number; itens: { id: "a" | "b"; saldo: number | null }[] } | null = null;
  if (hoverMes !== null) {
    tooltip = {
      tx: x(hoverMes),
      itens: series.map((s) => ({ id: s.id, saldo: saldoNoMes(s.res, hoverMes) })),
    };
  }
  const tooltipW = 168;
  const tooltipH = 22 + series.length * 16;
  const tooltipX = tooltip
    ? tooltip.tx + tooltipW + 16 > W - M.r
      ? tooltip.tx - tooltipW - 12
      : tooltip.tx + 12
    : 0;

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full select-none"
        role="img"
        aria-label="Gráfico de linha do saldo devedor mês a mês"
        onMouseMove={onMove}
        onMouseLeave={() => setHoverMes(null)}
        onTouchStart={onTouch}
        onTouchMove={onTouch}
        onTouchEnd={() => setHoverMes(null)}
      >
        <defs>
          <linearGradient id="areaSaldo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={COR[series[0].id]} stopOpacity="0.22" />
            <stop offset="1" stopColor={COR[series[0].id]} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* grade horizontal + rótulos */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const vy = y(maxSaldo * f);
          return (
            <g key={f}>
              <line x1={M.l} x2={W - M.r} y1={vy} y2={vy} stroke="rgba(255,255,255,0.06)" />
              <text x={M.l - 8} y={vy + 3.5} textAnchor="end" fontSize="10" fill="#64748b">
                {moneyCompact(maxSaldo * f)}
              </text>
            </g>
          );
        })}

        {/* ticks eixo X */}
        {ticksX.map((m) => (
          <text
            key={m}
            x={x(m)}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            fill="#64748b"
          >
            {m === 0 ? "0" : passo % 12 === 0 ? `${m / 12}a` : `${m}m`}
          </text>
        ))}

        {/* área sob a primeira série (apenas quando há uma só, para não poluir) */}
        {series.length === 1 && (
          <path
            d={`${caminho(series[0].res)} L${x(series[0].res.prazoEfetivo).toFixed(1)},${yBase} L${x(0).toFixed(1)},${yBase} Z`}
            fill="url(#areaSaldo)"
            stroke="none"
          />
        )}

        {/* linhas */}
        {series.map((s) => (
          <path
            key={s.id}
            d={caminho(s.res)}
            fill="none"
            stroke={COR[s.id]}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* hover */}
        {tooltip && (
          <g>
            <line
              x1={tooltip.tx}
              x2={tooltip.tx}
              y1={M.t}
              y2={yBase}
              stroke="rgba(255,255,255,0.18)"
              strokeDasharray="3 3"
            />
            {tooltip.itens.map(
              (item) =>
                item.saldo !== null && (
                  <circle
                    key={item.id}
                    cx={tooltip!.tx}
                    cy={y(item.saldo)}
                    r="4"
                    fill={COR[item.id]}
                    stroke="#0b0f1a"
                    strokeWidth="1.5"
                  />
                )
            )}
            <g transform={`translate(${tooltipX}, ${M.t + 4})`}>
              <rect
                width={tooltipW}
                height={tooltipH}
                rx="8"
                fill="#0b0f1a"
                stroke="rgba(255,255,255,0.12)"
              />
              <text x="10" y="15" fontSize="10" fontWeight="700" fill="#fff">
                Mês {hoverMes}
              </text>
              {tooltip.itens.map((item, i) => (
                <g key={item.id} transform={`translate(10, ${30 + i * 16})`}>
                  <circle cx="3" cy="-3.5" r="3" fill={COR[item.id]} />
                  <text x="11" y="0" fontSize="10" fill="#cbd5e1">
                    {NOME[item.id]}: {item.saldo === null ? "quitado" : money(item.saldo)}
                  </text>
                </g>
              ))}
            </g>
          </g>
        )}
      </svg>

      {series.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {series.map((s) => (
            <span key={s.id} className="chip">
              <span className="h-2 w-2 rounded-full" style={{ background: COR[s.id] }} />
              {NOME[s.id]} · {s.rotulo}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
