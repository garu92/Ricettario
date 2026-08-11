import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Gestione delle foto dei passaggi.
 *
 * Le immagini stanno in `public/foto/<slug-ricetta>/`, e nel frontmatter si scrive il
 * percorso pubblico (`/foto/carbonara/passo-1.jpg`). Il sito è statico e generato in
 * Node, quindi in fase di build si può controllare se il file esiste davvero: una foto
 * ancora da scattare diventa un riquadro tratteggiato invece di un'immagine rotta.
 */

/** Vero se il file esiste in `public/`. */
export function esisteFoto(percorsoPubblico: string): boolean {
  const relativo = percorsoPubblico.replace(/^\//, '');
  return existsSync(join(process.cwd(), 'public', relativo));
}

/** Cartella dove vanno le foto di una ricetta, da mostrare nei riquadri vuoti. */
export function cartellaFoto(idRicetta: string): string {
  return `public/foto/${idRicetta}/`;
}
