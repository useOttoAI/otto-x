/**
 * Recipe engine — parallel, degradation-aware fan-out that composes several
 * upstream legs into one paid artifact, enforcing the #1 rule: a buyer is
 * NEVER charged for a hollow result.
 *
 * Contract:
 *  - Legs run in parallel (Promise.allSettled). A leg that throws or returns
 *    no usable data is marked not-ok.
 *  - If ANY `core` leg is not-ok -> refuse with a >=400 status. On the OKX
 *    `exact` scheme a status >=400 means the middleware SKIPS settlement, so
 *    the buyer pays nothing.
 *  - Otherwise 200 with the composed sections, and every not-ok NON-core leg
 *    is NAMED in `degraded[]` (never silently omitted).
 *  - Self-toll guard: a leg may only hit an Otto AI backend (paywall-bypassed
 *    with the internal API-key header) or a native library function — NEVER
 *    Otto X's own public host (that loops through the paywall and self-tolls).
 */
import { env } from '../config/env.js';
import { proxyToBackend } from '../routes/proxy.js';
import { getTokenPrice } from '../okx/market-client.js';
import { getAllTokens } from '../okx/dex-client.js';
import { CURATED_TOKENS } from './tokens.js';
import { searchTokens } from './token-registry.js';
import type { RecipeSpec } from '../config/recipes.js';

export interface AssembledLeg {
  id: string;
  label: string;
  core: boolean;
  ok: boolean;
  data: unknown | null;
  error: string | null;
}

export interface RecipeResponse {
  status: number;
  body: unknown;
}

export type LegFetcher = () => Promise<unknown>;

/** Per-leg fan-out timeout (fast proxied/native reads run in parallel). */
const LEG_TIMEOUT_MS = 20_000;

/**
 * A recipe leg may only hit an Otto AI backend, never Otto X's own public host
 * (that loops through the paywall and self-tolls) and never a loopback. Parse
 * the URL and check the HOSTNAME exactly — a substring denylist missed the
 * canonical alias `xlayer.useotto.xyz`, IPv6 `::1`, and redirect hosts. An
 * unparseable URL is refused too (fail closed).
 */
/** Parse a URL to a normalised hostname (lowercase, IPv6 brackets + FQDN
 *  trailing dot stripped), or null if it can't be parsed. */
function backendHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  } catch {
    return null;
  }
}

/**
 * ALLOWLIST of the exact backend hostnames a recipe leg may fan out to — built
 * from the configured backend URLs at load. A denylist can't tell our OWN host
 * from a backend's (both may share a hosting suffix), and it can't catch DNS
 * loopback aliases (127.0.0.1.nip.io); an allowlist of the actual MA/Tools
 * hosts rejects everything else — self, loopback, and typos alike.
 */
const ALLOWED_BACKEND_HOSTS: ReadonlySet<string> = new Set(
  [backendHost(env.MARKET_ALPHA_X402_URL), backendHost(env.TOOLS_AGENT_X402_URL)].filter(
    (h): h is string => !!h,
  ),
);

function assertBackendUrl(url: string): void {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`recipe-engine: refusing to fan out to unparseable URL "${url}" (self-toll guard).`);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(`recipe-engine: refusing non-http(s) URL "${url}" (self-toll guard).`);
  }
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!ALLOWED_BACKEND_HOSTS.has(host)) {
    throw new Error(
      `recipe-engine: refusing to fan out to "${url}" (host ${host}) — not an allowlisted ` +
        `backend (MARKET_ALPHA_X402_URL / TOOLS_AGENT_X402_URL). Self-toll guard.`,
    );
  }
}

/** Non-empty check — the teeth of the #1-rule core guard. */
function hasUsableData(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v as object).length > 0;
  return true;
}

/**
 * Call an Otto AI backend endpoint with the internal key (paywall bypass) and
 * unwrap its `{status:'success', data|report|security}` envelope. Throws on a
 * >=400 status or a failure envelope so allSettled marks the leg not-ok.
 */
