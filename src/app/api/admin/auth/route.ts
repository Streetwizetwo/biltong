// Admin authentication module — server-side only
// Provides: signed session tokens, rate limiting, auth verification

import { NextRequest, NextResponse } from "next/server";
import CryptoJS from "crypto-js";

// ============================================
// CONFIGURATION
// ============================================
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "Yumna@786";

// Secret for signing session tokens — different from the password
// This ensures even if someone knows the password, they can't forge tokens
const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || "BB-KZN-SigKey-2025-x9kQm7";

const TOKEN_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ============================================
// RATE LIMITING (in-memory, resets on deploy)
// ============================================
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

// Clean up old entries every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of loginAttempts.entries()) {
      if (data.lockedUntil && data.lockedUntil < now) {
        loginAttempts.delete(ip);
      }
    }
  }, 10 * 60 * 1000);
}

function getClientIP(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (attempt && attempt.lockedUntil && now < attempt.lockedUntil) {
    const minsLeft = Math.ceil((attempt.lockedUntil - now) / 60000);
    return { allowed: false, message: `Too many failed attempts. Try again in ${minsLeft} min.` };
  }

  return { allowed: true };
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const attempt = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };

  attempt.count += 1;

  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = now + LOCKOUT_DURATION_MS;
    console.warn(`[Admin Auth] IP ${ip} locked out after ${attempt.count} failed attempts`);
  }

  loginAttempts.set(ip, attempt);
}

function clearFailedAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

// ============================================
// SESSION TOKEN (signed, timestamped)
// ============================================
// Token format: base64({ip, issuedAt, expiresAt}).hmac
// This is NOT a JWT — it's simpler and doesn't require a library

interface TokenPayload {
  ip: string;
  issuedAt: number;
  expiresAt: number;
}

function signToken(payload: TokenPayload): string {
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr).toString("base64url");
  const signature = CryptoJS.HmacSHA256(payloadB64, TOKEN_SECRET).toString(CryptoJS.enc.Hex);
  return `${payloadB64}.${signature}`;
}

function verifyToken(token: string, ip: string): boolean {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return false;

    // Verify signature
    const expectedSig = CryptoJS.HmacSHA256(payloadB64, TOKEN_SECRET).toString(CryptoJS.enc.Hex);
    if (signature !== expectedSig) {
      console.warn("[Admin Auth] Invalid token signature");
      return false;
    }

    // Decode payload
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload: TokenPayload = JSON.parse(payloadStr);

    // Check expiry
    if (Date.now() > payload.expiresAt) {
      console.warn("[Admin Auth] Token expired");
      return false;
    }

    // Check IP matches (prevents token sharing/theft)
    if (payload.ip !== ip) {
      console.warn(`[Admin Auth] IP mismatch: token=${payload.ip}, current=${ip}`);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ============================================
// EXPORTED AUTH VERIFIER (for other API routes)
// ============================================
export function verifyAdminAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  // Support both: "Bearer <token>" (new) and "Bearer <password>" (legacy fallback)
  const token = authHeader.replace("Bearer ", "");
  const ip = getClientIP(request);

  // Try session token first (preferred)
  if (token.includes(".") && verifyToken(token, ip)) {
    return true;
  }

  // Legacy fallback: direct password (for backwards compat during transition)
  if (token === ADMIN_PASSWORD) {
    return true;
  }

  return false;
}

// ============================================
// LOGIN ENDPOINT: POST /api/admin/auth
// ============================================
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);

    // Check rate limit
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: rateCheck.message },
        { status: 429 }
      );
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password required" },
        { status: 400 }
      );
    }

    // Verify password
    if (password !== ADMIN_PASSWORD) {
      recordFailedAttempt(ip);
      const attempt = loginAttempts.get(ip);
      const remaining = MAX_LOGIN_ATTEMPTS - (attempt?.count || 0);

      console.warn(`[Admin Auth] Failed login from ${ip}. ${remaining} attempts remaining.`);

      return NextResponse.json(
        {
          error: "Wrong password",
          attemptsRemaining: Math.max(0, remaining),
        },
        { status: 401 }
      );
    }

    // Success — clear failed attempts and issue session token
    clearFailedAttempts(ip);

    const now = Date.now();
    const token = signToken({
      ip,
      issuedAt: now,
      expiresAt: now + TOKEN_EXPIRY_MS,
    });

    console.log(`[Admin Auth] Successful login from ${ip}`);

    return NextResponse.json({
      success: true,
      token,
      expiresAt: now + TOKEN_EXPIRY_MS,
    });
  } catch (error) {
    console.error("[Admin Auth] Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// VERIFY ENDPOINT: GET /api/admin/auth
// ============================================
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const ip = getClientIP(request);

  if (token.includes(".") && verifyToken(token, ip)) {
    return NextResponse.json({ valid: true });
  }

  // Legacy password fallback
  if (token === ADMIN_PASSWORD) {
    return NextResponse.json({ valid: true });
  }

  return NextResponse.json({ valid: false }, { status: 401 });
}
