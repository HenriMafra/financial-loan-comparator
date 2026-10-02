import { Percent, Sparkles, Trash2 } from "lucide-react";

export function Header({
  onExemplo,
  onLimpar,
}: {
  onExemplo: () => void;
  onLimpar: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-300 to-brand-600 shadow-glow">
          <Percent size={18} strokeWidth={2.6} className="text-ink-950" />
        </div>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white">
            JurosForge
            <span className="hidden rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">
              Price × SAC
            </span>
          </h1>
          <p className="hidden text-[11px] text-slate-500 sm:block">
            Simulador de financiamento com CET real, amortização extra e comparador A/B
          </p>
        </div>

        <button onClick={onExemplo} className="btn-ghost !px-3 !py-1.5 text-xs">
          <Sparkles size={14} className="text-brand-400" />
          <span className="hidden sm:inline">Exemplo A/B</span>
          <span className="sm:hidden">Exemplo</span>
        </button>
        <button
          onClick={onLimpar}
          className="btn !px-3 !py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
          title="Restaurar os cenários padrão"
        >
          <Trash2 size={14} />
          <span className="hidden sm:inline">Limpar</span>
        </button>
      </div>
    </header>
  );
}
