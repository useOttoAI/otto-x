/**
 * Otto X — Client Example
 *
 * Shows how an AI agent or developer discovers and interacts with
 * x402-paywalled endpoints on Otto X.
 *
 * Run: npx tsx examples/client.ts
 */

const BASE_URL = process.env.OTTO_X_URL || 'https://xlayer.ottoai.services';

// ─── Step 1: Discover services (free) ────────────────────────

async function discoverServices(): Promise<void> {
  console.log('═══ Step 1: Service Discovery (free) ═══\n');

  // Option A: JSON discovery
  const discovery = await fetch(`${BASE_URL}/`, {
    headers: { Accept: 'application/json' },
  });
  const info = await discovery.json();
  console.log(`Service: ${info.service}`);
  console.log(`Chain:   ${info.chain}`);
  console.log(`Endpoints: ${info.endpoints.length} paid\n`);

  // Option B: AI-readable catalog
  const llmTxt = await fetch(`${BASE_URL}/llm.txt`);
  console.log('llm.txt (first 5 lines):');
  const lines = (await llmTxt.text()).split('\n').slice(0, 5);
  lines.forEach((l) => console.log(`  ${l}`));

  // Option C: x402 discovery document
  const x402 = await fetch(`${BASE_URL}/.well-known/x402`);
  const x402Doc = await x402.json();
  console.log(`\nx402 resources: ${x402Doc.resources.length}`);
  console.log(`Payment chain:  ${x402Doc.chain.name} (${x402Doc.chain.chainId})\n`);
}

// ─── Step 2: Call a free endpoint ────────────────────────────

async function callFreeEndpoint(): Promise<void> {
  console.log('═══ Step 2: Free Endpoint — /tokens ═══\n');

  const res = await fetch(`${BASE_URL}/tokens`);
  const data = await res.json();
  console.log(`Status: ${res.status}`);
  console.log(`Tokens on X Layer: ${data.data.tokens.length}`);
  data.data.tokens.slice(0, 5).forEach((t: { symbol: string; name: string; category: string }) => {
    console.log(`  ${t.symbol.padEnd(8)} ${t.name.padEnd(24)} [${t.category}]`);
  });
  console.log('  ...\n');
}

// ─── Step 3: Hit a paid endpoint — get 402 back ─────────────

async function callPaidEndpoint(): Promise<void> {
  console.log('═══ Step 3: Paid Endpoint — /crypto-news ($0.001) ═══\n');

  const res = await fetch(`${BASE_URL}/crypto-news`);
  console.log(`Status: ${res.status} ${res.statusText}`);

  if (res.status === 402) {
    console.log('\nPayment required! Headers received:');

    // The x402 middleware returns payment instructions in headers
    const paymentRequired = res.headers.get('PAYMENT-REQUIRED');
    if (paymentRequired) {
      try {
        const instructions = JSON.parse(paymentRequired);
        console.log(`  Network:  ${instructions.network || 'eip155:196'}`);
        console.log(`  Pay to:   ${instructions.payTo}`);
        console.log(`  Amount:   ${instructions.price}`);
        console.log(`  Scheme:   ${instructions.scheme}`);
      } catch {
        console.log(`  Raw: ${paymentRequired.substring(0, 200)}`);
      }
    }

    // Also check response body
    const body = await res.text();
    if (body) {
      try {
        const parsed = JSON.parse(body);
        console.log('\nResponse body (payment details):');
        console.log(JSON.stringify(parsed, null, 2).substring(0, 500));
      } catch {
        console.log(`\nResponse body: ${body.substring(0, 200)}`);
      }
    }

    console.log('\n── What an x402 client does next ──');
    console.log('1. Parse the payment instructions from the 402 response');
    console.log('2. Construct an on-chain transfer on X Layer (chain 196)');
    console.log('3. Sign and broadcast the payment transaction');
    console.log('4. Retry the original request with payment proof in header');
    console.log('5. Receive the DeFi data\n');
  }
}

// ─── Step 4: Show a swap quote request ──────────────────────

async function callSwapEndpoint(): Promise<void> {
  console.log('═══ Step 4: Paid Endpoint — POST /swap ($0.01) ═══\n');

  const res = await fetch(`${BASE_URL}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromToken: 'USDT',
      toToken: 'OKB',
      amount: '10',
      userWalletAddress: '0x0000000000000000000000000000000000000001',
    }),
  });

  console.log(`Status: ${res.status} ${res.statusText}`);
  if (res.status === 402) {
    console.log('Payment required — $0.01 on X Layer to get swap calldata');
    console.log('With payment, you would receive:');
    console.log('  - Swap route (DEX aggregator best path)');
    console.log('  - Unsigned transaction calldata');
    console.log('  - Gas estimate');
    console.log('  - Token amounts (from/to)\n');
  }
}

// ─── Run ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Otto X — x402 Client Example           ║');
  console.log('║   Pay-per-call DeFi API on X Layer        ║');
  console.log('╚══════════════════════════════════════════╝\n');
  console.log(`Target: ${BASE_URL}\n`);

  await discoverServices();
  await callFreeEndpoint();
  await callPaidEndpoint();
  await callSwapEndpoint();

  console.log('═══ Done ═══');
  console.log('To make paid calls, use an x402-compatible client that');
  console.log('handles payment negotiation automatically. See:');
  console.log('https://www.x402.org for the x402 protocol specification.\n');
}

main().catch(console.error);
