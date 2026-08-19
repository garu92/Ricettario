/**
 * Le trasformazioni che l'editor del sito applica al file di una ricetta.
 *
 * Sta in un modulo suo, senza browser e senza rete, per due motivi: è la parte che può
 * rovinare una ricetta se sbaglia, quindi va provata a parte; ed è la stessa logica che
 * userebbe uno script da riga di comando.
 */

export interface PassaggioModificato {
  /**
   * Posizione che il passaggio occupava nel file di partenza (0 = il primo),
   * oppure `null` se è stato aggiunto adesso.
   */
  originale: number | null;
  titolo?: string;
  testo: string;
  durata?: number;
  /** Nota scritta ora per questo passaggio; diventa un contributo firmato. */
  nota?: string;
}

export interface Modifiche {
  /** I passaggi nell'ordine finale: quelli tolti semplicemente non ci sono. */
  passaggi: PassaggioModificato[];
  /** Nota che riguarda la ricetta nel suo insieme. */
  notaGenerale?: string;
  /** Id dell'autore che firma le note (una scheda in src/content/autori/). */
  autore: string;
  /** Data delle note, in formato AAAA-MM-GG. */
  data: string;
}

type Frontmatter = Record<string, unknown>;

interface Contributo {
  autore: string;
  data: unknown;
  testo: string;
  passaggio?: number;
}

/** Le due convenzioni di fine riga che un file può avere. */
export type FineRiga = '\n' | '\r\n';

/**
 * Separa il frontmatter YAML dal corpo Markdown.
 *
 * Dentro si lavora sempre a fine riga Unix, ma quella del file di partenza viene
 * restituita e va ripassata a `ricomponiFile`: su Windows git può consegnare i file
 * con CRLF, e riscriverli con l'altra convenzione trasformerebbe una nota di due righe
 * in un diff che tocca l'intera ricetta.
 */
export function separaFrontmatter(file: string): {
  frontmatter: string;
  corpo: string;
  fineRiga: FineRiga;
} {
  const fineRiga: FineRiga = file.includes('\r\n') ? '\r\n' : '\n';
  const testo = fineRiga === '\r\n' ? file.replace(/\r\n/g, '\n') : file;

  if (testo.indexOf('---') !== 0) throw new Error('il file non inizia con un frontmatter');

  const fine = testo.indexOf('\n---', 3);
  if (fine === -1) throw new Error('frontmatter senza chiusura');

  return {
    frontmatter: testo.slice(3, fine + 1),
    // Salta la riga di chiusura "---" e tiene il resto così com'è.
    corpo: testo.slice(fine + 4),
    fineRiga,
  };
}

export function ricomponiFile(
  frontmatter: string,
  corpo: string,
  fineRiga: FineRiga = '\n',
): string {
  const unito = `---\n${frontmatter.replace(/^\n+|\n+$/g, '')}\n---${corpo}`;
  return fineRiga === '\r\n' ? unito.replace(/\n/g, '\r\n') : unito;
}

/**
 * Applica le modifiche al frontmatter già interpretato e restituisce quello nuovo.
 *
 * Regole che valgono la pena di essere dette:
 *
 * - i campi dei passaggi che l'editor non tocca (foto, didascalia) restano dov'erano,
 *   perché si parte dal passaggio originale e si sovrascrivono solo i campi modificati;
 * - le note già presenti che puntavano a un passaggio seguono il passaggio se questo si
 *   sposta, e **non vengono mai cancellate**: se il passaggio a cui si riferivano è stato
 *   tolto, la nota resta come contributo generale. Le parole di qualcun altro non si
 *   buttano via per una modifica strutturale.
 */
