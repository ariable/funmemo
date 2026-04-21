export interface CasdoorDiscoveryDocument {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint?: string;
}

export interface CasdoorUserInfo {
  sub: string;
  name?: string;
  preferred_username?: string;
  email?: string;
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少 ${name} 配置`);
  }

  return value;
}

export function getAppUrl() {
  return getRequiredEnv("APP_URL").replace(/\/$/, "");
}

export function getCasdoorCallbackUrl() {
  return `${getAppUrl()}/api/auth/callback/casdoor`;
}

export function getCasdoorConfig() {
  return {
    issuer: getRequiredEnv("AUTH_CASDOOR_ISSUER").replace(/\/$/, ""),
    clientId: getRequiredEnv("AUTH_CASDOOR_ID"),
    clientSecret: getRequiredEnv("AUTH_CASDOOR_SECRET"),
    scope: process.env.AUTH_CASDOOR_SCOPE?.trim() || "openid profile email",
  };
}

export async function getCasdoorDiscovery() {
  const { issuer } = getCasdoorConfig();
  const response = await fetch(`${issuer}/.well-known/openid-configuration`, {
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error("读取 Casdoor OIDC 配置失败");
  }

  return (await response.json()) as CasdoorDiscoveryDocument;
}

export async function exchangeCodeForAccessToken(code: string) {
  const discovery = await getCasdoorDiscovery();
  const { clientId, clientSecret } = getCasdoorConfig();

  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getCasdoorCallbackUrl(),
    }),
  });

  if (!response.ok) {
    throw new Error("Casdoor token 交换失败");
  }

  const payload = (await response.json()) as {
    access_token?: string;
  };

  if (!payload.access_token) {
    throw new Error("Casdoor 未返回 access_token");
  }

  return payload.access_token;
}

export async function fetchCasdoorUserInfo(accessToken: string) {
  const discovery = await getCasdoorDiscovery();
  const response = await fetch(discovery.userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("读取 Casdoor 用户信息失败");
  }

  const user = (await response.json()) as CasdoorUserInfo;
  if (!user.sub) {
    throw new Error("Casdoor 用户信息缺少 sub");
  }

  return user;
}
