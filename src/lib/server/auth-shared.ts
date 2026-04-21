type HeaderReader = {
  get(name: string): string | null;
};

export interface CurrentUser {
  id: string;
  displayName: string;
  loginName?: string;
}

function resolveHeaderValue(reader: HeaderReader, candidates: string[]) {
  for (const name of candidates) {
    const value = reader.get(name)?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

export function resolveCurrentUser(reader: HeaderReader): CurrentUser | null {
  const userId = resolveHeaderValue(reader, [
    process.env.AUTH_USER_ID_HEADER ?? "x-user-id",
    "x-auth-request-user",
    "x-forwarded-user",
  ]);

  if (!userId) {
    return null;
  }

  const displayName = resolveHeaderValue(reader, [
    process.env.AUTH_USER_NAME_HEADER ?? "x-user-name",
    "x-auth-request-name",
    "x-user-display-name",
  ]);

  const loginName = resolveHeaderValue(reader, [
    process.env.AUTH_USER_LOGIN_HEADER ?? "x-user-login",
    "x-auth-request-email",
    "x-user-email",
  ]);

  return {
    id: userId,
    displayName: displayName || loginName || userId,
    loginName: loginName || undefined,
  };
}
