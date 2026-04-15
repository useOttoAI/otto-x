import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import {
  paymentMiddleware,
  x402ResourceServer,
} from '@okxweb3/x402-express';
import { ExactEvmScheme } from '@okxweb3/x402-evm/exact/server';
import { OKXFacilitatorClient } from '@okxweb3/x402-core';

import { env } from './config/env.js';
import { NETWORK, routeConfig } from './config/x402.js';
import { swapRouter } from './routes/swap.js';
import { marketAlphaRouter } from './routes/market-alpha.js';
import { dexRouter } from './routes/dex.js';
import { proxyRouter } from './routes/proxy.js';
import { logger } from './lib/logger.js';
import { CURATED_TOKENS } from './lib/tokens.js';

const app = express();

// --- Proxy & CORS ---
app.set('trust proxy', 1);

app.use(cors({
  origin: '*',
  exposedHeaders: ['PAYMENT-RESPONSE', 'PAYMENT-REQUIRED'],
  methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
}));

app.use(express.json());

// --- Landing page (free) ---
app.get('/', (req: Request, res: Response): void => {
  const acceptHeader = req.headers.accept || '';
  const wantsHtml = acceptHeader.includes('text/html');

  if (!wantsHtml) {
    res.json({
      service: 'Otto X',
      description: 'x402-paywalled DeFi API on X Layer',
      chain: 'X Layer (196)',
      network: NETWORK,
      endpoints: Object.entries(routeConfig).map(([route, cfg]) => ({
        route,
        price: (cfg.accepts[0] as { price: string }).price,
        description: cfg.description,
      })),
      freeEndpoints: [
        { route: 'GET /', description: 'This page / service discovery' },
        { route: 'GET /health', description: 'Service health check' },
        { route: 'GET /tokens', description: 'Curated X Layer token registry' },
        { route: 'GET /llm.txt', description: 'AI-readable service catalog' },
        { route: 'GET /.well-known/x402', description: 'x402 discovery document' },
      ],
      links: {
        github: 'https://github.com/useOttoAI/otto-x',
        docs: 'https://docs.useotto.xyz',
      },
    });
    return;
  }

  res.send(`<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Otto X \u2014 x402 DeFi on X Layer</title>\n  <meta name=\"description\" content=\"Pay-per-call DeFi API on X Layer. Swap quotes, token pricing, and DEX data via x402 micro-payments. No API keys, no accounts.\">\n  <style>\n    *{box-sizing:border-box;margin:0;padding:0}\n    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:#0a0e14;color:#e8e8e8;min-height:100vh;line-height:1.5}\n    .wrap{max-width:760px;margin:0 auto;padding:4rem 1.5rem}\n    header{margin-bottom:3rem}\n    .brand{display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem}\n    .brand img{width:36px;height:36px;border-radius:8px}\n    .brand span{font-size:1.4rem;font-weight:600;letter-spacing:-0.02em}\n    .tagline{color:#aaa;font-size:1rem;line-height:1.6;max-width:520px}\n    .tagline strong{color:#fff}\n    .meta{display:flex;gap:1.5rem;margin-top:1.25rem;font-size:0.8rem;color:#666}\n    .meta span{display:flex;align-items:center;gap:0.4rem}\n    .dot{width:6px;height:6px;background:#3b3;border-radius:50%}\n    .features{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.75rem;margin-bottom:2.5rem}\n    .feature{padding:1rem;border:1px solid #1a2030;border-radius:8px;background:#0f1520}\n    .feature-title{font-size:0.85rem;font-weight:600;color:#fff;margin-bottom:0.35rem}\n    .feature-desc{font-size:0.75rem;color:#888;line-height:1.5}\n    .badge{font-size:0.65rem;padding:0.2rem 0.5rem;border-radius:4px;font-weight:500;display:inline-block;margin-top:0.5rem;margin-right:0.3rem}\n    .badge-xlayer{background:#f7931a20;color:#f7931a;border:1px solid #f7931a40}\n    .badge-x402{background:#3b82f620;color:#66a3ff;border:1px solid #3b82f640}\n    .badge-dex{background:#10b98120;color:#34d399;border:1px solid #10b98140}\n    section{margin-bottom:2.5rem}\n    h2{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.12em;color:#555;margin-bottom:1rem;font-weight:500}\n    .row{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:1rem;padding:0.875rem 1rem;border:1px solid #1a2030;border-radius:8px;margin-bottom:0.5rem;transition:border-color 0.2s}\n    .row:hover{border-color:#2a3545}\n    .row-left{display:flex;flex-direction:column;gap:0.2rem}\n    .path{font-family:'SF Mono',Monaco,Consolas,monospace;font-size:0.9rem;color:#fff}\n    .desc{font-size:0.8rem;color:#666}\n    .price{font-size:0.85rem;color:#4ade80;font-weight:500;min-width:60px;text-align:right}\n    .price.free-price{color:#888}\n    .actions{display:flex;gap:0.5rem}\n    .btn{padding:0.4rem 0.65rem;font-size:0.75rem;border:1px solid #333;border-radius:5px;background:transparent;color:#888;cursor:pointer;transition:all 0.15s}\n    .btn:hover{border-color:#555;color:#fff;background:#1a2030}\n    .btn.copied{border-color:#3b3;color:#3b3}\n    .how-it-works{padding:1.5rem;border:1px solid #1a2030;border-radius:8px;background:#0f1520;margin-bottom:2.5rem}\n    .how-it-works h3{font-size:0.9rem;margin-bottom:1rem;color:#fff}\n    .step{display:flex;gap:1rem;margin-bottom:0.75rem;font-size:0.85rem}\n    .step-num{width:24px;height:24px;border-radius:50%;background:#f7931a20;color:#f7931a;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:600;flex-shrink:0}\n    .step-text{color:#aaa}\n    .step-text code{color:#66a3ff;font-size:0.8rem}\n    .links{display:flex;flex-wrap:wrap;gap:0.75rem;margin-top:3rem;padding-top:2rem;border-top:1px solid #1a2030}\n    .links a{color:#777;text-decoration:none;font-size:0.8rem;padding:0.5rem 0.85rem;border:1px solid #1a2030;border-radius:6px;transition:all 0.2s}\n    .links a:hover{color:#fff;border-color:#444}\n    footer{margin-top:3rem;padding-top:1.5rem;border-top:1px solid #111;color:#555;font-size:0.75rem}\n    @media(max-width:560px){.wrap{padding:2rem 1rem}.row{grid-template-columns:1fr;gap:0.75rem}.price{text-align:left}.meta{flex-direction:column;gap:0.5rem}}\n  </style>\n</head>\n<body>\n  <div class=\"wrap\">\n    <header>\n      <div class=\"brand\"><img src=\"https://useotto.xyz/static/images/logo_nobg_200.png\" alt=\"Otto AI\" /><span>Otto X</span></div>\n      <p class=\"tagline\"><strong>Pay-per-call DeFi API</strong> on X Layer. Swap quotes, token pricing, and DEX data via x402 micro-payments. No API keys, no accounts, no subscriptions. The payment is the authentication.</p>\n      <div class=\"meta\"><span><span class=\"dot\"></span>Live on X Layer</span><span>Chain ID 196</span><span>15 paid endpoints</span><span>x402 protocol</span></div>\n    </header>\n    <div class=\"features\">\n      <div class=\"feature\"><div class=\"feature-title\">x402 Payments</div><div class=\"feature-desc\">HTTP 402 protocol \u2014 pay per call with on-chain micro-transactions. No API keys needed.</div><span class=\"badge badge-x402\">x402</span></div>\n      <div class=\"feature\"><div class=\"feature-title\">OKX DEX Aggregator</div><div class=\"feature-desc\">Best-route swap quotes and calldata across all X Layer DEX liquidity.</div><span class=\"badge badge-dex\">DEX v6</span></div>\n      <div class=\"feature\"><div class=\"feature-title\">X Layer Native</div><div class=\"feature-desc\">Built for X Layer mainnet. Low fees make $0.002 micro-payments viable.</div><span class=\"badge badge-xlayer\">X Layer</span></div>\n      <div class=\"feature\"><div class=\"feature-title\">Agent-Native</div><div class=\"feature-desc\">AI agents discover pricing via 402 responses and pay autonomously. No signup flow.</div><span class=\"badge badge-x402\">Agentic</span></div>\n    </div>\n    <div class=\"how-it-works\"><h3>How x402 Works</h3>\n      <div class=\"step\"><div class=\"step-num\">1</div><div class=\"step-text\">Send a normal HTTP request \u2014 e.g. <code>POST /swap</code></div></div>\n      <div class=\"step\"><div class=\"step-num\">2</div><div class=\"step-text\">Server returns <code>402 Payment Required</code> with price and payment address</div></div>\n      <div class=\"step\"><div class=\"step-num\">3</div><div class=\"step-text\">Construct an on-chain payment on X Layer for the exact amount</div></div>\n      <div class=\"step\"><div class=\"step-num\">4</div><div class=\"step-text\">Retry the request with payment proof in the header</div></div>\n      <div class=\"step\"><div class=\"step-num\">5</div><div class=\"step-text\">OKX Facilitator verifies payment, you get your data</div></div>\n    </div>\n    <section><h2>Free Endpoints</h2>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /health</div><div class=\"desc\">Service health check</div></div><div class=\"price free-price\">Free</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/health')\">Copy</button><button class=\"btn\" onclick=\"tryEndpoint('/health')\">Try</button></div></div>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /tokens</div><div class=\"desc\">Curated X Layer token registry</div></div><div class=\"price free-price\">Free</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/tokens')\">Copy</button><button class=\"btn\" onclick=\"tryEndpoint('/tokens')\">Try</button></div></div>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /llm.txt</div><div class=\"desc\">AI-readable service catalog</div></div><div class=\"price free-price\">Free</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/llm.txt')\">Copy</button><button class=\"btn\" onclick=\"tryEndpoint('/llm.txt')\">Try</button></div></div>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /.well-known/x402</div><div class=\"desc\">x402 discovery document</div></div><div class=\"price free-price\">Free</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/.well-known/x402')\">Copy</button><button class=\"btn\" onclick=\"tryEndpoint('/.well-known/x402')\">Try</button></div></div>\n    </section>\n    <section><h2>Paid Endpoints (x402)</h2>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">POST /swap</div><div class=\"desc\">DEX swap quote + unsigned calldata via OKX DEX Aggregator</div></div><div class=\"price\">$0.01</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/swap')\">Copy</button></div></div>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /market-alpha</div><div class=\"desc\">Live token pricing for curated X Layer tokens</div></div><div class=\"price\">$0.005</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/market-alpha')\">Copy</button></div></div>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /price<span style=\"color:#555\">?token=0x...</span></div><div class=\"desc\">Single token USD price via DEX quote</div></div><div class=\"price\">$0.002</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/price?token=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')\">Copy</button></div></div>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /all-tokens</div><div class=\"desc\">All tokens supported on X Layer DEX</div></div><div class=\"price\">$0.002</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/all-tokens')\">Copy</button></div></div>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /approve<span style=\"color:#555\">?token=0x...&amp;amount=N</span></div><div class=\"desc\">ERC-20 approval calldata for DEX router</div></div><div class=\"price\">$0.005</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/approve?token=0x779ded0c9e1022225f8e0630b35a9b54be713736&amount=1000000')\">Copy</button></div></div>\n    </section>\n    <section><h2>Market Intelligence (x402)</h2>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /crypto-news</div><div class=\"desc\">Real-time crypto news with sentiment analysis</div></div><div class=\"price\">$0.001</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/crypto-news')\">Copy</button></div></div>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /token-alpha<span style=\"color:#555\">?symbol=BTC</span></div><div class=\"desc\">Premium token intelligence — news, sentiment, futures</div></div><div class=\"price\">$0.10</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/token-alpha?symbol=BTC')\">Copy</button></div></div>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /kol-sentiment</div><div class=\"desc\">Aggregated sentiment from top 50 crypto KOLs</div></div><div class=\"price\">$0.10</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/kol-sentiment')\">Copy</button></div></div>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /trending-altcoins</div><div class=\"desc\">Top 3 trending altcoins with analysis</div></div><div class=\"price\">$0.10</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/trending-altcoins')\">Copy</button></div></div>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /mega-report</div><div class=\"desc\">Comprehensive daily market briefing</div></div><div class=\"price\">$0.25</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/mega-report')\">Copy</button></div></div>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /token-security<span style=\"color:#555\">?address=0x...</span></div><div class=\"desc\">Contract security audit — honeypot, rug pull risk</div></div><div class=\"price\">$0.10</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/token-security?address=0x779ded0c9e1022225f8e0630b35a9b54be713736')\">Copy</button></div></div>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /funding-rates<span style=\"color:#555\">?symbol=BTC</span></div><div class=\"desc\">Derivatives — funding rates, open interest, liquidations</div></div><div class=\"price\">$0.10</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/funding-rates?symbol=BTC')\">Copy</button></div></div>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /defi-analytics<span style=\"color:#555\">?protocol=aave</span></div><div class=\"desc\">DeFi protocol analytics — TVL, chain breakdown</div></div><div class=\"price\">$0.10</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/defi-analytics?protocol=aave')\">Copy</button></div></div>\n    </section>\n    <section><h2>AI Tools (x402)</h2>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /generate-meme<span style=\"color:#555\">?prompt=...</span></div><div class=\"desc\">AI image generation via Gemini 3 Pro</div></div><div class=\"price\">$0.50</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/generate-meme?prompt=a+bull+riding+a+rocket')\">Copy</button></div></div>\n      <div class=\"row\"><div class=\"row-left\"><div class=\"path\">GET /llm-research<span style=\"color:#555\">?prompt=...</span></div><div class=\"desc\">AI research assistant with web search</div></div><div class=\"price\">$0.50</div><div class=\"actions\"><button class=\"btn\" onclick=\"copyUrl('/llm-research?prompt=what+is+x402+protocol')\">Copy</button></div></div>\n    </section>\n    <div class=\"links\"><a href=\"https://github.com/useOttoAI/otto-x\" target=\"_blank\">GitHub</a><a href=\"https://docs.useotto.xyz\" target=\"_blank\">Docs</a><a href=\"https://web3.okx.com/onchainos\" target=\"_blank\">OKX Onchain OS</a><a href=\"https://web3.okx.com/xlayer\" target=\"_blank\">X Layer</a></div>\n    <footer>Otto X &mdash; Built for the OKX Build X Hackathon (Season 2). Powered by OKX Onchain OS + x402 protocol on X Layer.</footer>\n  </div>\n  <script>\n    const BASE = window.location.origin;\n    function copyUrl(path) { navigator.clipboard.writeText(BASE + path).then(() => { event.target.textContent = 'Copied!'; event.target.classList.add('copied'); setTimeout(() => { event.target.textContent = 'Copy'; event.target.classList.remove('copied'); }, 1500); }); }\n    function tryEndpoint(path) { window.open(BASE + path, '_blank'); }\n  </script>\n</body></html>`);
});

