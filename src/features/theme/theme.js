const THEME_KEY = "vuelvo_theme";

export const THEMES = {
  LIGHT: "light",
  DARK: "dark",
};

export function getStoredTheme() {
  try {
    const storedTheme =
      localStorage.getItem(THEME_KEY);

    if (
      storedTheme === THEMES.LIGHT ||
      storedTheme === THEMES.DARK
    ) {
      return storedTheme;
    }
  } catch {
    // Si localStorage no está disponible,
    // continuamos con el tema por defecto.
  }

  return THEMES.DARK;
}

export function applyTheme(theme) {
  const safeTheme =
    theme === THEMES.LIGHT
      ? THEMES.LIGHT
      : THEMES.DARK;

  document.documentElement.setAttribute(
    "data-theme",
    safeTheme,
  );

  return safeTheme;
}

export function saveTheme(theme) {
  const safeTheme =
    applyTheme(theme);

  try {
    localStorage.setItem(
      THEME_KEY,
      safeTheme,
    );
  } catch {
    // La aplicación puede continuar aunque
    // localStorage no esté disponible.
  }

  return safeTheme;
}

export function initializeTheme() {
  const theme =
    getStoredTheme();

  applyTheme(theme);

  return theme;
}

export function toggleTheme() {
  const current =
    document.documentElement.getAttribute(
      "data-theme",
    ) || getStoredTheme();

  const next =
    current === THEMES.DARK
      ? THEMES.LIGHT
      : THEMES.DARK;

  return saveTheme(next);
}