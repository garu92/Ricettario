import { execFileSync } from 'node:child_process';
import { daNascondere } from '../data/contributori';

/**
 * La storia di una ricetta, ricavata da git.
 *
 * Le ricette sono file versionati: chi le ha scritte, chi le ha corrette e quando è già
 * tutto registrato nella storia del repository. Invece di tenere un secondo registro a
 * mano — che si dimentica di aggiornare al primo giro — qui si legge quello vero.
 *
 * Funziona in fase di build (il sito è statico), quindi il risultato finisce sia nelle
 * pagine sia nel PDF stampato.
 */

export interface VoceStoria {
  /** Hash breve del commit. */
  hash: string;
  data: Date;
  /** Nome dell'autore del commit. */
  autore: string;
  /** Prima riga del messaggio di commit. */
  messaggio: string;
}

export interface StoriaRicetta {
  /** Quante volte la ricetta è stata modificata. 0 = non ancora in git. */
  revisione: number;
  prima?: Date;
  ultima?: Date;
  ultimoHash?: string;
  /** Nomi di chi ha messo mano alla ricetta, dal più recente. */
  contributori: string[];
  voci: VoceStoria[];
}

const SEPARATORE_RECORD = '\x1e';
const SEPARATORE_CAMPO = '\x1f';

const memoria = new Map<string, StoriaRicetta>();

const VUOTA: StoriaRicetta = { revisione: 0, contributori: [], voci: [] };

/**
 * `Co-authored-by:` è la convenzione con cui git registra chi ha contribuito a un commit
 * senza esserne l'autore: è il modo giusto per dare credito a chi ha dettato una ricetta
 * mentre qualcun altro la scriveva al computer.
 */
function coautori(corpo: string): string[] {
  return [...corpo.matchAll(/^\s*co-authored-by:\s*([^<\n]+)/gim)].map((m) => m[1].trim());
}

export function storiaRicetta(idRicetta: string): StoriaRicetta {
  const memorizzata = memoria.get(idRicetta);
  if (memorizzata) return memorizzata;

  const file = `src/content/ricette/${idRicetta}.md`;
  let grezzo = '';

  try {
    grezzo = execFileSync(
      'git',
      [
        'log',
        '--follow',
        '--date=iso-strict',
        `--format=${SEPARATORE_RECORD}%h${SEPARATORE_CAMPO}%ad${SEPARATORE_CAMPO}%an${SEPARATORE_CAMPO}%s${SEPARATORE_CAMPO}%b`,
        '--',
        file,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
  } catch {
    // Nessun git, oppure ricetta appena creata e non ancora committata.
    memoria.set(idRicetta, VUOTA);
    return VUOTA;
  }

  const voci: VoceStoria[] = [];
  const contributori: string[] = [];

  const aggiungiContributore = (nome: string) => {
    const pulito = nome.trim();
    if (!pulito || daNascondere(pulito)) return;
    if (!contributori.some((c) => c.toLowerCase() === pulito.toLowerCase())) {
      contributori.push(pulito);
    }
  };

  for (const record of grezzo.split(SEPARATORE_RECORD)) {
    if (!record.trim()) continue;
    const [hash = '', data = '', autore = '', messaggio = '', corpo = ''] =
      record.split(SEPARATORE_CAMPO);

    const quando = new Date(data.trim());
    voci.push({
      hash: hash.trim(),
      data: quando,
      autore: autore.trim(),
      messaggio: messaggio.trim(),
    });

    aggiungiContributore(autore);
    for (const co of coautori(corpo)) aggiungiContributore(co);
  }

  if (voci.length === 0) {
    memoria.set(idRicetta, VUOTA);
    return VUOTA;
  }

  const storia: StoriaRicetta = {
    revisione: voci.length,
    // git log elenca dal più recente al più vecchio.
    ultima: voci[0].data,
    prima: voci[voci.length - 1].data,
    ultimoHash: voci[0].hash,
    contributori,
    voci,
  };

  memoria.set(idRicetta, storia);
  return storia;
}
