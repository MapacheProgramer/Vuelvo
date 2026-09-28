import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TagPage from "./pages/TagPage";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/t/:code" element={<TagPage />} />
        <Route path="*" element={<p style={{ padding: 24 }}>Vuelvo funciona. Abre un código, por ejemplo /t/MG001</p>} />   
      </Routes>
    </BrowserRouter>
  </StrictMode>
);