import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Check,
  CheckCircle2,
  Copy,
  GitCompareArrows,
  LineChart,
  Share2,
  Table2,
} from "lucide-react";
import clsx from "clsx";
import { simular, temErros, validarCenario, type Sistema } from "./lib/engine";
import { money, money0, pct } from "./lib/format";
import { loadShare, saveShare } from "./lib/api";
import { useJurosForge, type IdCenario } from "./lib/store";
import { PRESETS } from "./data/presets";
import { Header } from "./components/Header";
import { ScenarioForm } from "./components/ScenarioForm";
import { ResultCards } from "./components/ResultCards";
import { CompareView } from "./components/CompareView";
import { BalanceChart, type SerieGrafico } from "./components/BalanceChart";
import { YearlyBars } from "./components/YearlyBars";
import { AmortTable } from "./components/AmortTable";
import { Segmented, Toggle } from "./components/inputs";

const rotuloSistema = (s: Sistema) => (s === "price" ? "Price" : "SAC");

function AvisoInvalido({ cenarios }: { cenarios: string[] }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-10 text-center">
      <AlertTriangle size={28} className="text-brand-400" />
      <p className="text-base font-bold text-white">
        {cenarios.length === 1
          ? `O Cenário ${cenarios[0]} tem campos inválidos`
          : `Os Cenários ${cenarios.join(" e ")} têm campos inválidos`}
      </p>
      <p className="max-w-sm text-xs leading-relaxed text-slate-500">
        Corrija os campos destacados em vermelho no formulário para ver a simulação completa.
      </p>
    </div>
  );
}

