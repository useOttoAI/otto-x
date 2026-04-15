import { env } from '../config/env.js';
import { createSignature, getTimestamp } from './auth.js';

const BASE_URL = 'https://web3.okx.com';

/** Make an authenticated GET request to OKX Web3 API */
export async function okxGet<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const timestamp = getTimestamp();
  const queryString =
    Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : '';
  const signature = createSignature(
    env.OKX_SECRET_KEY,
    timestamp,
    'GET',
    path,
    queryString,
  );

  const url = `${BASE_URL}${path}${queryString}`;
  const response = await fetch(url, {
    headers: {
      'OK-ACCESS-KEY': env.OKX_API_KEY,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': env.OKX_PASSPHRASE,
    },
  });

  if (!response.ok) {
    throw new Error(`OKX API ${path} returned ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/** Make an authenticated POST request to OKX Web3 API */
export async function okxPost<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const timestamp = getTimestamp();
  const bodyStr = JSON.stringify(body);
  const signature = createSignature(
    env.OKX_SECRET_KEY,
    timestamp,
    'POST',
    path,
    bodyStr,
  );

  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'OK-ACCESS-KEY': env.OKX_API_KEY,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': env.OKX_PASSPHRASE,
      'Content-Type': 'application/json',
    },
    body: bodyStr,
  });

  if (!response.ok) {
    throw new Error(`OKX API ${path} returned ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
