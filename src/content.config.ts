import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { ID_SEZIONI } from './data/sezioni';

/**
 * Schema dei contenuti del ricettario.
 *
 * Tutto ciò che serve al sito e al libro PDF passa da qui: se un frontmatter è incompleto
 * o sbagliato la build fallisce, invece di produrre una pagina — o peggio, una pagina
 * stampata — con un buco dentro.
 */

const ingrediente = z.object({
  nome: z.string().min(1),
  /** Omessa per gli ingredienti "a piacere"; usare `unita: 'q.b.'` in quel caso. */
  quantita: z.number().positive().optional(),
  /** g, kg, ml, l, pz, cucchiaio, cucchiaino, spicchio, q.b., ... */
  unita: z.string().optional(),
  /** Precisazione breve: "a dadini", "a temperatura ambiente", "possibilmente di Sorrento". */
  note: z.string().optional(),
});

const gruppoIngredienti = z.object({
  /** Es. "Per la frolla", "Per la farcia". Assente se la ricetta ha una lista sola. */
  gruppo: z.string().optional(),
  voci: z.array(ingrediente).min(1),
});

/**
 * Accetta sia la forma piatta (lista di ingredienti) sia quella a gruppi, e normalizza
 * sempre a gruppi: chi scrive una ricetta semplice non deve inventarsi un gruppo finto.
 */
const ingredienti = z.preprocess(
  (valore) => {
    if (!Array.isArray(valore)) return valore;
    const haGruppi = valore.some((v) => v !== null && typeof v === 'object' && 'voci' in v);
    return haGruppi ? valore : [{ voci: valore }];
  },
  z.array(gruppoIngredienti).min(1),
);

const passaggio = z.object({
  /** Titolo opzionale della fase: "Impasto", "Cottura", "Il giorno dopo". */
  titolo: z.string().optional(),
  testo: z.string().min(1),
  /** Minuti, se il passaggio ha una durata propria da tenere d'occhio. */
  durata: z.number().nonnegative().optional(),
  /**
   * Foto del passaggio, come percorso dentro `public/`:
   * `/foto/<slug-ricetta>/passo-1.jpg`.
   *
   * Il file può non esserci ancora: al suo posto compare un riquadro tratteggiato con
   * il percorso da riempire, così la ricetta si scrive prima e si fotografa dopo.
   */
  foto: z.string().optional(),
  /** Didascalia della foto: cosa si deve guardare. */
  didascalia: z.string().optional(),
});

/** Un passaggio può essere scritto come semplice stringa: viene normalizzato a oggetto. */
const passaggi = z.preprocess(
  (valore) =>
    Array.isArray(valore) ? valore.map((v) => (typeof v === 'string' ? { testo: v } : v)) : valore,
  z.array(passaggio).min(1),
);

const ricette = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/ricette' }),
  schema: z.object({
    titolo: z.string().min(1),
    sezione: z.enum(ID_SEZIONI),
    autore: reference('autori'),
    /** Una o due righe di presentazione, usate nelle liste e sotto il titolo. */
    descrizione: z.string().optional(),

    porzioni: z.number().positive(),
    /** Cosa si conta: "persone" (default), "biscotti", "vasetti", "litri"... */
    unitaPorzioni: z.string().default('persone'),

    /** Tutti i tempi sono in minuti. */
    tempoPreparazione: z.number().nonnegative(),
    tempoCottura: z.number().nonnegative().default(0),
    /** Lievitazione, marinatura, riposo in frigo. */
    tempoRiposo: z.number().nonnegative().default(0),

    difficolta: z.enum(['facile', 'media', 'difficile']).default('media'),
    stagione: z.array(z.enum(['primavera', 'estate', 'autunno', 'inverno'])).default([]),

    /** Pentole, stampi, elettrodomestici: quello che serve avere prima di iniziare. */
    accessori: z.array(z.string()).default([]),

    ingredienti,
    passaggi,

    /**
     * Le migliorie aggiunte nel tempo da chi la ricetta l'ha rifatta: una riga per
     * contributo, firmata e datata. È la memoria delle iterazioni, quella che di solito
     * si perde nei messaggi o resta scritta a matita sul quaderno.
     */
    contributi: z
      .array(
        z.object({
          autore: reference('autori'),
          data: z.coerce.date(),
          testo: z.string().min(1),
        }),
      )
      .default([]),

    conservazione: z.string().optional(),
    /** Consigli, varianti, ricordi di famiglia. Il corpo Markdown serve per note più lunghe. */
    note: z.string().optional(),
    /** Da dove arriva la ricetta, se non è di famiglia. */
    fonte: z.string().optional(),

    tag: z.array(z.string()).default([]),
    /** Data in cui la ricetta è entrata nel ricettario. */
    dataInserimento: z.coerce.date().optional(),

    /**
     * Ricetta di prova, inserita solo per far vedere come funziona il ricettario.
     * `npm run rimuovi-esempi` cancella tutti i file marcati così, e nient'altro.
     */
    esempio: z.boolean().default(false),
  }),
});

const autori = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/autori' }),
  schema: z.object({
    nome: z.string().min(1),
    /** Come si colloca in famiglia: "Nonna", "Zio", "Cugina di secondo grado". */
    relazione: z.string().optional(),
    /** Due righe di ritratto, mostrate nella pagina autori e nel libro. */
    nota: z.string().optional(),
    /** Ordine di comparsa nella pagina autori; a parità vince l'ordine alfabetico. */
    ordine: z.number().default(100),
    /**
     * Nomi e indirizzi email usati da questa persona nei commit git, per collegare
     * la storia dei file alla sua scheda: `alias: [Giulio, giulio.marano@gmail.com]`.
     */
    alias: z.array(z.string()).default([]),
    esempio: z.boolean().default(false),
  }),
});

export const collections = { ricette, autori };