// --- Health check (free, no payment) ---
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Otto X',
    chain: 'X Layer (196)',
    network: NETWORK,
    timestamp: new Date().toISOString(),
  });
});

// --- Token list (free) ---
app.get('/tokens', (_req, res) => {
  res.json({
    status: 'success',
    data: {
      chain: 'X Layer (196)',
      tokens: CURATED_TOKENS,
    },
  });
});

// --- llm.txt (AI-readable service catalog, convention: llmstxt.org) ---
app.get('/llm.txt', (_req, res) => {
  res.type('text/plain').send(`# Otto X \u2014 x402 DeFi API on X Layer\n\n> Pay-per-call DeFi API. AI agents pay micro-fees via x402 protocol on X Layer (Chain 196).\n> No API keys. No accounts. The on-chain payment IS the authentication.\n\n## Paid Endpoints (x402 paywall)\n\nAll paid endpoints return HTTP 402 with payment instructions if no valid payment header is provided.\nPayments settle on X Layer mainnet (EIP-155, Chain ID 196) via OKX Facilitator.\n\n- POST /swap ($0.01): DEX swap quote + unsigned calldata via OKX DEX Aggregator. Params: fromToken, toToken, amount, userWalletAddress, slippage.\n- GET /market-alpha ($0.005): Live token pricing for curated X Layer tokens (OKB, WETH, USDT, USDG). Derived from real-time DEX quotes.\n- GET /price?token=0x... ($0.002): Single token USD price via DEX quote. Any X Layer token address.\n- GET /all-tokens ($0.002): Full list of all tokens supported on X Layer DEX aggregator.\n- GET /approve?token=0x...&amount=N ($0.005): ERC-20 approval calldata for DEX router. Required before swap for non-native tokens.\n\n## Market Intelligence (x402 paywall)\n\n- GET /crypto-news ($0.001): Real-time crypto news with sentiment analysis.\n- GET /token-alpha?symbol=BTC ($0.10): Premium token intelligence — news, Twitter sentiment, futures data.\n- GET /kol-sentiment ($0.10): Aggregated sentiment from top 50 crypto KOLs.\n- GET /trending-altcoins ($0.10): Top 3 trending altcoins with analysis.\n- GET /mega-report ($0.25): Comprehensive daily market briefing — headlines, sentiment, KOL alpha, trending, yield.\n- GET /token-security?address=0x...&chain=196 ($0.10): Token contract security audit — honeypot detection, rug pull risk.\n- GET /funding-rates?symbol=BTC ($0.10): Derivatives dashboard — funding rates, open interest, long/short ratios.\n- GET /defi-analytics?protocol=aave ($0.10): DeFi protocol analytics — TVL rankings, chain breakdown.\n\n## AI Tools (x402 paywall)\n\n- GET /generate-meme?prompt=... ($0.50): AI image generation via Gemini 3 Pro.\n- GET /llm-research?prompt=... ($0.50): AI research assistant with web search.\n\n## Free Endpoints\n\n- GET / : Interactive landing page (HTML) or JSON service discovery (Accept: application/json).\n- GET /health : Service health check.\n- GET /tokens : Curated X Layer token registry (USDT, USDG, OKB, WETH).\n- GET /llm.txt : This file \u2014 AI-readable service catalog.\n- GET /.well-known/x402 : x402 discovery document (JSON).\n\n## Quick Start (for agents)\n\n1. GET any paid endpoint without payment \u2192 receive 402 + payment details.\n2. Construct on-chain payment on X Layer for the specified amount.\n3. Retry request with payment proof in header.\n4. Receive DeFi data.\n\n## Links\n\n- GitHub: https://github.com/useOttoAI/otto-x\n- Docs: https://docs.useotto.xyz\n- OKX Onchain OS: https://web3.okx.com/onchainos\n`);
});

