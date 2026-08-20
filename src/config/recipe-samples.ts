/**
 * Genuine captured sample responses for the /recipes pages.
 *
 * HONESTY CONTRACT: every entry here MUST be a real, settled x402 call's
 * response body, captured whole and unedited, with its true capture
 * timestamp. Never hand-author an entry, never "refresh" a value inside a
 * captured body, never fabricate a timestamp. A recipe with no entry simply
 * renders no sample section — that is the correct state until a real
 * capture exists.
 *
 * The page labels each sample as a snapshot that is explicitly NOT
 * byte-reproducible (LLM-backed upstreams vary run to run).
 */

export interface RecipeSample {
  /** ISO timestamp of the actual capture (from the capture artifact, verbatim). */
  capturedAt: string;
  /** The full response body of the settled call, verbatim. */
  body: unknown;
}

export const RECIPE_SAMPLES: Record<string, RecipeSample> = {
  // Real settled paid call from the 2026-06-29 endpoint QA sweep
  // (settleTx 0xd3f86af048676add9720cffa3d9d8c3a7390b57afea26b0e8d4dd4c12f3fbebf).
  // Same upstream composition Otto X proxies; replace with an X Layer-settled
  // capture when one lands.
  'mega-report': {
    capturedAt: '2026-06-29T22:55:44.072Z',
    body: {
      status: 'success',
      data: {
        summary:
          'BlackRocks integration of Ethenas USDe into the Aladdin platform is todays most significant development, marking a major institutional shift toward synthetic stablecoin adoption. The overall market stance is Neutral. While structural adoption is accelerating, Bitcoin at 60,345 and Ethereum at 1,617 are currently hampered by substantial ETF outflows and technical weakness. ENA at 0.0785 and ONDO at 0.3177 present strategic opportunities within the institutional tokenization narrative, though they remain sensitive to regulatory flux and collateralization risks. Solana at 75.44 demonstrates continued relative strength and ecosystem depth, offering a high-conviction play if broader sentiment stabilizes. Given the extreme fear environment, defensive positioning in stablecoins like DAI at 1.00 remains prudent for risk management. Key levels to watch include Bitcoins 60,000 psychological support and legislative progress on the CLARITY Act.',
        report_url: 'https://reports.useotto.xyz/reports/x402-1782773744687.html',
      },
    },
  },
};
