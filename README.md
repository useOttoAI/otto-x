# Otto X — x402 DeFi API on X Layer

> **Built for the OKX Build X Series — AI Season**

Otto X is a pay-per-call DeFi API on X Layer, powered by the x402 protocol. AI agents and developers pay a micro-fee per request — no API keys, no subscriptions, no sign-up. The payment authorizes the call.

**40+ paid endpoints** span market intelligence, token safety, derivatives, DeFi yield, on-chain execution, and **Recipes** — which chain multiple Otto intelligence endpoints into one call and one x402 payment.

**Live:** [xlayer.ottoai.services](https://xlayer.ottoai.services)
**Recipes:** [xlayer.ottoai.services/recipes](https://xlayer.ottoai.services/recipes)
**Discovery:** [`/.well-known/x402`](https://xlayer.ottoai.services/.well-known/x402) — the always-current machine catalog (prices and counts derive from here)
**Payment address:** `0xa3db6825de8222e9f8bac136eeb2f65d49a88fcf`

---

## ⭐ Recipes — the flagship

OKX's own x402 docs frame the hard problem as *"agent tasks that chain many paid endpoints"* — a job that otherwise means discovering, calling, and orchestrating several endpoints client-side, then stitching the results together.

**Recipes collapse that orchestration.** A recipe chains multiple Otto intelligence endpoints into one call and one x402 payment: it runs several upstream legs **server-side** and returns one result — the caller makes one request instead of wiring up many. Each leg is either **core** (load-bearing) or best-effort. If a recipe can't assemble its **core** result, it returns an error and the payment never settles; best-effort legs that can't resolve are **named** in the response as unavailable rather than fabricated.

| Recipe | Price | What one call answers |
|--------|-------|-----------------------|
| [`GET /vet-token`](https://xlayer.ottoai.services/vet-token) | `$0.01` | *Is this X Layer token safe and actually tradeable?* — GoPlus contract security (honeypot, tax, mint/ownership) + holder concentration + live OKX DEX tradeability & price |
| [`GET /token-deep-dive`](https://xlayer.ottoai.services/token-deep-dive) | `$0.05` | *Full picture on a major token* — price & market cap + contract security + derivatives funding/OI + KOL context + OKX DEX price |
| [`GET /rwa-pulse`](https://xlayer.ottoai.services/rwa-pulse) | `$0.05` | *What's moving across tokenized real-world assets?* — TradFi macro (indices, VIX, DXY, yields, commodities) + RWA-relevant news, live legs only |
| [`GET /mega-report`](https://xlayer.ottoai.services/mega-report) | `$0.05` | *The full daily market briefing* — headlines, sentiment, KOL alpha, trending, yield |

The recipe manifest (`src/config/recipes.ts`) is the single source of truth: step counts and the live recipe set are **derived** from it, never hand-typed, so the storefront and the free `/api/recipes` index render straight from the manifest. Any agent builder on X Layer can reuse the primitive: collapse a paid-endpoint chain into one composed call.

---

## Endpoint highlights

The full, always-current catalog is [`/.well-known/x402`](https://xlayer.ottoai.services/.well-known/x402). A representative slice:

### Market intelligence
| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /crypto-news` | `$0.001` | Real-time crypto news with sentiment |
| `GET /kol-sentiment` | `$0.001` | Aggregated sentiment from top 50 crypto KOLs |
| `GET /token-security` | `$0.001` | Contract security audit — honeypot, rug-pull risk, tax |
| `GET /funding-rates` | `$0.001` | Derivatives dashboard — funding, open interest, long/short |
| `GET /trending-altcoins` | `$0.001` | Top 3 trending altcoins with analysis |
| `GET /tradfi-data` | `$0.001` | TradFi macro — indices, VIX, DXY, yields, commodities |
| `GET /llm-research` | `$0.10` | AI research assistant with web search |
| `GET /generate-meme` | `$0.15` | AI image generation |

### On-chain execution (Otto X sub-wallet)
| Endpoint | Price | Description |
|----------|-------|-------------|
| `POST /auto-swap` | `$0.05` | Execute an in-chain swap via OKX DEX aggregator |
| `POST /auto-bridge` | `$0.05` | Execute a cross-chain bridge |
| `POST /auto-defi-invest` | `$0.05` | Deposit into a whitelisted DeFi protocol (Aave V3, Lido, Compound V3, …) |
| `POST /yield-copilot` | `$0.05` | Deploy idle stablecoins into the highest-APY allowlisted vault |
| `POST /auto-withdraw` | `$0.05` | Escape hatch — sweep the sub-wallet to any external address |

### DEX & tokens
| Endpoint | Price | Description |
|----------|-------|-------------|
| `POST /swap` | `$0.01` | Swap quote + calldata on X Layer via OKX DEX |
| `GET /price` | `$0.002` | Single token USD price via OKX DEX quote |
| `GET /all-tokens` | `$0.002` | Full token list on X Layer DEX |
| `GET /approve` | `$0.005` | ERC-20 approval calldata for the DEX router |

### Free
| Endpoint | Description |
|----------|-------------|
| `GET /` | Landing page + JSON discovery |
| `GET /health` | Service health |
| `GET /recipes` | Recipes catalog (HTML) |
| `GET /api/recipes` | Recipes index (JSON) |
| `GET /llm.txt` | AI-readable service catalog |
| `GET /.well-known/x402` | x402 discovery document |

Prices range from `$0.001` single reads to `$0.15`. Payment tokens: USDT0 / USDC / USDG on X Layer.

---

## How x402 works

The `exact` payment flow:

```
1. Send request  →  GET /vet-token?address=0x…
2. Get 402       ←  Payment Required ($0.01, X Layer address, accepts)
3. Sign payment  →  EIP-3009 authorization for the quoted amount on X Layer
4. Retry + proof →  same request + PAYMENT-SIGNATURE header
5. Get data      ←  the composed result
```

No API keys, no OAuth, no sign-up — the payment authorizes the call. The live Otto X service advertises both x402 schemes: **`exact`** (direct payment on X Layer, shown above) and **`aggr_deferred`** (APP Batch payment — Session Key signing, TEE-aggregated settlement). This reference implementation registers the `exact` scheme.

---

## Architecture

```
Client (AI agent or developer)
    │  HTTP + x402 payment header
    ▼
┌────────────────────────────────────────────┐
│                Otto X Server                │
│                                             │
│  x402 middleware (OKX Facilitator)          │
│  verifies on-chain payment on X Layer       │
│                                             │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐  │
│  │ DEX      │ │ Intel /    │ │ Recipes    │  │
│  │ routes   │ │ execution  │ │ engine     │  │
│  │ (OKX     │ │ routes     │ │ (compose N │  │
│  │  Aggr.)  │ │            │ │  legs → 1) │  │
│  └──────────┘ └───────────┘ └────────────┘  │
└────────────────────────────────────────────┘
         │             │              │
   OKX DEX API    Otto AI backends   composed
   (X Layer)      (intelligence)     artifact
```

The Recipes engine (`src/lib/recipe-engine.ts`) resolves each leg id to its fetcher — a proxied intelligence read or a native OKX-DEX call — runs them, and merges the results into one response, naming any best-effort leg that is unavailable rather than inventing a value for it.

---

## OKX Onchain OS usage

| Module | Usage |
|--------|-------|
| **x402 SDK** (`@okxweb3/x402-express`, `@okxweb3/x402-evm`, `@okxweb3/x402-core`) | Payment middleware gating every paid endpoint via `OKXFacilitatorClient` on X Layer |
| **DEX Aggregator API** | Swap quotes, token pricing, registry, and approvals on chain 196 |
| **OKX Facilitator (Onchain OS)** | On-chain verification of x402 payments in USDT0 / USDC / USDG |
| **Agentic Wallet** | On-chain identity + Session-Key batch settlement (`aggr_deferred`) |

---

## Quick start

```bash
git clone https://github.com/useOttoAI/otto-x.git
cd otto-x
npm install
cp .env.example .env
# Fill in OKX API credentials + payment address
npm run dev
```

Then hit a free route to see discovery, or a paid one to get a 402 challenge:

```bash
curl http://localhost:4196/.well-known/x402          # this service's discovery doc
curl "http://localhost:4196/vet-token?address=0x…"   # 402 Payment Required
```

---

## License

MIT — see [LICENSE](./LICENSE).
