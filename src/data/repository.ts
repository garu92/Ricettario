/**
 * Dove vive il ricettario su GitHub.
 *
 * Serve a costruire i collegamenti che portano dalla pagina di una ricetta al suo file,
 * per aggiungere un contributo direttamente dal browser.
 */
export const REPOSITORY = 'garu92/Ricettario';
export const RAMO = 'main';

/** L'editor web di GitHub, già aperto sul file della ricetta. */
export function urlModificaRicetta(idRicetta: string): string {
  return `https://github.com/${REPOSITORY}/edit/${RAMO}/src/content/ricette/${idRicetta}.md`;
}

/** La storia completa del file, per chi vuole vedere i cambiamenti riga per riga. */
export function urlStoriaRicetta(idRicetta: string): string {
  return `https://github.com/${REPOSITORY}/commits/${RAMO}/src/content/ricette/${idRicetta}.md`;
}
