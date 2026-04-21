import { createHmac, timingSafeEqual } from "node:crypto";

type HeaderReader = {
  get(name: string): string | null;
};

export interface SessionUser {
  id: string;
  displayName: string;
  loginName?: string;
}

type SessionPayload = SessionUser & {
  exp: number;
};

export const SESSION_COOKIE_NAME = "funmemo_session";
export const AUTH_FLOW_COOKIE_NAME = "funmemo_auth_flow";

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("缺少 AUTH_SECRET 配置");
  }

  return secret;
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

export function createSignedToken(payload: object) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySignedToken<T>(token: string): T | null {
  const [encodedPayload = "", signature = ""] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(encodedPayload)) as T;
  } catch {
    return null;
  }
}

export function getSessionMaxAge() {
  return Number(process.env.AUTH_SESSION_MAX_AGE_SEC ?? 60 * 60 * 24 * 7);
}

export function createSessionToken(user: SessionUser) {
  return createSignedToken({
    ...user,
    exp: Math.floor(Date.now() / 1000) + getSessionMaxAge(),
  });
}

export function readSessionToken(token: string | undefined | null): SessionUser | null {
  if (!token) {
    return null;
  }

  const payload = verifySignedToken<SessionPayload>(token);
  if (!payload || payload.exp * 1000 <= Date.now()) {
    return null;
  }

  return {
    id: payload.id,
    displayName: payload.displayName,
    loginName: payload.loginName,
  };
}

export function parseCookieValue(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((item) => item.trim());
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split("=");
    if (key === name) {
      return rest.join("=") || null;
    }
  }

  return null;
}

export function getSessionUserFromHeaders(headers: HeaderReader) {
  const token = parseCookieValue(headers.get("cookie"), SESSION_COOKIE_NAME);
  return readSessionToken(token);
}
