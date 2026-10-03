import {
  useEffect,
  useState,
} from "react";

import {
  getStoredTheme,
  saveTheme,
  THEMES,
} from "../../../features/theme/theme";

import "./ThemeToggle.css";

export default function ThemeToggle() {
  const [theme, setTheme] =
    useState(() =>
      getStoredTheme(),
    );

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  function handleToggle() {
    setTheme((current) =>
      current === THEMES.DARK
        ? THEMES.LIGHT
        : THEMES.DARK,
    );
  }

  const isDark =
    theme === THEMES.DARK;

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={handleToggle}
      aria-label={
        isDark
          ? "Cambiar a modo claro"
          : "Cambiar a modo oscuro"
      }
      title={
        isDark
          ? "Modo claro"
          : "Modo oscuro"
      }
    >
      <span
        className="theme-toggle__icon"
        aria-hidden="true"
      >
        {isDark ? "☀" : "☾"}
      </span>

      <span className="theme-toggle__text">
        {isDark
          ? "Claro"
          : "Oscuro"}
      </span>
    </button>
  );
}