export default function App() {
  const a = useJurosForge((s) => s.a);
  const b = useJurosForge((s) => s.b);
  const comparar = useJurosForge((s) => s.comparar);
  const aba = useJurosForge((s) => s.aba);
  const setCenario = useJurosForge((s) => s.setCenario);
  const setExtra = useJurosForge((s) => s.setExtra);
  const setComparar = useJurosForge((s) => s.setComparar);
  const setAba = useJurosForge((s) => s.setAba);
  const aplicarCenario = useJurosForge((s) => s.aplicarCenario);
  const copiarCenario = useJurosForge((s) => s.copiarCenario);
  const carregarExemplo = useJurosForge((s) => s.carregarExemplo);
  const importarShare = useJurosForge((s) => s.importarShare);
  const resetar = useJurosForge((s) => s.resetar);

  const errosA = useMemo(() => validarCenario(a), [a]);
  const errosB = useMemo(() => validarCenario(b), [b]);
  const resA = useMemo(() => (temErros(errosA) ? null : simular(a)), [a, errosA]);
  const resB = useMemo(
    () => (comparar && !temErros(errosB) ? simular(b) : null),
    [b, comparar, errosB]
  );

  const [share, setShare] = useState<{ loading: boolean; url?: string; copied?: boolean }>({
    loading: false,
  });
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "erro" } | null>(null);
  const [tabelaDe, setTabelaDe] = useState<IdCenario>("a");

  // Importa cenários compartilhados de ?c=CODE ao carregar.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("c");
    if (!code) return;
    void loadShare(code).then((payload) => {
      if (payload) {
        importarShare(payload);
        setToast({ msg: "Cenário compartilhado carregado!", tipo: "ok" });
      } else {
        setToast({ msg: "Código de compartilhamento não encontrado.", tipo: "erro" });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toast some sozinho.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  // Link de compartilhamento fica obsoleto quando o estado muda.
  useEffect(() => setShare({ loading: false }), [a, b, comparar]);

  const podeCompartilhar = !!resA && (!comparar || !!resB);

  async function onShare() {
    if (!podeCompartilhar) {
      setToast({ msg: "Corrija os cenários antes de compartilhar.", tipo: "erro" });
      return;
    }
    setShare({ loading: true });
    const code = await saveShare({ v: 1, a, b, comparar });
    const url = `${window.location.origin}${window.location.pathname}?c=${code}`;
    window.history.replaceState(null, "", `?c=${code}`);
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      /* clipboard bloqueado pelo navegador */
    }
    setShare({ loading: false, url, copied });
    setToast({
      msg: copied ? "Link copiado para a área de transferência!" : "Link gerado!",
      tipo: "ok",
    });
  }

  function onLimpar() {
    if (window.confirm("Restaurar os dois cenários para os valores padrão?")) {
      resetar();
      setToast({ msg: "Cenários restaurados para o padrão.", tipo: "ok" });
    }
  }

  function onExemplo() {
    carregarExemplo();
    setToast({ msg: "Exemplo carregado: Price × SAC no mesmo imóvel.", tipo: "ok" });
  }

  const cenarioAtivo: IdCenario = comparar ? aba : "a";
  const cenarioForm = cenarioAtivo === "a" ? a : b;
  const errosForm = cenarioAtivo === "a" ? errosA : errosB;

  const series: SerieGrafico[] = [];
  if (resA) series.push({ id: "a", rotulo: rotuloSistema(a.sistema), res: resA });
  if (comparar && resB) series.push({ id: "b", rotulo: rotuloSistema(b.sistema), res: resB });

  const resTabela = comparar ? (tabelaDe === "b" ? resB ?? resA : resA ?? resB) : resA;
  const idTabela: IdCenario = resTabela === resB && comparar ? "b" : "a";

  const invalidos: string[] = [];
  if (!resA) invalidos.push("A");
  if (comparar && !resB) invalidos.push("B");

  const vencedorMobile =
    resA && resB
      ? Math.abs(resA.totalPago - resB.totalPago) < 1
        ? null
        : resA.totalPago < resB.totalPago
          ? "A"
          : "B"
      : null;

  return (
    <div className="min-h-screen pb-24 xl:pb-0">
      <Header onExemplo={onExemplo} onLimpar={onLimpar} />

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4"
          >
            <div
              className={clsx(
                "card pointer-events-auto flex items-center gap-2 px-4 py-2.5 text-sm font-semibold",
                toast.tipo === "ok" ? "text-emerald-300" : "text-rose-300"
              )}
            >
              {toast.tipo === "ok" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* hero */}
      <section className="mx-auto max-w-7xl px-4 pt-8">
        <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Descubra o custo real do seu financiamento.
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Simule <span className="text-brand-300">Price</span> e{" "}
          <span className="text-neon-cyan">SAC</span> mês a mês, veja o{" "}
          <span className="text-emerald-300">CET verdadeiro</span> com seguros e tarifas, teste{" "}
          <span className="text-brand-300">amortizações extras</span> e compare dois cenários lado
          a lado.
        </p>
      </section>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-6 xl:grid-cols-12">
        {/* painel do formulário */}
        <div className="xl:col-span-5">
          <div className="space-y-4 xl:sticky xl:top-20">
            <div className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-bold text-white">
                    <GitCompareArrows size={15} className="text-neon-cyan" /> Comparador A/B
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Simule dois cenários completos lado a lado.
                  </p>
                </div>
                <Toggle checked={comparar} label="Ativar comparador A/B" onChange={setComparar} />
              </div>

              {comparar && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-1 rounded-xl border border-white/10 bg-ink-900/60 p-1">
                    {(["a", "b"] as const).map((id) => {
                      const ativo = aba === id;
                      const comErro = id === "a" ? temErros(errosA) : temErros(errosB);
                      const cenario = id === "a" ? a : b;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setAba(id)}
                          className={clsx(
                            "relative flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition",
                            ativo
                              ? id === "a"
                                ? "bg-brand-400 text-ink-950"
                                : "bg-neon-cyan text-ink-950"
                              : "text-slate-400 hover:text-slate-200"
                          )}
                        >
                          Cenário {id.toUpperCase()} · {rotuloSistema(cenario.sistema)}
                          {comErro && (
                            <span
                              className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-400"
                              title="Há campos inválidos"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {aba === "b" && (
                    <button
                      type="button"
                      onClick={() => {
                        copiarCenario("a", "b");
                        setToast({ msg: "Valores do Cenário A copiados para o B.", tipo: "ok" });
                      }}
                      className="btn-ghost w-full !py-1.5 text-xs"
                    >
                      <ArrowLeftRight size={13} /> Copiar valores do Cenário A
                    </button>
                  )}
                </div>
              )}

              <div className="mt-4">
                <p className="label mb-1.5">Preencher rápido</p>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.descricao}
                      onClick={() => {
                        aplicarCenario(cenarioAtivo, preset.cenario);
                        setToast({
                          msg: `Preset "${preset.nome}" aplicado ao Cenário ${cenarioAtivo.toUpperCase()}.`,
                          tipo: "ok",
                        });
                      }}
                      className="chip transition hover:bg-white/10 hover:text-white"
                    >
                      {preset.nome}
                    </button>
                  ))}
                </div>
              </div>

              <div className="my-4 h-px bg-white/5" />

              <ScenarioForm
                id={cenarioAtivo}
                cenario={cenarioForm}
                erros={errosForm}
                accent={cenarioAtivo === "b" ? "cyan" : "amber"}
                onPatch={(patch) => setCenario(cenarioAtivo, patch)}
                onPatchExtra={(patch) => setExtra(cenarioAtivo, patch)}
              />
            </div>

            {/* compartilhar */}
            <div className="card p-4">
              <div className="flex items-center gap-2">
                <Share2 size={15} className="text-brand-400" />
                <div>
                  <p className="text-sm font-bold text-white">Compartilhar cenários</p>
                  <p className="text-[11px] text-slate-500">
                    Gera um código curto com o par A/B completo.
                  </p>
                </div>
              </div>
              <button
                onClick={onShare}
                disabled={share.loading || !podeCompartilhar}
                className="btn-primary mt-3 w-full !py-2 text-sm"
              >
                {share.copied ? <Check size={15} /> : <Share2 size={15} />}
                {share.loading
                  ? "Gerando…"
                  : share.copied
                    ? "Link copiado!"
                    : "Gerar link de compartilhamento"}
              </button>
              {share.url && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-ink-900/60 px-2.5 py-1.5">
                  <input
                    readOnly
                    value={share.url}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="Link de compartilhamento"
                    className="flex-1 bg-transparent text-[11px] text-slate-300 outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard
                        ?.writeText(share.url!)
                        .then(() => {
                          setShare((s) => ({ ...s, copied: true }));
                          setToast({ msg: "Link copiado!", tipo: "ok" });
                        })
                        .catch(() =>
                          setToast({
                            msg: "Não foi possível copiar — selecione o link manualmente.",
                            tipo: "erro",
                          })
                        );
                    }}
                    className="text-slate-400 transition hover:text-white"
                    title="Copiar link"
                    aria-label="Copiar link de compartilhamento"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* resultados */}
        <div className="space-y-5 xl:col-span-7">
          {invalidos.length > 0 && <AvisoInvalido cenarios={invalidos} />}

          {comparar
            ? resA &&
              resB && <CompareView ca={a} cb={b} ra={resA} rb={resB} />
            : resA && <ResultCards res={resA} prazoContratado={a.prazoMeses} />}

          {series.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <LineChart size={16} className="text-brand-400" />
                <h3 className="text-sm font-bold text-white">Saldo devedor</h3>
                <span className="ml-auto text-[11px] text-slate-500">evolução mês a mês</span>
              </div>
              <BalanceChart series={series} />
            </motion.section>
          )}

          {series.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <BarChart3 size={16} className="text-brand-400" />
                <h3 className="text-sm font-bold text-white">Juros × amortização por ano</h3>
              </div>
              {comparar && resA && resB ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold text-brand-300">
                      Cenário A · {rotuloSistema(a.sistema)}
                    </p>
                    <YearlyBars res={resA} />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold text-cyan-300">
                      Cenário B · {rotuloSistema(b.sistema)}
                    </p>
                    <YearlyBars res={resB} />
                  </div>
                </div>
              ) : (
                series[0] && <YearlyBars res={series[0].res} />
              )}
            </motion.section>
          )}

          {resTabela && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-4 sm:p-5"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Table2 size={16} className="text-brand-400" />
                <h3 className="text-sm font-bold text-white">Tabela mês a mês</h3>
                <span className="text-[11px] text-slate-500">
                  agrupada por ano · meses com aporte extra destacados
                </span>
                {comparar && resA && resB && (
                  <div className="ml-auto w-full sm:w-64">
                    <Segmented
                      value={idTabela}
                      accent={idTabela === "b" ? "cyan" : "amber"}
                      ariaLabel="Escolher cenário da tabela"
                      options={[
                        { value: "a", label: `Cenário A · ${rotuloSistema(a.sistema)}` },
                        { value: "b", label: `Cenário B · ${rotuloSistema(b.sistema)}` },
                      ]}
                      onChange={(v) => setTabelaDe(v)}
                    />
                  </div>
                )}
              </div>
              <AmortTable res={resTabela} />
            </motion.section>
          )}
        </div>
      </main>

      {/* resumo fixo no mobile */}
      {resA && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-ink-900/95 px-4 py-2.5 backdrop-blur-md xl:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            {comparar && resB ? (
              <div className="flex-1">
                <p className="text-sm font-extrabold leading-tight text-white">
                  {vencedorMobile ? `Cenário ${vencedorMobile} vence` : "Empate técnico"}
                </p>
                <p className="text-[10px] text-slate-500">
                  {vencedorMobile
                    ? `economia de ${money0(Math.abs(resA.totalPago - resB.totalPago))} no total pago`
                    : "totais praticamente iguais"}
                </p>
              </div>
            ) : (
              <div className="flex-1">
                <p className="text-lg font-extrabold leading-none text-white">
                  {money(resA.parcelaInicial)}
                  <span className="text-[10px] font-medium text-slate-500"> /mês</span>
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  total {money0(resA.totalPago)} · CET {pct(resA.cetAnual)} a.a.
                </p>
              </div>
            )}
            <button
              onClick={onShare}
              disabled={share.loading || !podeCompartilhar}
              className="btn-primary !px-3 !py-1.5 text-xs"
            >
              <Share2 size={14} /> Compartilhar
            </button>
          </div>
        </div>
      )}

      <footer className="mx-auto max-w-7xl px-4 py-8 text-center text-[11px] text-slate-600">
        <p>JurosForge · React + Cloudflare Pages + D1</p>
        <p className="mt-1">
          Simulação educativa — confirme sempre o CET oficial com a instituição financeira.
        </p>
      </footer>
    </div>
  );
}
