/**
 * Recipe manifest — the SINGLE SOURCE OF TRUTH for Otto X's composite "recipe"
 * endpoints. Handlers fan out FROM this list; the free recipe listing and the
 * public docs derive FROM it. Step-counts are therefore GENERATED, never
 * hand-typed (kills the padded-count / drift trap).
 *
 * A recipe is a single paid route that fans out to several upstream legs
 * (proxied Market Alpha endpoints + native OKX-DEX reads) and returns ONE
 * composed artifact. Every leg is either `core` (its failure refuses the whole
 * recipe with >=400, so the buyer is NEVER charged for a hollow result — the
 * #1 rule) or best-effort (degrades, and the response NAMES the degraded leg).
 *
 * Legs never call Otto X's OWN paid routes over HTTP (that loops back through
 * the paywall and self-tolls). Proxy legs hit the Otto AI backends with an
 * internal-key header (paywall bypass); native legs call local library
 * functions directly. The engine (src/lib/recipe-engine.ts) resolves each leg
 * id to its fetcher.
 */

export type RecipeLegSource = 'market-alpha' | 'tools' | 'okx-dex' | 'hyperliquid';

export interface RecipeLeg {
  /** Stable id — also the engine's fetcher key and the response section key. */
  id: string;
  /** Human label for the composed response + docs. */
  label: string;
  /** Which upstream backs this leg (for docs / honesty about the source). */
  source: RecipeLegSource;
  /**
   * Core legs are load-bearing: if ANY core leg yields no usable data the
   * recipe refuses (>=400, unpaid). Non-core legs degrade and are NAMED in the
   * response's `degraded` array.
   */
  core: boolean;
}

export interface RecipeInput {
  /** Query-param key (e.g. 'address', 'symbol'). '' for no input. */
  key: string;
  required: boolean;
  kind: 'address' | 'symbol' | 'none';
  placeholder: string;
  description: string;
}

export interface RecipeSpec {
  /** Slug id — matches the flat top-level path (never /recipes/*). */
  id: string;
  /** x402 routeConfig key, e.g. 'GET /vet-token'. */
  routeKey: string;
  /** Express path, e.g. '/vet-token'. */
  path: string;
  /** Display price — MUST be an existing supported price rung. */
  displayPrice: string;
  title: string;
  /** The buyer's question this recipe answers, plain language. */
  buyerQuestion: string;
  /** <=450 chars (facilitator /verify clamps descriptions). */
  description: string;
  input: RecipeInput;
  legs: RecipeLeg[];
  /**
   * Displayed step count, DERIVED not typed — see recipeStepCount().
   *   - undefined => derive from legs.length (a genuine N-leg fan-out).
   *   - null      => omit the step-count segment entirely: this recipe is a
   *                 single proxied engine call, NOT a fan-out, so rendering
   *                 "N steps" would inflate composition (the padded-count trap).
   * The card reads recipeStepCount(spec); null hides the segment.
   */
  stepCount?: number | null;
  /** Always true for recipes — they compose >=2 upstream legs. */
  composedUpstream: true;
  /**
   * Live on the paid rail? Absent/undefined => live. A recipe can ship DARK by
   * setting `false`: it is excluded from LIVE_RECIPES so no buyable card
   * renders and it is absent from discovery/paywall/count. Use recipeIsLive()/
   * LIVE_RECIPES, never read this field directly.
   */
  enabled?: boolean;
  /**
   * true  = Otto X builds the composite handler here (the new recipes).
   * false = the composition happens UPSTREAM and Otto X merely proxies it
   *         (e.g. /mega-report — listed so its step-count is generated too).
   */
  builtHere: boolean;
}

const NO_INPUT: RecipeInput = {
  key: '',
  required: false,
  kind: 'none',
  placeholder: '',
  description: 'No input required.',
};

