import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  OKX_API_KEY: requireEnv('OKX_API_KEY'),
  OKX_SECRET_KEY: requireEnv('OKX_SECRET_KEY'),
  OKX_PASSPHRASE: requireEnv('OKX_PASSPHRASE'),
  PORT: parseInt(process.env.PORT || '4196', 10),
  PAY_TO_ADDRESS: process.env.PAY_TO_ADDRESS || '',
  // Backend service URLs for proxied endpoints
  MARKET_ALPHA_X402_URL: process.env.MARKET_ALPHA_X402_URL || '',
  TOOLS_AGENT_X402_URL: process.env.TOOLS_AGENT_X402_URL || '',
  INTERNAL_API_KEY: process.env.INTERNAL_API_KEY || '',
} as const;
