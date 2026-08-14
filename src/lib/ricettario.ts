import { getCollection, type CollectionEntry } from 'astro:content';
import { SEZIONI, type Sezione } from '../data/sezioni';

export type Ricetta = CollectionEntry<'ricette'>;
export type Autore = CollectionEntry<'autori'>;

const collatore = new Intl.Collator('it-IT', { sensitivity: 'base' });

/** Tutte le ricette, in ordine alfabetico per titolo. */
export async function tutteLeRicette(): Promise<Ricetta[]> {
  const ricette = await getCollection('ricette');
  return ricette.sort((a, b) => collatore.compare(a.data.titolo, b.data.titolo));
}

export async function tuttiGliAutori(): Promise<Autore[]> {
  const autori = await getCollection('autori');
  return autori.sort(
    (a, b) => a.data.ordine - b.data.ordine || collatore.compare(a.data.nome, b.data.nome),
  );
}

export interface SezionePopolata {
  sezione: Sezione;
  ricette: Ricetta[];
}

/**
 * Le sezioni nell'ordine del libro, ciascuna con le sue ricette.
 * Le sezioni vuote vengono escluse per default: nel PDF un occhiello senza ricette
 * dietro sarebbe solo una pagina sprecata.
 */
export async function sezioniPopolate(includiVuote = false): Promise<SezionePopolata[]> {
  const ricette = await tutteLeRicette();
  return SEZIONI.map((sezione) => ({
    sezione,
    ricette: ricette.filter((r) => r.data.sezione === sezione.id),
  })).filter((s) => includiVuote || s.ricette.length > 0);
}

/** Mappa id-autore → autore, per risolvere i riferimenti senza N query. */
export async function mappaAutori(): Promise<Map<string, Autore>> {
  const autori = await getCollection('autori');
  return new Map(autori.map((a) => [a.id, a]));
}

/**
 * Traduce i nomi che compaiono nei commit git nel nome della scheda autore
 * corrispondente, seguendo il campo `alias`. Chi non ha una scheda resta com'è:
 * meglio un nome grezzo che un contributo attribuito alla persona sbagliata.
 */
export async function risolviContributori(nomi: string[]): Promise<string[]> {
  const autori = await getCollection('autori');
  const perAlias = new Map<string, string>();

  for (const a of autori) {
    perAlias.set(a.data.nome.toLowerCase(), a.data.nome);
    for (const alias of a.data.alias) perAlias.set(alias.toLowerCase(), a.data.nome);
  }

  const risolti: string[] = [];
  for (const nome of nomi) {
    const risolto = perAlias.get(nome.trim().toLowerCase()) ?? nome.trim();
    if (!risolti.includes(risolto)) risolti.push(risolto);
  }
  return risolti;
}

/** Nome dell'autore a partire dal riferimento della ricetta. */
export async function nomeAutore(idAutore: string): Promise<string> {
  const mappa = await mappaAutori();
  return mappa.get(idAutore)?.data.nome ?? idAutore;
}

/** Ricette firmate da un autore, in ordine alfabetico. */
export async function ricetteDiAutore(idAutore: string): Promise<Ricetta[]> {
  const ricette = await tutteLeRicette();
  return ricette.filter((r) => r.data.autore.id === idAutore);
}

/** Le ultime entrate nel ricettario, per la home. */
export async function ricetteRecenti(quante = 6): Promise<Ricetta[]> {
  const ricette = await tutteLeRicette();
  return ricette
    .filter((r) => r.data.dataInserimento)
    .sort((a, b) => b.data.dataInserimento!.getTime() - a.data.dataInserimento!.getTime())
    .slice(0, quante);
}

/** Vero se nel ricettario ci sono ancora ricette di prova. */
export async function ciSonoEsempi(): Promise<boolean> {
  const ricette = await getCollection('ricette');
  return ricette.some((r) => r.data.esempio);
}

/** Indice alfabetico del libro: titolo → id ricetta, ordinato all'italiana. */
export async function indiceAlfabetico(): Promise<Ricetta[]> {
  return tutteLeRicette();
}

export { collatore };