// --- .well-known/x402 discovery document ---
app.get('/.well-known/x402', (_req, res) => {
  res.json({
    version: '0.1.0',
    service: 'Otto X',
    description: 'x402-paywalled DeFi API on X Layer',
    chain: { name: 'X Layer', chainId: 196, network: NETWORK },
    facilitator: 'OKX Facilitator (Onchain OS)',
    paymentMethods: [
      { scheme: 'exact', network: NETWORK, description: 'Direct payment on X Layer (EIP-155:196)' },
    ],
    resources: Object.entries(routeConfig).map(([route, cfg]) => {
      const [method, path] = route.split(' ');
      return {
        method,
        path,
        price: (cfg.accepts[0] as { price: string }).price,
        description: cfg.description,
        mimeType: cfg.mimeType,
      };
    }),
    freeResources: [
      { method: 'GET', path: '/', description: 'Landing page / JSON service discovery' },
      { method: 'GET', path: '/health', description: 'Health check' },
      { method: 'GET', path: '/tokens', description: 'Curated token registry' },
      { method: 'GET', path: '/llm.txt', description: 'AI-readable service catalog' },
      { method: 'GET', path: '/.well-known/x402', description: 'This discovery document' },
    ],
    links: {
      github: 'https://github.com/useOttoAI/otto-x',
      docs: 'https://docs.useotto.xyz',
      llmTxt: '/llm.txt',
    },
  });
});

