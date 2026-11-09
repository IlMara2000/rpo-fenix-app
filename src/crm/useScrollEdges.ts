import { useEffect, useState } from "react";

/**
 * Segnala sui bordi di una striscia orizzontale che il contenuto continua.
 * Scrive `data-more-left` / `data-more-right` sull'elemento, cosi' il CSS puo'
 * sfumare solo il bordo che nasconde davvero qualcosa.
 */
export function useScrollEdges<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null);

  useEffect(() => {
    if (!element) {
      return;
    }

    const measure = () => {
      // La barra dei moduli ha scroll snap: a inizio corsa lo scrollLeft non e' 0.
      const edge = 12;
      const hiddenWidth = element.scrollWidth - element.clientWidth;
      element.dataset.moreLeft = String(element.scrollLeft > edge);
      element.dataset.moreRight = String(element.scrollLeft < hiddenWidth - edge);
    };
    let timer = 0;
    const update = () => {
      measure();
      // Il ridimensionamento puo' arrivare prima del nuovo layout: rimisura a fine cambio.
      window.clearTimeout(timer);
      timer = window.setTimeout(measure, 120);
    };

    measure();
    element.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(element);
    const mutationObserver = new MutationObserver(update);
    mutationObserver.observe(element, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(timer);
      element.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [element]);

  return setElement;
}