async function proxyLeg(
  backendUrl: string,
  path: string,
  params?: Record<string, string>,
  timeoutMs: number = LEG_TIMEOUT_MS,
): Promise<unknown> {
  assertBackendUrl(backendUrl);
  const { status, data } = await proxyToBackend(backendUrl, path, params, timeoutMs);
  if (status >= 400) {
    throw new Error(`${path} -> HTTP ${status}`);
  }
  const env2 = data as Record<string, unknown> | null;
  if (env2 && typeof env2 === 'object') {
    const st = env2.status;
    if (st === 'error' || st === 'failed') {
      throw new Error(`${path} -> ${String(env2.data ?? env2.error ?? 'upstream error')}`);
    }
    // If the envelope declares a `data` payload, that IS the leg's result — a
    // present-but-empty `data` (e.g. {status:'success', data:{}}) is a hollow
    // success and MUST fail the leg, never fall back to the non-empty outer
    // envelope (which would let a hollow core settle a 200 — the #1-rule hole
    // a review flagged). Same for a top-level `report`-less/`security`-less body.
    if ('data' in env2) {
      if (!hasUsableData(env2.data)) throw new Error(`${path} -> empty data payload`);
      return env2.data;
    }
  }
  return data;
}

// ---------------------------------------------------------------------------
// Symbol -> X Layer contract resolution (for token-deep-dive's native + security
// legs). Majors only; unresolved -> null (the leg degrades, never fabricates).
// ---------------------------------------------------------------------------
// X Layer lists the majors under wrapped symbols (XBTC/XETH/XSOL), so a buyer
// typing the common ticker must be mapped to the on-chain symbol or the security
// + DEX-price legs silently degrade for exactly the "best-covered majors" we
// advertise (BTC/ETH/SOL otherwise resolve to null on chain 196).
const MAJOR_SYMBOL_ALIASES: Record<string, string> = {
  BTC: 'XBTC',
  ETH: 'XETH',
  SOL: 'XSOL',
};

async function resolveXLayerAddress(symbol: string): Promise<string | null> {
  const raw = symbol.trim().toUpperCase();
  const sym = MAJOR_SYMBOL_ALIASES[raw] ?? raw;
  const curated = CURATED_TOKENS.find((t) => t.symbol.toUpperCase() === sym);
  if (curated?.address) return curated.address.toLowerCase();
  try {
    // Resolve the symbol against X Layer's (chain 196) token registry.
    const hits = await searchTokens(sym, 196);
    const exact = hits.find((h) => h.symbol.toUpperCase() === sym && h.address);
    if (exact?.address) return exact.address.toLowerCase();
  } catch {
    /* registry miss -> unresolved (leg degrades, never fabricates) */
  }
  return null;
}

// ---------------------------------------------------------------------------
// Per-recipe leg fetcher builders. Each returns a map keyed by the manifest's
// leg ids, so the manifest and the engine can NEVER silently disagree.
// ---------------------------------------------------------------------------

/**
 * A GoPlus scan of a token that isn't really on chain 196 comes back as a hollow
 * placeholder (tokenName "Unknown", holderCount "0", no flags) rather than an
 * error — structurally non-empty but with zero observations. Charging for that
 * violates the #1 rule. A REAL scan has a name, or holders, or at least one flag.
 */
function isRealSecurityScan(body: unknown): boolean {
  const b = body as { security?: unknown } | null;
  const s = (b?.security ?? b) as
    | { tokenName?: unknown; holderCount?: unknown; flags?: unknown }
    | null;
  if (!s || typeof s !== 'object') return false;
  const name = String(s.tokenName ?? '').trim().toLowerCase();
  const holders = Number(String(s.holderCount ?? '0').replace(/[^0-9]/g, '')) || 0;
  const flags = Array.isArray(s.flags) ? s.flags : [];
  return (name.length > 0 && name !== 'unknown') || holders > 0 || flags.length > 0;
}

/**
 * /token-details returns a formatted STRING report ({status:'success',
 * details:"…"}); a total lookup failure already 500s. A real report carries the
 * token name and at least one number — an all-"N/A" placeholder does not. Reject
 * the latter so /token-deep-dive's CORE never settles a hollow briefing.
 */
