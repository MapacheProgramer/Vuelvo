import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import AppRouter from "./app/router.jsx";

import {
  AuthProvider,
} from "./features/auth/context/AuthContext.jsx";

import "./styles/index.css";

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