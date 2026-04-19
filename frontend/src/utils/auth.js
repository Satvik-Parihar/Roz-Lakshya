const ACCESS_TOKEN_KEY = 'access_token';
const MUST_RESET_KEY = 'must_reset_password';
const REMEMBERED_EMAIL_KEY = 'remembered_email';

function getStoredValue(key) {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

export function getAuthToken() {
  const token = getStoredValue(ACCESS_TOKEN_KEY);
  if (!token) return null;

  const payload = parseJwt(token);
  const exp = Number(payload?.exp || 0);
  if (exp > 0 && exp <= Math.floor(Date.now() / 1000)) {
    clearAuthStorage();
    return null;
  }

  return token;
}

export function parseJwt(token) {
  try {
    if (!token) return null;
    const payload = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function setAuthSession({ token, mustResetPassword = false, persist = true }) {
  if (!token) return;

  const primaryStorage = persist ? localStorage : sessionStorage;
  const secondaryStorage = persist ? sessionStorage : localStorage;

  secondaryStorage.removeItem(ACCESS_TOKEN_KEY);
  secondaryStorage.removeItem(MUST_RESET_KEY);

  primaryStorage.setItem(ACCESS_TOKEN_KEY, token);
  primaryStorage.setItem(MUST_RESET_KEY, String(Boolean(mustResetPassword)));
}

export function setMustResetPassword(value) {
  const flag = String(Boolean(value));
  let wrote = false;

  if (localStorage.getItem(ACCESS_TOKEN_KEY)) {
    localStorage.setItem(MUST_RESET_KEY, flag);
    wrote = true;
  }
  if (sessionStorage.getItem(ACCESS_TOKEN_KEY)) {
    sessionStorage.setItem(MUST_RESET_KEY, flag);
    wrote = true;
  }

  if (!wrote) {
    localStorage.setItem(MUST_RESET_KEY, flag);
  }
}

export function getRememberedEmail() {
  return localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
}

export function setRememberedEmail(email) {
  localStorage.setItem(REMEMBERED_EMAIL_KEY, String(email || '').trim().toLowerCase());
}

export function clearRememberedEmail() {
  localStorage.removeItem(REMEMBERED_EMAIL_KEY);
}

export function getAuthSnapshot() {
  const token = getAuthToken();
  const payload = parseJwt(token);
  const mustResetFlag = getStoredValue(MUST_RESET_KEY);
  return {
    token,
    payload,
    isAuthenticated: Boolean(token && payload),
    isAdmin: Boolean(payload?.is_admin) || String(payload?.role || '').toLowerCase() === 'admin',
    userId: Number(payload?.uid || 0) || null,
    email: payload?.sub || null,
    mustResetPassword:
      mustResetFlag === null
        ? Boolean(payload?.must_reset_password)
        : mustResetFlag === 'true',
  };
}

export function clearAuthStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(MUST_RESET_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(MUST_RESET_KEY);
}
