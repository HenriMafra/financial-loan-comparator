import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import clsx from "clsx";

const NUM_BR = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Rótulo + campo + mensagem de erro/dica, com acessibilidade básica. */
export function Field({
  id,
  label,
  erro,
  hint,
  children,
}: {
  id: string;
  label: string;
  erro?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label mb-1.5 block">
        {label}
      </label>
      {children}
      {hint && !erro && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
      {erro && (
        <p role="alert" className="mt-1 text-[11px] font-medium text-rose-400">
          {erro}
        </p>
      )}
    </div>
  );
}

/** Campo monetário com máscara pt-BR (digite só números; centavos automáticos). */
export function MoneyInput({
  id,
  value,
  onChange,
  max = 999_999_999,
  erro,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
  erro?: boolean;
}) {
  function handle(e: ChangeEvent<HTMLInputElement>) {
    const digitos = e.target.value.replace(/\D/g, "").slice(0, 12);
    onChange(Math.min(max, Number(digitos) / 100));
  }
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
        R$
      </span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={NUM_BR.format(value)}
        onChange={handle}
        className={clsx("input pl-9 font-mono", erro && "input-error")}
      />
    </div>
  );
}

/** Campo decimal (aceita vírgula ou ponto), com sufixo opcional. */
export function DecimalInput({
  id,
  value,
  onChange,
  min = 0,
  max = 9999,
  casas = 2,
  sufixo,
  erro,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  casas?: number;
  sufixo?: string;
  erro?: boolean;
}) {
  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { maximumFractionDigits: casas, useGrouping: false });
  const [texto, setTexto] = useState(() => fmt(value));
  const focado = useRef(false);

  useEffect(() => {
    if (!focado.current) setTexto(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handle(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (!/^\d{0,7}([.,]\d{0,4})?$/.test(raw)) return;
    setTexto(raw);
    if (raw === "" || raw === "," || raw === ".") {
      onChange(min);
      return;
    }
    const n = Number(raw.replace(",", "."));
    if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
  }

  return (
    <div className="relative">
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={texto}
        onFocus={() => {
          focado.current = true;
        }}
        onBlur={() => {
          focado.current = false;
          setTexto(fmt(Math.min(max, Math.max(min, value))));
        }}
        onChange={handle}
        className={clsx("input font-mono", sufixo && "pr-12", erro && "input-error")}
      />
      {sufixo && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
          {sufixo}
        </span>
      )}
    </div>
  );
}

/** Campo inteiro com clamp em [min, max]. */
export function IntInput({
  id,
  value,
  onChange,
  min = 1,
  max = 480,
  sufixo,
  erro,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  sufixo?: string;
  erro?: boolean;
}) {
  const [texto, setTexto] = useState(() => String(value));
  const focado = useRef(false);

  useEffect(() => {
    if (!focado.current) setTexto(String(value));
  }, [value]);

  function handle(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    setTexto(raw);
    if (raw !== "") onChange(Math.min(max, Math.max(min, parseInt(raw, 10))));
  }

  return (
    <div className="relative">
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={texto}
        onFocus={() => {
          focado.current = true;
        }}
        onBlur={() => {
          focado.current = false;
          setTexto(String(value));
        }}
        onChange={handle}
        className={clsx("input font-mono", sufixo && "pr-16", erro && "input-error")}
      />
      {sufixo && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
          {sufixo}
        </span>
      )}
    </div>
  );
}

/** Controle segmentado (Price/SAC, a.m./a.a., modo do aporte…). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  accent = "amber",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; title?: string }[];
  ariaLabel: string;
  accent?: "amber" | "cyan";
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex w-full gap-1 rounded-xl border border-white/10 bg-ink-900/60 p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            "flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition",
            value === o.value
              ? accent === "cyan"
                ? "bg-neon-cyan text-ink-950"
                : "bg-brand-400 text-ink-950"
              : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Interruptor liga/desliga acessível. */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative h-6 w-11 shrink-0 rounded-full border transition",
        checked ? "border-brand-400/60 bg-brand-400" : "border-white/10 bg-white/10"
      )}
    >
      <span
        className={clsx(
          "absolute top-1/2 h-4 w-4 rounded-full shadow transition-all",
          checked ? "left-6 -translate-y-1/2 bg-ink-950" : "left-1 -translate-y-1/2 bg-white"
        )}
      />
    </button>
  );
}
