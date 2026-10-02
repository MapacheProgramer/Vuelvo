function newToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getDeviceToken({ create = true } = {}) {
  try {
    let token = localStorage.getItem("device_token");
    if (!token && create) {
      token = newToken();
      localStorage.setItem("device_token", token);
    }
    return token;
  } catch {
    return create ? newToken() : null;
  }
}
