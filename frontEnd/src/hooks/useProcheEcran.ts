/**
 * useProcheEcran — vrai dès que l'élément arrive près de l'écran (et le reste). Sert à ne charger
 * un contenu lourd (carte, galerie…) que si le visiteur descend jusqu'à lui.
 * `ref` est une ref « fonction » : l'observation démarre même si l'élément apparaît plus tard.
 */
import { useEffect, useState } from 'react';

export function useProcheEcran<T extends Element>(marge = '300px') {
  const [element, ref] = useState<T | null>(null);
  const [proche, setProche] = useState(typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (proche || !element) return;
    const observer = new IntersectionObserver(([entree]) => {
      if (entree?.isIntersecting) {
        setProche(true);
        observer.disconnect();
      }
    }, { rootMargin: marge });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, proche, marge]);

  return { ref, proche };
}

export default useProcheEcran;
