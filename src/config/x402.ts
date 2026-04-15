import { env } from './env.js';

export const NETWORK: `${string}:${string}` = 'eip155:196'; // X Layer Mainnet

export const routeConfig = {
  'POST /swap': {
    accepts: [
      {
        scheme: 'exact',
        network: NETWORK,
        payTo: env.PAY_TO_ADDRESS,
        price: '$0.01',
      },
    ],
    description: 'Get swap quote + calldata on X Layer via OKX DEX (V1: not broadcast)',
    mimeType: 'application/json',
  },
  'GET /market-alpha': {
    accepts: [
      {
        scheme: 'exact',
        network: NETWORK,
        payTo: env.PAY_TO_ADDRESS,
        price: '$0.005',
      },
    ],
    description: 'X Layer token market intelligence — live pricing for curated tokens',
    mimeType: 'application/json',
  },
  'GET /price': {
    accepts: [
      {
        scheme: 'exact',
        network: NETWORK,
        payTo: env.PAY_TO_ADDRESS,
        price: '$0.002',
      },
    ],
    description: 'Single token USD price via OKX DEX quote',
    mimeType: 'application/json',
  },
  'GET /all-tokens': {
    accepts: [
      {
        scheme: 'exact',
        network: NETWORK,
        payTo: env.PAY_TO_ADDRESS,
        price: '$0.002',
      },
    ],
    description: 'Full list of all tokens supported on X Layer DEX',
    mimeType: 'application/json',
  },
  'GET /approve': {
    accepts: [
      {
        scheme: 'exact',
        network: NETWORK,
        payTo: env.PAY_TO_ADDRESS,
        price: '$0.005',
      },
    ],
    description: 'ERC-20 approval calldata for DEX router (needed before swap)',
    mimeType: 'application/json',
  },

  // --- Proxied: Market Intelligence (Market Alpha Agent) ---
  'GET /crypto-news': {
    accepts: [{ scheme: 'exact', network: NETWORK, payTo: env.PAY_TO_ADDRESS, price: '$0.001' }],
    description: 'Real-time crypto news with sentiment analysis',
    mimeType: 'application/json',
  },
  'GET /token-alpha': {
    accepts: [{ scheme: 'exact', network: NETWORK, payTo: env.PAY_TO_ADDRESS, price: '$0.10' }],
    description: 'Premium token intelligence — news, Twitter sentiment, futures data',
    mimeType: 'application/json',
  },
  'GET /kol-sentiment': {
    accepts: [{ scheme: 'exact', network: NETWORK, payTo: env.PAY_TO_ADDRESS, price: '$0.10' }],
    description: 'Aggregated sentiment from top 50 crypto KOLs',
    mimeType: 'application/json',
  },
  'GET /trending-altcoins': {
    accepts: [{ scheme: 'exact', network: NETWORK, payTo: env.PAY_TO_ADDRESS, price: '$0.10' }],
    description: 'Top 3 trending altcoins with analysis',
    mimeType: 'application/json',
  },
  'GET /mega-report': {
    accepts: [{ scheme: 'exact', network: NETWORK, payTo: env.PAY_TO_ADDRESS, price: '$0.25' }],
    description: 'Comprehensive daily market briefing — headlines, sentiment, KOL alpha, trending, yield',
    mimeType: 'application/json',
  },
  'GET /token-security': {
    accepts: [{ scheme: 'exact', network: NETWORK, payTo: env.PAY_TO_ADDRESS, price: '$0.10' }],
    description: 'Token contract security audit — honeypot detection, rug pull risk, tax analysis',
    mimeType: 'application/json',
  },
  'GET /funding-rates': {
    accepts: [{ scheme: 'exact', network: NETWORK, payTo: env.PAY_TO_ADDRESS, price: '$0.10' }],
    description: 'Derivatives dashboard — funding rates, open interest, long/short ratios',
    mimeType: 'application/json',
  },
  'GET /defi-analytics': {
    accepts: [{ scheme: 'exact', network: NETWORK, payTo: env.PAY_TO_ADDRESS, price: '$0.10' }],
    description: 'DeFi protocol analytics — TVL rankings, chain breakdown, gainers/losers',
    mimeType: 'application/json',
  },

  // --- Proxied: AI Creative Tools (Tools Agent) ---
  'GET /generate-meme': {
    accepts: [{ scheme: 'exact', network: NETWORK, payTo: env.PAY_TO_ADDRESS, price: '$0.50' }],
    description: 'AI image generation via Gemini 3 Pro',
    mimeType: 'application/json',
  },
  'GET /llm-research': {
    accepts: [{ scheme: 'exact', network: NETWORK, payTo: env.PAY_TO_ADDRESS, price: '$0.50' }],
    description: 'AI research assistant with web search via Gemini',
    mimeType: 'application/json',
  },
};
