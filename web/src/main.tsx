import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { PrefsProvider } from "./prefs";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found");
}

createRoot(container).render(
  <StrictMode>
    <PrefsProvider>
      <App />
    </PrefsProvider>
  </StrictMode>
);
