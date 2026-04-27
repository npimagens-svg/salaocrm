import { useEffect, useRef, useState } from "react";

/**
 * Detecta quando uma nova versão do app foi deployada checando o ETag/Last-Modified
 * do index.html periodicamente. Quando detecta mudança, retorna `updateAvailable=true`.
 *
 * Como funciona:
 * 1. Na primeira chamada, lê o ETag/Last-Modified atual do "/" via HEAD request
 *    e guarda como referencia ("baseline").
 * 2. A cada `intervalMs` (default 5 min), faz outro HEAD e compara.
 * 3. Se mudou, dispara o sinal de "atualizacao disponivel".
 *
 * Tambem verifica ao voltar pra aba (visibilitychange).
 */
export function useAppUpdateCheck(intervalMs: number = 5 * 60 * 1000) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const baselineRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchVersion = async (): Promise<string | null> => {
      try {
        const res = await fetch("/", {
          method: "HEAD",
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!res.ok) return null;
        const etag = res.headers.get("etag") || res.headers.get("last-modified");
        return etag;
      } catch {
        return null;
      }
    };

    const check = async () => {
      const current = await fetchVersion();
      if (cancelled) return;
      if (!current) return;
      if (baselineRef.current === null) {
        baselineRef.current = current;
        return;
      }
      if (current !== baselineRef.current) {
        setUpdateAvailable(true);
      }
    };

    // Estabelece baseline e checa primeira vez
    check();

    const interval = setInterval(check, intervalMs);
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);

  const reload = () => {
    // Limpa caches do Service Worker se houver
    if ("caches" in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
    }
    // Forca reload sem cache
    window.location.reload();
  };

  return { updateAvailable, reload };
}
