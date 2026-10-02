# 📊 Financial Loan Comparator — Simulador de Amortização Price vs. SAC com Cálculo de CET

Simulador financeiro de alta precisão para comparação de financiamentos imobiliários e empréstimos bancários, implementando o **Método Numérico da Bisseção** para resolver o Custo Efetivo Total (CET / Taxa Interna de Retorno - TIR) e simulação de **amortizações extraordinárias antecipadas** (redução de prazo vs. redução de parcela).

Hospedado em ambiente serverless edge (Cloudflare Pages + Cloudflare D1 SQLite distribuído).

---

## 📌 Que Problema Resolve?

No Brasil, os bancos utilizam dois sistemas primários de amortização: **Tabela Price** (parcelas constantes, amortização crescente) e **Sistema de Amortização Constante (SAC)** (parcelas decrescentes, amortização fixa). Consumidores frequentemente tomam decisões baseando-se apenas no valor da primeira parcela, sem compreender o impacto total dos juros acumulados ou como amortizações extras aceleram a quitação.

Além disso, os contratos embutem taxas administrativas, seguros obrigatórios (MIP e DFI) e tarifas de avaliação, tornando a taxa nominal de juros diferente do **Custo Efetivo Total (CET)**.

O **Financial Loan Comparator** resolve esse problema fornecendo:
1. Comparativo lado a lado A/B (Price × SAC) do saldo devedor mês a mês.
2. Cálculo exato do CET real via aproximação numérica.
3. Simulador de amortização extraordinária antecipada, calculando a economia real de juros futuros e a quantidade de meses eliminados do contrato.

---

## ⚙️ Diferencial Técnico & Algoritmo

### 1. Sistema Price vs. SAC
- **SAC (Amortização Constante):**
  $$A = \frac{S_0}{n}, \quad J_k = S_{k-1} \times i, \quad P_k = A + J_k$$
- **Price (Prestações Fixas):**
  $$P = S_0 \times \frac{i(1+i)^n}{(1+i)^n - 1}, \quad J_k = S_{k-1} \times i, \quad A_k = P - J_k$$

### 2. Cálculo Numérico do Custo Efetivo Total (CET / TIR)
O CET é a taxa interna de retorno $i_{CET}$ que zera o Valor Presente Líquido (VPL) dos fluxos de caixa:
$$VPL(i) = S_{\text{líquido}} - \sum_{k=1}^{n} \frac{P_k + \text{Seguros}_k + \text{Tarifas}_k}{(1 + i)^k} = 0$$

Como esta equação não possui solução analítica fechada para $n > 4$, o sistema implementa o **Método da Bisseção**, convergindo iterativamente para a raiz com tolerância de erro $\epsilon < 10^{-6}$:
1. Define o intervalo $[a, b]$ tal que $VPL(a) \times VPL(b) < 0$.
2. Calcula o ponto médio $m = \frac{a+b}{2}$.
3. Ajusta o intervalo de busca conforme o sinal de $VPL(m)$.
4. Converge em menos de 30 iterações ($< 2\text{ms}$).

---

## 🏗️ Stack Tecnológica

- **Frontend:** React 18, TypeScript, Tailwind CSS, Recharts (gráficos de evolução de saldo e amortização).
- **Runtime:** Cloudflare Pages Functions (V8 Workers).
- **Storage:** Cloudflare D1 (SQLite distribuído com replicação global).

---

## 🚀 Como Executar Localmente

```bash
# 1. Clone o repositório
git clone https://github.com/HenriMafra/financial-loan-comparator.git
cd financial-loan-comparator

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

---

## 📄 Licença

Distribuído sob a licença **MIT**. Desenvolvido por **Henri Mafra**.
