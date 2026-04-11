const LICHESS_HOST = "https://lichess.org";
const CLIENT_ID = "chessagine"; 
const REDIRECT_URI =
  typeof window !== "undefined"
    ? `${window.location.origin}/lichess/callback`
    : "";


export const LICHESS_SCOPES = [
  "study:read",  
].join(" ");


function base64URLEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function generateRandomString(length = 64): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64URLEncode(array.buffer);
}

// ─── Start OAuth flow ─────────────────────────────────────────────────────────

export async function startLichessOAuth(): Promise<void> {
  const codeVerifier = generateRandomString(64);
  const state = generateRandomString(16);

  const codeChallenge = base64URLEncode(await sha256(codeVerifier));

  // Persist across the redirect (sessionStorage survives the navigation)
  sessionStorage.setItem("lichess_code_verifier", codeVerifier);
  sessionStorage.setItem("lichess_oauth_state", state);

  const redirectURI =
    typeof window !== "undefined"
      ? `${window.location.origin}/lichess/callback`
      : REDIRECT_URI;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: redirectURI,
    scope: LICHESS_SCOPES,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state,
  });

  window.location.href = `${LICHESS_HOST}/oauth?${params}`;
}

// ─── Exchange code for token ──────────────────────────────────────────────────

export interface LichessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export async function exchangeLichessCode(
  code: string,
  state: string
): Promise<LichessTokenResponse> {
  const savedState = sessionStorage.getItem("lichess_oauth_state");
  if (state !== savedState) {
    throw new Error("OAuth state mismatch – possible CSRF attack");
  }

  const codeVerifier = sessionStorage.getItem("lichess_code_verifier");
  if (!codeVerifier) {
    throw new Error("Missing code_verifier in session storage");
  }

  const redirectURI =
    typeof window !== "undefined"
      ? `${window.location.origin}/lichess/callback`
      : REDIRECT_URI;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectURI,
  });

  const res = await fetch(`${LICHESS_HOST}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }


  sessionStorage.removeItem("lichess_code_verifier");
  sessionStorage.removeItem("lichess_oauth_state");

  return res.json();
}


export interface LichessAccount {
  id: string;
  username: string;
  title?: string;
  patron?: boolean;
}

export async function fetchLichessAccount(
  token: string
): Promise<LichessAccount> {
  const res = await fetch(`${LICHESS_HOST}/api/account`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch Lichess account: ${res.status}`);
  return res.json();
}


export async function revokeLichessToken(token: string): Promise<void> {
  await fetch(`${LICHESS_HOST}/api/token`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}


export const LICHESS_TOKEN_KEY = "lichess-token";
export const LICHESS_USERNAME_KEY = "lichess-username";

export function saveLichessCredentials(token: string, username: string): void {
  localStorage.setItem(LICHESS_TOKEN_KEY, JSON.stringify(token));
  localStorage.setItem(LICHESS_USERNAME_KEY, JSON.stringify(username));
}

export function clearLichessCredentials(): void {
  localStorage.removeItem(LICHESS_TOKEN_KEY);
  localStorage.removeItem(LICHESS_USERNAME_KEY);
}

export function getLichessToken(): string {
  try {
    const raw = localStorage.getItem(LICHESS_TOKEN_KEY);
    if (!raw) return "";
    return JSON.parse(raw) as string;
  } catch {
    return "";
  }
}

export function getLichessUsername(): string {
  try {
    const raw = localStorage.getItem(LICHESS_USERNAME_KEY);
    if (!raw) return "";
    return JSON.parse(raw) as string;
  } catch {
    return "";
  }
}