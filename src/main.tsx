import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function clearLegacyPwaState() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    });

    if ("caches" in window) {
      void caches.keys().then((keys) => {
        keys.forEach((key) => {
          void caches.delete(key);
        });
      });
    }
  });
}

if (import.meta.env.DEV || import.meta.env.PROD) {
  clearLegacyPwaState();
}

createRoot(document.getElementById("root")!).render(<App />);