// --- x402 payment middleware ---
const facilitatorClient = new OKXFacilitatorClient({
  apiKey: env.OKX_API_KEY,
  secretKey: env.OKX_SECRET_KEY,
  passphrase: env.OKX_PASSPHRASE,
});

const resourceServer = new x402ResourceServer(facilitatorClient);
resourceServer.register(NETWORK, new ExactEvmScheme());

app.use(paymentMiddleware(routeConfig, resourceServer));

// --- Paid routes (behind x402 paywall) ---
app.use(swapRouter);
app.use(marketAlphaRouter);
app.use(dexRouter);
app.use(proxyRouter);

// --- Global error middleware (JSON, no HTML leaks) ---
app.use((err: Error & { status?: number; statusCode?: number }, req: Request, res: Response, _next: NextFunction): void => {
  const status = err.status || err.statusCode || 500;
  logger.error('Unhandled error', {
    message: err.message,
    path: req.path,
    method: req.method,
    status,
  });
  res.status(status).json({
    status: 'error',
    data: status < 500 ? err.message : 'Internal server error',
  });
});

// --- Start server ---
app.listen(env.PORT, () => {
  logger.info('Otto X server started', {
    port: env.PORT,
    network: NETWORK,
    routes: Object.keys(routeConfig),
    payTo: env.PAY_TO_ADDRESS || '(not set)',
  });
});