function isRealTokenDetails(body: unknown): boolean {
  const d = (body as { details?: unknown } | null)?.details;
  if (typeof d !== 'string' || d.trim().length <= 20) return false;
  // A real report carries an actual monetary value ($<n>) or a signed change
  // (+/-<n>); an all-"N/A" placeholder has neither (a bare "24h" label has a
  // digit, so a plain \d test is fooled).
  return /\$\s*[\d]/.test(d) || /[+-]\s*\d/.test(d);
}

function vetTokenFetchers(address: string): Record<string, LegFetcher> {
  const MA = env.MARKET_ALPHA_X402_URL;
  // Fetch security ONCE; holders is a projection of the same payload.
  const securityP = proxyLeg(MA, '/token-security', { address, chain: '196' });
  return {
    security: async () => {
      const body = await securityP;
      if (!isRealSecurityScan(body)) {
        throw new Error('security scan returned no observations (token not on X Layer chain 196?)');
      }
      return body;
    },
    holders: async () => {
      const sec = (await securityP) as { security?: { topHolders?: unknown; holderCount?: unknown } };
      const s = sec?.security ?? sec;
      const holders = (s as { topHolders?: unknown })?.topHolders;
      const holderCount = (s as { holderCount?: unknown })?.holderCount;
      if (!hasUsableData(holders) && !hasUsableData(holderCount)) throw new Error('no holder data');
      return { topHolders: holders ?? [], holderCount: holderCount ?? null };
    },
    'dex-liquidity': async () => {
      const price = await getTokenPrice(address.toLowerCase());
      const listed = (await getAllTokens()).some(
        (t) => (t.tokenContractAddress || '').toLowerCase() === address.toLowerCase(),
      );
      if (!price && !listed) throw new Error('not tradeable on OKX DEX');
      return { dexListed: listed, tradeable: !!price, price: price ?? null, source: 'OKX DEX Aggregator' };
    },
  };
}

function tokenDeepDiveFetchers(symbol: string, address: string | null): Record<string, LegFetcher> {
  const MA = env.MARKET_ALPHA_X402_URL;
  return {
    details: async () => {
      const body = await proxyLeg(MA, '/token-details', { symbol });
      if (!isRealTokenDetails(body)) throw new Error(`no real token details for ${symbol}`);
      return body;
    },
    // Non-core: a hollow scan degrades (named in degraded_legs), never shows Unknown.
    security: async () => {
      if (!address) throw new Error(`no X Layer contract resolved for ${symbol}`);
      const body = await proxyLeg(MA, '/token-security', { address, chain: '196' });
      if (!isRealSecurityScan(body)) throw new Error(`security scan returned no observations for ${symbol}`);
      return body;
    },
    funding: () => proxyLeg(MA, '/funding-rates', { symbol }),
    'kol-context': () => proxyLeg(MA, '/kol-sentiment'),
    'dex-price': () =>
      address
        ? getTokenPrice(address).then((p) => {
            if (!p) throw new Error('no DEX price');
            return { ...p, source: 'OKX DEX Aggregator' };
          })
        : Promise.reject(new Error(`no X Layer contract resolved for ${symbol}`)),
  };
}

/**
 * When Yahoo totally fails, the macro overview still returns 200 with every quote
 * zeroed (price 0, change "N/A") — a hollow success. tradfi is /rwa-pulse's core
 * leg, so charging for an all-zero macro violates the #1 rule. A real macro has
 * a positive VIX, DXY, or index level.
 */
function hasRealMacro(body: unknown): boolean {
  const macro = (body as { macro?: unknown } | null)?.macro as
    | { volatility?: { vix?: unknown }; dollar?: { dxy?: unknown }; indices?: Array<{ price?: unknown }> }
    | undefined;
  if (!macro) return false;
  const vix = Number(macro.volatility?.vix) || 0;
  const dxy = Number(macro.dollar?.dxy) || 0;
  const idxMax = Math.max(0, ...(macro.indices ?? []).map((i) => Number(i?.price) || 0));
  return vix > 0 || dxy > 0 || idxMax > 0;
}

