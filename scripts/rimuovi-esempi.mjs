#!/usr/bin/env node
/**
 * Cancella tutte le ricette e gli autori marcati `esempio: true`, e nient'altro.
 *
 *   node scripts/rimuovi-esempi.mjs            elenca cosa verrebbe cancellato
 *   node scripts/rimuovi-esempi.mjs --conferma cancella davvero
 *
 * Un autore d'esempio viene tenuto se ha ancora ricette vere collegate: cancellarlo
 * romperebbe la build (le ricette lo referenziano).
 */

import { readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { basename, join } from 'node:path';

const conferma = process.argv.includes('--conferma');
const CARTELLA_RICETTE = 'src/content/ricette';
const CARTELLA_AUTORI = 'src/content/autori';

const leggi = (cartella) =>
  readdirSync(cartella)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({
      id: basename(f, '.md'),
      percorso: join(cartella, f),
      testo: readFileSync(join(cartella, f), 'utf8'),
    }));

const eEsempio = (v) => /^esempio:\s*true\s*$/m.test(v.testo);
const autoreDi = (testo) => testo.match(/^autore:\s*(.+)$/m)?.[1].trim();

const ricette = leggi(CARTELLA_RICETTE);
const autori = leggi(CARTELLA_AUTORI);

const ricetteDaTogliere = ricette.filter(eEsempio);
const ricetteRimaste = ricette.filter((r) => !eEsempio(r));
const autoriAncoraUsati = new Set(ricetteRimaste.map((r) => autoreDi(r.testo)));

const autoriDaTogliere = autori.filter((a) => eEsempio(a) && !autoriAncoraUsati.has(a.id));
const autoriTenuti = autori.filter((a) => eEsempio(a) && autoriAncoraUsati.has(a.id));

if (ricetteDaTogliere.length === 0 && autoriDaTogliere.length === 0) {
  console.log('Nessuna ricetta di prova da rimuovere: il ricettario è già tutto vero.');
  process.exit(0);
}

console.log(`Ricette di prova: ${ricetteDaTogliere.length}`);
for (const r of ricetteDaTogliere) console.log(`  - ${r.percorso}`);
console.log(`Autori di prova non più citati: ${autoriDaTogliere.length}`);
for (const a of autoriDaTogliere) console.log(`  - ${a.percorso}`);

if (autoriTenuti.length > 0) {
  console.log('\nAutori d\'esempio tenuti perché firmano ancora ricette vere:');
  for (const a of autoriTenuti) console.log(`  - ${a.id}`);
}

if (!conferma) {
  console.log('\nNiente è stato cancellato. Riesegui con --conferma per procedere.');
  process.exit(0);
}

for (const v of [...ricetteDaTogliere, ...autoriDaTogliere]) unlinkSync(v.percorso);
console.log(
  `\nRimossi ${ricetteDaTogliere.length} file di ricette e ${autoriDaTogliere.length} di autori.`,
);
console.log('Ricontrolla con `npm run build` e rigenera il PDF con `npm run pdf`.');
