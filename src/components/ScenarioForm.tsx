import { Zap } from "lucide-react";
import type { CenarioInput, ErrosCenario, ExtraConfig } from "../lib/engine";
import { anualParaMensal, mensalParaAnual } from "../lib/engine";
import { money, pct, prazoHumano, round2 } from "../lib/format";
import { DecimalInput, Field, IntInput, MoneyInput, Segmented, Toggle } from "./inputs";

const DESCRICAO_SISTEMA: Record<CenarioInput["sistema"], string> = {
  price: "Parcela fixa do primeiro ao último mês — previsível, porém com mais juros no total.",
  sac: "Amortização constante: a parcela começa maior e cai todo mês — menos juros no total.",
};

const DESCRICAO_MODO: Record<ExtraConfig["modo"], string> = {
  prazo: "Mantém a parcela e quita o contrato antes do prazo.",
  parcela: "Recalcula a parcela a cada aporte, mantendo o prazo contratado.",
};

export function ScenarioForm({
  id,
  cenario,
  erros,
  accent,
  onPatch,
  onPatchExtra,
}: {
  id: "a" | "b";
  cenario: CenarioInput;
  erros: ErrosCenario;
  accent: "amber" | "cyan";
  onPatch: (patch: Partial<Omit<CenarioInput, "extra">>) => void;
  onPatchExtra: (patch: Partial<ExtraConfig>) => void;
}) {
  const campo = (nome: string) => `${id}-${nome}`;
  const pctEntrada = cenario.valorBem > 0 ? (cenario.entrada / cenario.valorBem) * 100 : 0;
  const valorFinanciado = Math.max(0, cenario.valorBem - cenario.entrada);
  const taxaEquivalente =
    cenario.periodoTaxa === "mensal"
      ? `equivale a ${pct(mensalParaAnual(cenario.taxa / 100))} a.a.`
      : `equivale a ${pct(anualParaMensal(cenario.taxa / 100), 4)} a.m.`;

  return (
    <div className="space-y-4">
      <Field id={campo("valor")} label="Valor do bem / empréstimo" erro={erros.valorBem}>
        <MoneyInput
          id={campo("valor")}
          value={cenario.valorBem}
          erro={!!erros.valorBem}
          onChange={(v) => onPatch({ valorBem: v })}
        />
      </Field>

      <div>
        <div className="grid grid-cols-2 gap-3">
          <Field id={campo("entrada")} label="Entrada (R$)" erro={erros.entrada}>
            <MoneyInput
              id={campo("entrada")}
              value={cenario.entrada}
              erro={!!erros.entrada}
              onChange={(v) => onPatch({ entrada: v })}
            />
          </Field>
          <Field id={campo("entrada-pct")} label="Entrada (%)">
            <DecimalInput
              id={campo("entrada-pct")}
              value={round2(pctEntrada)}
              max={100}
              sufixo="%"
              erro={!!erros.entrada}
              onChange={(p) => onPatch({ entrada: round2((cenario.valorBem * p) / 100) })}
            />
          </Field>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">
          Valor financiado:{" "}
          <span className="font-semibold text-slate-300">{money(valorFinanciado)}</span>
        </p>
      </div>

      <div>
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <Field id={campo("taxa")} label="Taxa de juros" erro={erros.taxa}>
            <DecimalInput
              id={campo("taxa")}
              value={cenario.taxa}
              max={999}
              casas={4}
              sufixo="%"
              erro={!!erros.taxa}
              onChange={(v) => onPatch({ taxa: v })}
            />
          </Field>
          <div className="w-28 pb-0">
            <Segmented
              value={cenario.periodoTaxa}
              accent={accent}
              ariaLabel="Período da taxa de juros"
              options={[
                { value: "mensal", label: "a.m.", title: "Taxa ao mês" },
                { value: "anual", label: "a.a.", title: "Taxa ao ano" },
              ]}
              onChange={(v) => onPatch({ periodoTaxa: v })}
            />
          </div>
        </div>
        {!erros.taxa && (
          <p className="mt-1 text-[11px] text-slate-500">{taxaEquivalente}</p>
        )}
      </div>

      <Field
        id={campo("prazo")}
        label="Prazo (meses)"
        erro={erros.prazoMeses}
        hint={prazoHumano(cenario.prazoMeses)}
      >
        <div className="flex items-center gap-3">
          <div className="w-28">
            <IntInput
              id={campo("prazo")}
              value={cenario.prazoMeses}
              min={1}
              max={480}
              erro={!!erros.prazoMeses}
              onChange={(v) => onPatch({ prazoMeses: v })}
            />
          </div>
          <input
            type="range"
            min={1}
            max={480}
            step={1}
            value={cenario.prazoMeses}
            onChange={(e) => onPatch({ prazoMeses: Number(e.target.value) })}
            aria-label="Prazo em meses"
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-ink-600"
            style={{ accentColor: accent === "cyan" ? "#22d3ee" : "#fbbf24" }}
          />
        </div>
      </Field>

      <div>
        <p className="label mb-1.5">Sistema de amortização</p>
        <Segmented
          value={cenario.sistema}
          accent={accent}
          ariaLabel="Sistema de amortização"
          options={[
            { value: "price", label: "Price", title: "Parcelas fixas" },
            { value: "sac", label: "SAC", title: "Amortização constante" },
          ]}
          onChange={(v) => onPatch({ sistema: v })}
        />
        <p className="mt-1 text-[11px] text-slate-500">{DESCRICAO_SISTEMA[cenario.sistema]}</p>
      </div>

      <Field
        id={campo("custos")}
        label="Custos fixos mensais"
        erro={erros.custosFixos}
        hint="Seguro + taxa administrativa cobrados em cada parcela (entram no CET)."
      >
        <MoneyInput
          id={campo("custos")}
          value={cenario.custosFixos}
          erro={!!erros.custosFixos}
          onChange={(v) => onPatch({ custosFixos: v })}
        />
      </Field>

      <div className="rounded-xl border border-white/10 bg-ink-900/40 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold text-white">
              <Zap size={14} className="text-brand-400" /> Amortização extra
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Aportes periódicos que abatem o saldo devedor.
            </p>
          </div>
          <Toggle
            checked={cenario.extra.ativo}
            label="Ativar amortização extra"
            onChange={(v) => onPatchExtra({ ativo: v })}
          />
        </div>

        {cenario.extra.ativo && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field id={campo("extra-valor")} label="Valor do aporte" erro={erros.extraValor}>
                <MoneyInput
                  id={campo("extra-valor")}
                  value={cenario.extra.valor}
                  erro={!!erros.extraValor}
                  onChange={(v) => onPatchExtra({ valor: v })}
                />
              </Field>
              <Field id={campo("extra-cada")} label="A cada" erro={erros.extraCadaMeses}>
                <IntInput
                  id={campo("extra-cada")}
                  value={cenario.extra.cadaMeses}
                  min={1}
                  max={480}
                  sufixo="meses"
                  erro={!!erros.extraCadaMeses}
                  onChange={(v) => onPatchExtra({ cadaMeses: v })}
                />
              </Field>
            </div>
            <div>
              <p className="label mb-1.5">Modo do aporte</p>
              <Segmented
                value={cenario.extra.modo}
                accent={accent}
                ariaLabel="Modo da amortização extra"
                options={[
                  { value: "prazo", label: "Reduzir prazo" },
                  { value: "parcela", label: "Reduzir parcela" },
                ]}
                onChange={(v) => onPatchExtra({ modo: v })}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                {DESCRICAO_MODO[cenario.extra.modo]}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
