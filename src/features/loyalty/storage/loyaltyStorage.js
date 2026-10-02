const PREFIX = "vuelvo:loyalty:";

function key(code) {
  return `${PREFIX}${String(code || "").toUpperCase()}`;
}

export function readLoyaltySnapshot(code) {
  try {
    const raw = localStorage.getItem(key(code));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLoyaltySnapshot(code, data) {
  if (!code || !data) return;
  try {
    const previous = readLoyaltySnapshot(code) || {};
    const next = {
      ...previous,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(key(code), JSON.stringify(next));
  } catch {
    // La app debe seguir funcionando aunque localStorage esté bloqueado.
  }
}
