import jwt from 'jsonwebtoken';
import { getApiJwtUser, getApiJwtPass } from '../env';

/**
 * Generates a JWT token for API authentication using env credentials.
 * Adjust payload/secret as per backend requirements.
 */
export async function generateApiJwt() {
  const user = getApiJwtUser();
  const pass = getApiJwtPass();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!user || !pass || !API_BASE_URL) throw new Error('API JWT credentials or API base URL missing');

  const apiUrl = `${API_BASE_URL}/api/authenticate`;
  const body = {
    username: user,
    password: pass,
    rememberMe: true,
  };

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch JWT from backend: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  // The backend should return { id_token: '...' }
  if (!data.id_token) {
    throw new Error('No id_token returned from backend');
  }
  return data.id_token;
}

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

export async function getCachedApiJwt() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && tokenExpiry && now < tokenExpiry - 60) { // 60s buffer
    return cachedToken;
  }
  // Fetch new token
  const token = await generateApiJwt();
  // Decode expiry from JWT
  const [, payloadB64] = token.split('.');
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
  tokenExpiry = payload.exp;
  cachedToken = token;
  return cachedToken;
}