/**
 * Chi non deve comparire fra i contributori di una ricetta.
 *
 * La storia viene letta da git, che registra ogni autore di commit. Alcuni di questi
 * non sono persone di famiglia e in un ricettario non hanno senso: il bot che pubblica
 * le edizioni, per esempio.
 *
 * Il confronto è su nome esatto o indirizzo email, senza distinzione di maiuscole.
 */
export const CONTRIBUTORI_NASCOSTI: string[] = [
  'github-actions[bot]',
  '41898282+github-actions[bot]@users.noreply.github.com',
];

export function daNascondere(nome: string): boolean {
  const n = nome.trim().toLowerCase();
  return CONTRIBUTORI_NASCOSTI.some((x) => x.toLowerCase() === n);
}
