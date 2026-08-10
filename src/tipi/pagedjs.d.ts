/**
 * Paged.js non pubblica i tipi TypeScript: qui c'è solo la parte che il ricettario usa
 * davvero, cioè il Previewer che impagina il libro in `src/pages/stampa.astro`.
 */
declare module 'pagedjs' {
  export interface RisultatoImpaginazione {
    /** Numero di pagine prodotte. */
    total: number;
    performance: number;
  }

  export class Previewer {
    /**
     * Impagina il documento. Senza argomenti prende il contenuto e i fogli di stile
     * della pagina corrente.
     */
    preview(
      contenuto?: unknown,
      fogliDiStile?: unknown,
      destinazione?: HTMLElement,
    ): Promise<RisultatoImpaginazione>;
  }
}
