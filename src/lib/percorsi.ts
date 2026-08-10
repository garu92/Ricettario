/**
 * Costruzione degli URL interni.
 *
 * Il sito vive alla radice in locale e sotto /Ricettario/ su GitHub Pages: ogni link
 * interno deve passare da qui, altrimenti funziona su una delle due e non sull'altra.
 */

const BASE = import.meta.env.BASE_URL;

export function percorso(...parti: string[]): string {
  const coda = parti
    .join('/')
    .split('/')
    .filter((p) => p.length > 0)
    .join('/');
  const radice = BASE.endsWith('/') ? BASE : `${BASE}/`;
  return coda === '' ? radice : `${radice}${coda}/`;
}

export const urlHome = () => percorso();
export const urlSezione = (id: string) => percorso('sezioni', id);
export const urlRicetta = (id: string) => percorso('ricette', id);
export const urlAutori = () => percorso('autori');
export const urlCerca = () => percorso('cerca');
export const urlStampa = () => percorso('stampa');

/** Il PDF non passa da Astro: è un file statico servito da /pdf/. */
export const urlPdf = () => percorso('pdf', 'ricettario-marano.pdf').replace(/\/$/, '');
