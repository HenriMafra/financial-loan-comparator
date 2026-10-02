# Financial Loan Comparator: Numerical CET Approximation and Continuous Amortization Dynamics

**Author:** Henri Mafra  
**License:** MIT License  
**Domain:** Financial Engineering, Numerical Methods, Computational Economics  

---

## 1. Overview

Financial Loan Comparator is an analytical software engine designed for comparative evaluation of credit amortization systems, specifically contrasting the **Price System** (French Constant Annuity System) against the **SAC System** (Constant Amortization System). The platform incorporates the **Numerical Bisection Method** to solve for the exact Effective Total Cost (CET / Internal Rate of Return), accounting for mandatory ancillary fees, insurances (MIP/DFI), and administrative charges.

---

## 2. Mathematical Modeling of Amortization Systems

Let $S_0$ denote initial principal, $n$ the total amortization periods, and $i$ the nominal periodic interest rate.

### 2.1. Constant Amortization System (SAC)
Amortization installments remain strictly constant throughout the loan tenure:

$$A_k = \frac{S_0}{n}, \quad \forall k \in \{1, \dots, n\}$$

Interest $J_k$ and total periodic installment $P_k$ evolve as:

$$J_k = S_{k-1} \times i = \left(S_0 - (k-1)\frac{S_0}{n}\right)i$$

$$P_k = A_k + J_k = \frac{S_0}{n} + S_{k-1}i$$

### 2.2. French Constant Annuity System (Price)
Installments remain constant while the principal amortization component grows exponentially:

$$P = S_0 \left[\frac{i(1+i)^n}{(1+i)^n - 1}\right]$$

$$J_k = S_{k-1} \times i, \quad A_k = P - J_k, \quad S_k = S_{k-1} - A_k$$

---

## 3. Numerical Root-Finding for Effective Total Cost (CET)

Contractual credit costs include ancillary periodic fees $F_k$ (e.g., credit life insurance, fire insurance, administration fees). The periodic Effective Total Cost $i_{\text{CET}}$ corresponds to the root of the Net Present Value equation:

$$f(i) = S_{\text{net}} - \sum_{k=1}^{n} \frac{P_k + F_k}{(1 + i)^k} = 0$$

Given that $f(i)$ has no closed-form analytical solution for $n > 4$ (Abel-Ruffini theorem), the engine implements the **Bisection Method**:

1. Establish bracket $[a, b]$ such that $f(a) \times f(b) < 0$, setting $a = 0.0$ and $b = 1.0$.
2. Compute midpoint $m_t = \frac{a_t + b_t}{2}$.
3. If $|f(m_t)| < \epsilon$ (where $\epsilon = 10^{-7}$), return $m_t$.
4. Otherwise, if $f(a_t) \times f(m_t) < 0$, set $b_{t+1} = m_t$; else set $a_{t+1} = m_t$.
5. The method guarantees convergence with $N = \lceil \log_2((b-a)/\epsilon) \rceil \le 24$ iterations ($< 1.5\text{ms}$).

---

## 4. System Implementation

- **Interface:** React 18, TypeScript, Recharts (vector graphics for continuous trajectory visualization).
- **Backend Infrastructure:** Cloudflare Pages Functions, Cloudflare D1 distributed SQLite.
- **Computational Core:** Pure TypeScript implementation with zero external math dependencies.

---

## 5. Setup and Execution

```bash
# 1. Clone repository
git clone https://github.com/HenriMafra/financial-loan-comparator.git
cd financial-loan-comparator

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

---

## 6. References

- Burden, R. L., & Faires, J. D. (2010). *Numerical Analysis* (9th ed.). Brooks/Cole.
- Central Bank of Brazil (BACEN). Resolution CMN n. 3.517/2007 (CET Calculation Standards).

---

## 7. License

Licensed under the MIT License. Copyright (c) Henri Mafra.
