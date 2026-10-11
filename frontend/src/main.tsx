import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { RegionProvider } from "./context/RegionContext";
import { AuthProvider } from "./context/AuthContext";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RegionProvider>
          <App />
        </RegionProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
