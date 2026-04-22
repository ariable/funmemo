import { buildLoginRedirectHref, type AuthAttempt } from "@/lib/server/auth-redirect";

export type AuthBannerState = {
  actionUrl: string;
  actionLabel: string;
  autoRedirectUrl?: string;
  delayMs?: number;
  message: string;
  title: string;
};

function getLoginBaseUrl() {
  return process.env.AUTH_LOGIN_URL?.trim() || "/api/auth/sign-in/casdoor";
}

export function parseAuthAttempt(value: string | string[] | undefined): AuthAttempt | null {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized === "silent" || normalized === "interactive" ? normalized : null;
}

export function getAuthBannerState(input: {
  authAttempt: AuthAttempt | null;
  returnTo: string;
}): AuthBannerState {
  const loginUrl = getLoginBaseUrl();
  const silentUrl = buildLoginRedirectHref({
    currentPath: input.returnTo,
    loginUrl,
    attempt: "silent",
  });
  const interactiveUrl = buildLoginRedirectHref({
    currentPath: input.returnTo,
    loginUrl,
    attempt: "interactive",
  });

  if (input.authAttempt === "silent") {
    return {
      title: "未登录",
      message: "自动登录未完成，2 秒后转到登录页面",
      autoRedirectUrl: interactiveUrl,
      actionUrl: interactiveUrl,
      actionLabel: "立即登录",
      delayMs: 2000,
    };
  }

  if (input.authAttempt === "interactive") {
    return {
      title: "未登录",
      message: "登录未完成，请重新登录。",
      actionUrl: interactiveUrl,
      actionLabel: "重新登录",
    };
  }

  return {
    title: "正在尝试自动登录",
    message: "如果未自动登录，将跳转到登录页面",
    autoRedirectUrl: silentUrl,
    actionUrl: interactiveUrl,
    actionLabel: "改为手动登录",
    delayMs: 0,
  };
}