export function applicaModifiche(frontmatter: Frontmatter, modifiche: Modifiche): Frontmatter {
  const passaggiOriginali = Array.isArray(frontmatter.passaggi)
    ? (frontmatter.passaggi as Record<string, unknown>[])
    : [];

  const nuoviPassaggi: Record<string, unknown>[] = [];
  /** posizione originale (0-based) → nuova posizione (1-based) */
  const spostamenti = new Map<number, number>();

  modifiche.passaggi.forEach((p, indice) => {
    const testo = p.testo.trim();
    if (!testo) throw new Error(`il passaggio ${indice + 1} è senza testo`);

    const base = p.originale !== null ? { ...passaggiOriginali[p.originale] } : {};
    const titolo = p.titolo?.trim();

    const passaggio: Record<string, unknown> = { ...base, testo };
    if (titolo) passaggio.titolo = titolo;
    else delete passaggio.titolo;

    if (p.durata !== undefined && p.durata > 0) passaggio.durata = p.durata;
    else delete passaggio.durata;

    // L'ordine delle chiavi rende il file leggibile a chi lo apre a mano.
    const ordinato: Record<string, unknown> = {};
    for (const chiave of ['titolo', 'testo', 'durata', 'foto', 'didascalia']) {
      if (passaggio[chiave] !== undefined) ordinato[chiave] = passaggio[chiave];
    }
    for (const [chiave, valore] of Object.entries(passaggio)) {
      if (ordinato[chiave] === undefined) ordinato[chiave] = valore;
    }

    nuoviPassaggi.push(ordinato);
    if (p.originale !== null) spostamenti.set(p.originale, indice + 1);
  });

  if (nuoviPassaggi.length === 0) {
    throw new Error('una ricetta senza passaggi non si può salvare');
  }

  const contributiEsistenti = Array.isArray(frontmatter.contributi)
    ? (frontmatter.contributi as Contributo[])
    : [];

  const contributi: Contributo[] = contributiEsistenti.map((c) => {
    if (typeof c.passaggio !== 'number') return { ...c };

    const nuovaPosizione = spostamenti.get(c.passaggio - 1);
    const aggiornato: Contributo = { ...c };
    if (nuovaPosizione === undefined) delete aggiornato.passaggio;
    else aggiornato.passaggio = nuovaPosizione;
    return aggiornato;
  });

  modifiche.passaggi.forEach((p, indice) => {
    const nota = p.nota?.trim();
    if (!nota) return;
    contributi.push({
      autore: modifiche.autore,
      data: modifiche.data,
      testo: nota,
      passaggio: indice + 1,
    });
  });

  const generale = modifiche.notaGenerale?.trim();
  if (generale) {
    contributi.push({ autore: modifiche.autore, data: modifiche.data, testo: generale });
  }

  const nuovo: Frontmatter = { ...frontmatter, passaggi: nuoviPassaggi };
  if (contributi.length > 0) nuovo.contributi = contributi;
  else delete nuovo.contributi;

  return nuovo;
}

/** Riassunto leggibile delle modifiche, usato come messaggio di commit. */
export function messaggioCommit(
  titoloRicetta: string,
  idRicetta: string,
  originali: number,
  modifiche: Modifiche,
): string {
  const aggiunti = modifiche.passaggi.filter((p) => p.originale === null).length;
  const tolti = originali - modifiche.passaggi.filter((p) => p.originale !== null).length;
  const note =
    modifiche.passaggi.filter((p) => p.nota?.trim()).length + (modifiche.notaGenerale?.trim() ? 1 : 0);

  const parti: string[] = [];
  if (note > 0) parti.push(note === 1 ? '1 nota' : `${note} note`);
  if (aggiunti > 0) parti.push(aggiunti === 1 ? '1 passaggio aggiunto' : `${aggiunti} passaggi aggiunti`);
  if (tolti > 0) parti.push(tolti === 1 ? '1 passaggio tolto' : `${tolti} passaggi tolti`);

  const riassunto = parti.length > 0 ? parti.join(', ') : 'passaggi rivisti';
  return `fix(${idRicetta}): ${titoloRicetta} — ${riassunto}`;
}