function rwaPulseFetchers(): Record<string, LegFetcher> {
  const MA = env.MARKET_ALPHA_X402_URL;
  // Live legs only. The Hyperliquid tokenized-equity-perps leg was CUT: HIP-3
  // equities live in named DEXes (allMids({dex:"…"})) that this service's
  // public HL client can't query, so any attempt would either fabricate or
  // always come back empty — dropping it is the honest call (the RWA ruling:
  // compose LIVE legs only, drop legs that would fabricate).
  return {
    tradfi: async () => {
      const body = await proxyLeg(MA, '/tradfi-data');
      if (!hasRealMacro(body)) throw new Error('TradFi macro returned no live values (upstream down?)');
      return body;
    },
    'rwa-news': () => proxyLeg(MA, '/crypto-news'),
  };
}

// ---------------------------------------------------------------------------
// Shared runner
// ---------------------------------------------------------------------------

/**
 * Fan out a recipe's legs and assemble the composed response with the #1-rule
 * core guard. `activeLegIds` lets a recipe (e.g. rwa-pulse) drop an optional
 * leg that isn't live this run — dropped legs are neither charged-for nor faked.
 */
export async function runRecipe(
  spec: RecipeSpec,
  fetchers: Record<string, LegFetcher>,
): Promise<RecipeResponse> {
  // Only run legs that (a) are declared in the manifest and (b) have a fetcher
  // available this run. A manifest core leg with NO fetcher is a hard refusal
  // (never a silent skip of something load-bearing).
  const legs = spec.legs.filter((l) => fetchers[l.id]).slice();

  const missingCore = spec.legs.filter((l) => l.core && !fetchers[l.id]);
  if (missingCore.length > 0) {
    return {
      status: 500,
      body: {
        status: 'error',
        recipe: spec.id,
        data: `Recipe misconfigured: no fetcher for core leg(s) ${missingCore
          .map((l) => l.id)
          .join(', ')}. No charge.`,
      },
    };
  }

  const settled = await Promise.allSettled(legs.map((l) => fetchers[l.id]()));
  const assembled: AssembledLeg[] = legs.map((l, i) => {
    const s = settled[i];
    if (s.status === 'fulfilled' && hasUsableData(s.value)) {
      return { id: l.id, label: l.label, core: l.core, ok: true, data: s.value, error: null };
    }
    const error =
      s.status === 'rejected'
        ? String((s.reason as Error)?.message ?? s.reason)
        : 'empty result';
    return { id: l.id, label: l.label, core: l.core, ok: false, data: null, error };
  });

  const failedCore = assembled.filter((a) => a.core && !a.ok);
  if (failedCore.length > 0) {
    return {
      status: 502,
      body: {
        status: 'error',
        recipe: spec.id,
        data:
          `Could not build "${spec.title}": core data unavailable ` +
          `(${failedCore.map((a) => a.label).join(', ')}). No charge.`,
        failedLegs: failedCore.map((a) => ({ id: a.id, error: a.error })),
      },
    };
  }

  const degradedLegs = assembled
    .filter((a) => !a.ok)
    .map((a) => ({ id: a.id, label: a.label, reason: a.error }));
  const sections: Record<string, unknown> = {};
  for (const a of assembled) if (a.ok) sections[a.id] = a.data;

  return {
    status: 200,
    body: {
      status: 'success',
      recipe: spec.id,
      title: spec.title,
      composed: true,
      sources: assembled.filter((a) => a.ok).map((a) => a.id),
      // The recipes widget reads `degraded_legs` (camelCase alias kept as a
      // fallback). Every not-ok NON-core leg is named here — never silently dropped.
      degraded_legs: degradedLegs,
      degradedLegs,
      data: sections,
      generatedAt: new Date().toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// Public entry points (one per built recipe) — the route handlers call these.
// ---------------------------------------------------------------------------

export {
  vetTokenFetchers,
  tokenDeepDiveFetchers,
  rwaPulseFetchers,
  resolveXLayerAddress,
  assertBackendUrl,
  // Pure validators — exported so tests exercise the REAL semantic guards
  // (not just runRecipe with injected fetchers), pinning the #1-rule folds.
  proxyLeg,
  isRealSecurityScan,
  isRealTokenDetails,
  hasRealMacro,
};
