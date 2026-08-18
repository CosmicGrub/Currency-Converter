import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./styles/responsive.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root element not found");

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// PWA service worker registration lives here, not in App.tsx, so that
// App.test.tsx (which renders App directly, without a Vite/service-worker
// runtime behind it) never has to resolve the `virtual:pwa-register` module.
if ("serviceWorker" in navigator) {
  import("virtual:pwa-register")
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {
      // No SW support in this build context (e.g. `vite dev` without
      // devOptions.enabled) -- the app works fine without one, just without
      // full offline precaching.
    });
}