export const RECIPE_MANIFEST: RecipeSpec[] = [
  {
    id: 'vet-token',
    routeKey: 'GET /vet-token',
    path: '/vet-token',
    displayPrice: '$0.01',
    title: 'Token Safety & Liquidity Vetting',
    buyerQuestion: 'Is this X Layer token safe to touch, and is it actually tradeable?',
    description:
      'One-call token vetting on X Layer: GoPlus contract security (honeypot, tax, mint/ownership flags) + holder concentration (top holders, creator share) + live OKX DEX tradeability & price. Composes 2 sources; refuses (unpaid) if the security scan is empty.',
    input: {
      key: 'address',
      required: true,
      kind: 'address',
      placeholder: '0x…',
      description: 'Token contract address on X Layer (chain 196).',
    },
    legs: [
      { id: 'security', label: 'Contract security (GoPlus)', source: 'market-alpha', core: true },
      { id: 'holders', label: 'Holder concentration', source: 'market-alpha', core: false },
      { id: 'dex-liquidity', label: 'OKX DEX tradeability & price', source: 'okx-dex', core: false },
    ],
    composedUpstream: true,
    builtHere: true,
  },
  {
    id: 'token-deep-dive',
    routeKey: 'GET /token-deep-dive',
    path: '/token-deep-dive',
    displayPrice: '$0.05',
    title: 'Token Deep-Dive',
    buyerQuestion: 'Give me the full picture on this major token — price, safety, derivatives, sentiment.',
    description:
      'Full-picture briefing for a major token (BTC/ETH/SOL/LINK/OKB/USDe/sUSDe): price & market cap + contract security + derivatives funding/OI + market KOL context. Unresolved legs are labelled unavailable, never faked. Refuses (unpaid) if core token details are missing.',
    input: {
      key: 'symbol',
      required: true,
      kind: 'symbol',
      placeholder: 'BTC',
      description: 'Token symbol. Best coverage on majors (BTC, ETH, SOL, LINK, OKB, USDe, sUSDe).',
    },
    legs: [
      { id: 'details', label: 'Price & market cap', source: 'market-alpha', core: true },
      { id: 'security', label: 'Contract security (GoPlus)', source: 'market-alpha', core: false },
      { id: 'funding', label: 'Derivatives funding & OI', source: 'market-alpha', core: false },
      { id: 'kol-context', label: 'Market KOL context', source: 'market-alpha', core: false },
      { id: 'dex-price', label: 'OKX DEX live price', source: 'okx-dex', core: false },
    ],
    composedUpstream: true,
    builtHere: true,
  },
  {
    id: 'rwa-pulse',
    routeKey: 'GET /rwa-pulse',
    path: '/rwa-pulse',
    displayPrice: '$0.05',
    title: 'RWA Market Pulse',
    buyerQuestion: 'What is happening across tokenized real-world assets right now?',
    description:
      'A pulse on tokenized real-world assets: TradFi macro (indices, VIX, DXY, yields, commodities) + RWA-relevant crypto news. Composes live legs only; any leg that would fabricate is dropped and named. Refuses (unpaid) if the macro core is empty.',
    input: NO_INPUT,
    legs: [
      { id: 'tradfi', label: 'TradFi macro data', source: 'market-alpha', core: true },
      { id: 'rwa-news', label: 'RWA-relevant crypto news', source: 'market-alpha', core: false },
      // A Hyperliquid tokenized-equity-perps leg was specced but CUT: HIP-3
      // equities live in named DEXes (allMids({dex:"…"})) this service's public
      // HL client can't query, so it would fabricate or always be empty. Dropped
      // per the RWA ruling (LIVE legs only). Revisit if HIP-3 support is ported.
    ],
    composedUpstream: true,
    builtHere: true,
  },
  // --- Composed-upstream entry (NOT built here): listed so its step-count is
  // generated from the manifest like the rest, and docs/count derivations don't
  // special-case it. Otto X proxies this straight through (routes/proxy.ts).
  {
    id: 'mega-report',
    routeKey: 'GET /mega-report',
    path: '/mega-report',
    displayPrice: '$0.05',
    title: 'Alpha & Intel Report',
    buyerQuestion: 'Give me the full daily market briefing.',
    description:
      'Comprehensive daily market briefing — headlines, sentiment, KOL alpha, trending tokens, yield. Composed upstream by the Market Alpha agent and proxied here.',
    input: NO_INPUT,
    legs: [
      { id: 'headlines', label: 'Headlines', source: 'market-alpha', core: true },
      { id: 'sentiment', label: 'Sentiment', source: 'market-alpha', core: false },
      { id: 'kol', label: 'KOL alpha', source: 'market-alpha', core: false },
      { id: 'trending', label: 'Trending tokens', source: 'market-alpha', core: false },
      { id: 'yield', label: 'Yield', source: 'market-alpha', core: false },
    ],
    // From the recipes rail this is ONE proxied call to a cron-cached upstream
    // composition — the legs[] stay as a CONTENT description of the deliverable,
    // but no render-countable step count.
    stepCount: null,
    composedUpstream: true,
    builtHere: false,
  },
];

/** A recipe is live unless it explicitly ships dark (enabled === false). */
export function recipeIsLive(spec: RecipeSpec): boolean {
  return spec.enabled !== false;
}

/** Recipes visible on the paid rail — the page, free recipe listing, and every
 *  count/derivation MUST use this, so a dark recipe renders no buyable card. */
export const LIVE_RECIPES: RecipeSpec[] = RECIPE_MANIFEST.filter(recipeIsLive);

/** The LIVE recipes Otto X actually mounts composite handlers for. */
export const BUILT_RECIPES: RecipeSpec[] = RECIPE_MANIFEST.filter(
  (r) => r.builtHere && recipeIsLive(r),
);

/** Lookup by flat path (e.g. '/vet-token'). */
export function recipeByPath(path: string): RecipeSpec | undefined {
  return RECIPE_MANIFEST.find((r) => r.path === path);
}

/**
 * The truthful displayed step count for a recipe card — DERIVED, never typed.
 * Returns null when the recipe is a single proxied engine call (stepCount:null),
 * so the renderer omits the count segment instead of showing a padded "1 step".
 * Otherwise the count is the number of distinct legs the recipe actually fans
 * out to. The card MUST call this rather than reading legs.length directly.
 */
export function recipeStepCount(spec: RecipeSpec): number | null {
  if (spec.stepCount === null) return null;
  return spec.stepCount ?? spec.legs.length;
}
