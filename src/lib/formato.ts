/**
 * Formattazioni condivise fra sito e libro stampato: qui c'è una sola versione della verità
 * su come si scrive un tempo, una dose o una data.
 */

/** 95 → "1 h 35 min"; 60 → "1 h"; 0 → "—" */
export function formattaDurata(minuti: number | undefined): string {
  if (!minuti || minuti <= 0) return '—';
  if (minuti < 60) return `${minuti} min`;

  const ore = Math.floor(minuti / 60);
  const resto = minuti % 60;
  const giorni = Math.floor(ore / 24);

  if (giorni >= 1 && ore % 24 === 0 && resto === 0) {
    return giorni === 1 ? '1 giorno' : `${giorni} giorni`;
  }
  return resto === 0 ? `${ore} h` : `${ore} h ${resto} min`;
}

/** Somma di preparazione, cottura e riposo. */
export function tempoTotale(r: {
  tempoPreparazione: number;
  tempoCottura: number;
  tempoRiposo: number;
}): number {
  return r.tempoPreparazione + r.tempoCottura + r.tempoRiposo;
}

const formattatoreNumero = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });

/**
 * Compone la dose leggibile: "500 g", "1 spicchio", "2 spicchi", "q.b.".
 * Le unità di misura (g, ml, l...) restano invariate al plurale; le parole no.
 */
export function formattaDose(quantita?: number, unita?: string): string {
  const u = unita?.trim();
  if (quantita === undefined) return u ?? 'q.b.';
  const numero = formattatoreNumero.format(quantita);
  if (!u) return numero;
  return `${numero} ${pluralizzaUnita(u, quantita)}`;
}

const PLURALI: Record<string, string> = {
  pz: 'pz',
  spicchio: 'spicchi',
  cucchiaio: 'cucchiai',
  cucchiaino: 'cucchiaini',
  foglia: 'foglie',
  fetta: 'fette',
  tazza: 'tazze',
  bicchiere: 'bicchieri',
  pizzico: 'pizzichi',
  barattolo: 'barattoli',
  vasetto: 'vasetti',
  bustina: 'bustine',
  mazzetto: 'mazzetti',
  rametto: 'rametti',
  filo: 'fili',
  goccia: 'gocce',
  noce: 'noci',
};

function pluralizzaUnita(unita: string, quantita: number): string {
  if (quantita === 1) return unita;
  return PLURALI[unita.toLowerCase()] ?? unita;
}

const formattatoreData = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function formattaData(data: Date | string): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return Number.isNaN(d.getTime()) ? '' : formattatoreData.format(d);
}

/** "6 persone", "24 biscotti", "1 persona". */
export function formattaPorzioni(porzioni: number, unita: string): string {
  if (porzioni === 1 && unita === 'persone') return '1 persona';
  return `${formattatoreNumero.format(porzioni)} ${unita}`;
}
