import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import AppRouter from "./app/router.jsx";

import {
  AuthProvider,
} from "./features/auth/context/AuthContext.jsx";

import {
  initializeTheme,
} from "./features/theme/theme.js";

import "./styles/index.css";

// ---------------------------------------------------------
// Aplicar el tema guardado antes de renderizar React
// ---------------------------------------------------------

initializeTheme();

// ---------------------------------------------------------
// Render principal
// ---------------------------------------------------------

createRoot(
  document.getElementById("root"),
).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);