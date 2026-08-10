/**
 * Le sezioni del ricettario, nell'ordine in cui compaiono nel sito e nel libro stampato.
 *
 * Aggiungere una sezione qui la rende automaticamente disponibile ovunque: menu, pagine
 * di sezione, indice del PDF e valori ammessi nel frontmatter delle ricette.
 */
export interface Sezione {
  /** Identificatore usato nel frontmatter e negli URL. */
  id: string;
  /** Nome mostrato nei titoli e nell'indice. */
  nome: string;
  /** Frase breve che apre la sezione nel sito e nell'occhiello del libro. */
  descrizione: string;
  /** Emoji usata come segnale visivo (nel PDF diventa un fregio discreto). */
  emoji: string;
}

export const SEZIONI = [
  {
    id: 'antipasti',
    nome: 'Antipasti e stuzzichini',
    descrizione: "Quello che si mette in tavola mentre si aspetta chi è sempre in ritardo.",
    emoji: '🫒',
  },
  {
    id: 'primi',
    nome: 'Primi piatti',
    descrizione: 'Paste, risotti, zuppe e minestre: il cuore della domenica.',
    emoji: '🍝',
  },
  {
    id: 'secondi',
    nome: 'Secondi piatti',
    descrizione: 'Carne, pesce, uova e piatti unici da portata.',
    emoji: '🍖',
  },
  {
    id: 'contorni',
    nome: 'Contorni',
    descrizione: 'Verdure e accompagnamenti, quelli che finiscono sempre per primi.',
    emoji: '🥗',
  },
  {
    id: 'lievitati',
    nome: 'Pane e lievitati',
    descrizione: 'Impasti che chiedono tempo e pazienza, e li restituiscono con gli interessi.',
    emoji: '🍞',
  },
  {
    id: 'dolci',
    nome: 'Dolci',
    descrizione: 'Torte, biscotti e cucchiaio: la parte del ricettario più consultata.',
    emoji: '🍰',
  },
  {
    id: 'conserve',
    nome: 'Conserve e salse',
    descrizione: 'Barattoli, sottoli e sughi da mettere via per i mesi freddi.',
    emoji: '🫙',
  },
  {
    id: 'bevande',
    nome: 'Bevande e liquori',
    descrizione: 'Da fine pasto o da merenda, con e senza alcol.',
    emoji: '🍷',
  },
] as const satisfies readonly Sezione[];

export type IdSezione = (typeof SEZIONI)[number]['id'];

export const ID_SEZIONI = SEZIONI.map((s) => s.id) as [IdSezione, ...IdSezione[]];

export function trovaSezione(id: string): Sezione | undefined {
  return SEZIONI.find((s) => s.id === id);
}

/** Nome della sezione, con fallback sull'id se la sezione non esiste (non dovrebbe mai capitare). */
export function nomeSezione(id: string): string {
  return trovaSezione(id)?.nome ?? id;
}
