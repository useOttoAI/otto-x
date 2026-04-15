# Otto X — x402 DeFi API on X Layer

> **Built for the OKX Build X Hackathon — Season 2**

Otto X is a pay-per-call DeFi API on X Layer powered by the x402 protocol. AI agents and developers pay micro-fees ($0.001–$0.50) per request — no API keys, no subscriptions, no accounts. The on-chain payment IS the authentication.

**Live:** [xlayer.ottoai.services](https://xlayer.ottoai.services)  
**Agentic Wallet:** `0xa3db6825de8222e9f8bac136eeb2f65d49a88fcf`

## Endpoints (15 Paid + 5 Free)

### X Layer DEX (OKX DEX Aggregator)

| Endpoint | Price | Description |
|----------|-------|-------------|
| `POST /swap` | $0.01 | DEX swap quotes + unsigned calldata |
| `GET /market-alpha` | $0.005 | Live token pricing from DEX quotes |
| `GET /price?token=0x...` | $0.002 | Single token USD price |
| `GET /all-tokens` | $0.002 | All tokens on X Layer DEX |
| `GET /approve?token=0x...&amount=N` | $0.005 | ERC-20 approval calldata |

### Market Intelligence

| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /crypto-news` | $0.001 | Real-time crypto news with sentiment |
| `GET /token-alpha?symbol=BTC` | $0.10 | Premium token intelligence |
| `GET /kol-sentiment` | $0.10 | Aggregated KOL sentiment (top 50) |
| `GET /trending-altcoins` | $0.10 | Top 3 trending altcoins |
| `GET /mega-report` | $0.25 | Comprehensive daily market briefing |
| `GET /token-security?address=0x...` | $0.10 | Contract security audit |
| `GET /funding-rates?symbol=BTC` | $0.10 | Derivatives funding rates & OI |
| `GET /defi-analytics?protocol=aave` | $0.10 | DeFi protocol analytics |

### AI Tools

| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /generate-meme?prompt=...` | $0.50 | AI image generation (Gemini) |
| `GET /llm-research?prompt=...` | $0.50 | AI research assistant |

### Free

| Endpoint | Description |
|----------|-------------|
| `GET /` | Landing page + JSON discovery |
| `GET /health` | Service health check |
| `GET /tokens` | Curated token registry (16 tokens) |
| `GET /llm.txt` | AI-readable service catalog |
| `GET /.well-known/x402` | x402 discovery document |

## How x402 Works

```
1. Send request  →  POST /swap
2. Get 402       ←  Payment Required ($0.01, X Layer address)
3. Pay on-chain  →  Transfer on X Layer mainnet
4. Retry + proof →  POST /swap + payment header
5. Get data      ←  Swap quote + calldata
```

No API keys. No OAuth. No accounts. The payment IS the authentication.

## Architecture

```
Client (AI Agent or Developer)
    │
    │ HTTP + x402 payment header
    ▼
┌────────────────────────────────────────┐
│            Otto X Server               │
│                                        │
│  x402 Middleware (OKX Facilitator)      │
│  Verifies on-chain payment on X Layer  │
│                                        │
│  ┌──────────┐  ┌────────────────────┐  │
│  │ DEX      │  │ Proxy Routes       │  │
│  │ Routes   │  │ (Market Intel,     │  │
│  │ (OKX     │  │  AI Tools)         │  │
│  │  Aggr.)  │  │                    │  │
│  └──────────┘  └────────────────────┘  │
└────────────────────────────────────────┘
         │                    │
    OKX DEX API        Otto AI Agents
    (X Layer)          (Market Alpha,
                        Tools Agent)
```

## OKX Onchain OS Usage

| Module | Usage |
|--------|-------|
| **x402 SDK** (`@okxweb3/x402-express`, `@okxweb3/x402-evm`, `@okxweb3/x402-core`) | Payment middleware gating all 15 paid endpoints via `OKXFacilitatorClient` on X Layer |
| **DEX Aggregator API v6** | HMAC-authenticated calls for swap quotes, token pricing, registry, and approvals on chain 196 |
| **Agentic Wallet** | Project on-chain identity created via Onchain OS CLI |
| **OKX API Auth** | HMAC-SHA256 request signing for all DEX interactions |

## Token Registry (16 Curated Tokens)

| Category | Tokens |
|----------|--------|
| **Native** | OKB |
| **Stablecoins** | USDT, USDG, USDC, USDe, frxUSD |
| **Wrapped** | WETH, WOKB, XBTC, XETH, XSOL, XOKSOL |
| **DeFi** | sUSDe, rsETH, LINK |
| **Meme** | XDOG |

The paid `/all-tokens` endpoint returns the full list from OKX DEX (100+ tokens).

## Quick Start

```bash
git clone https://github.com/useOttoAI/otto-x.git
cd otto-x
npm install
cp .env.example .env
# Fill in OKX API credentials + payment address
npm run dev
```

```bash
# Health check (free)
curl http://localhost:4196/health

# Token list (free)
curl http://localhost:4196/tokens

# Swap quote (returns 402 — payment required)
curl -X POST http://localhost:4196/swap \
  -H "Content-Type: application/json" \
  -d '{"fromToken":"USDT","toToken":"OKB","amount":"10","userWalletAddress":"0x..."}'
```

## Project Structure

```
src/
  config/
    env.ts              # Environment variables
    x402.ts             # x402 route pricing (15 endpoints)
  lib/
    amounts.ts          # Token decimal conversion
    logger.ts           # Structured logging
    tokens.ts           # Curated 16-token registry
  okx/
    auth.ts             # HMAC-SHA256 request signing
    dex-client.ts       # OKX DEX Aggregator client
    http.ts             # Authenticated HTTP client
    market-client.ts    # Token pricing via DEX quotes
  routes/
    dex.ts              # /price, /all-tokens, /approve
    market-alpha.ts     # /market-alpha
    proxy.ts            # Proxied market intel + AI tools
    swap.ts             # /swap
  services/
    market-alpha-service.ts
    swap-service.ts
  types/
    okx.ts
    swap.ts
  index.ts              # Server, landing page, middleware
```

## Team

**Otto AI** — autonomous DeFi agent infrastructure.  
- Website: [useotto.xyz](https://useotto.xyz)  
- Docs: [docs.useotto.xyz](https://docs.useotto.xyz)  
- Twitter: [@useOttoAI](https://x.com/useOttoAI)

## License

MIT
