import { useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface UsePwaReturn {
  /* true якщо застосунок вже встановлено як PWA */
  isInstalled: boolean;
  /* true якщо браузер підтримує встановлення і ще не встановлено */
  canInstall: boolean;
  /* викликати щоб показати системний діалог встановлення */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  /* стан реєстрації SW */
  swState: "idle" | "registering" | "active" | "error";
}

export function usePwa(): UsePwaReturn {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [swState, setSwState] = useState<UsePwaReturn["swState"]>("idle");
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  /* Реєстрація Service Worker */
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    setSwState("registering");

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        setSwState("active");

        /* Перевіряємо оновлення кожні 60 секунд */
        const interval = setInterval(() => {
          void registration.update();
        }, 60_000);

        return () => clearInterval(interval);
      })
      .catch((error) => {
        console.error("[PWA] SW registration failed:", error);
        setSwState("error");
      });
  }, []);

  /* Визначаємо чи застосунок вже встановлений */
  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);

    setIsInstalled(isStandalone);

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const onChange = (event: MediaQueryListEvent) => setIsInstalled(event.matches);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  /* Перехоплюємо beforeinstallprompt */
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      deferredPrompt.current = event as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    /* Після встановлення прибираємо кнопку */
    const onInstalled = () => {
      setCanInstall(false);
      setIsInstalled(true);
      deferredPrompt.current = null;
    };

    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt.current) return "unavailable";

    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;

    deferredPrompt.current = null;
    setCanInstall(false);

    return outcome;
  };

  return { isInstalled, canInstall, promptInstall, swState };
}
