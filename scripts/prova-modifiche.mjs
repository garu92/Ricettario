#!/usr/bin/env node
/**
 * Prove sul motore delle modifiche (`src/lib/modifica-ricetta.ts`).
 *
 * È il codice che riscrive il file di una ricetta quando qualcuno la modifica dal sito:
 * se sbaglia, rovina una ricetta. Qui si controlla che i casi che contano si comportino
 * come devono, senza browser e senza rete.
 *
 *   npm run prova
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dump, load } from 'js-yaml';
import {
  applicaModifiche,
  messaggioCommit,
  ricomponiFile,
  separaFrontmatter,
} from '../src/lib/modifica-ricetta.ts';

let passate = 0;

function prova(nome, fn) {
  try {
    fn();
    passate++;
    console.log(`  ok   ${nome}`);
  } catch (errore) {
    console.error(`  KO   ${nome}\n       ${errore.message}`);
    process.exitCode = 1;
  }
}

const FILE = 'src/content/ricette/pasta-alla-carbonara.md';
const originale = readFileSync(FILE, 'utf8');
const { frontmatter, corpo, fineRiga } = separaFrontmatter(originale);
const dati = load(frontmatter);

/** Trasforma i passaggi del file in ingresso per l'editor, come fa la pagina. */
const daFile = (fm) =>
  fm.passaggi.map((p, i) => ({
    originale: i,
    titolo: p.titolo,
    testo: p.testo,
    durata: p.durata,
  }));

const BASE = { autore: 'giulio-marano', data: '2026-08-17' };

console.log('Prove sul motore delle modifiche\n');

prova('separa e ricompone senza alterare il file', () => {
  assert.equal(ricomponiFile(frontmatter, corpo, fineRiga), originale);
});

// Su Windows git consegna spesso i file con fine riga CRLF. Se il motore le perdesse,
// salvare una nota di due righe produrrebbe un diff su tutta la ricetta.
const CRLF = '\r\n';
const aCrlf = (testo) => testo.replace(/\r?\n/g, CRLF);

prova('un file con fine riga Windows torna identico', () => {
  const conCrlf = aCrlf(originale);
  const separato = separaFrontmatter(conCrlf);
  assert.equal(separato.fineRiga, CRLF);
  assert.equal(ricomponiFile(separato.frontmatter, separato.corpo, separato.fineRiga), conCrlf);
});

prova('le fini riga non si mescolano quando si riscrive il frontmatter', () => {
  const separato = separaFrontmatter(aCrlf(originale));
  const letto = load(separato.frontmatter);
  const nuovo = applicaModifiche(letto, {
    ...BASE,
    passaggi: daFile(letto),
    notaGenerale: 'Prova.',
  });
  const file = ricomponiFile(
    dump(nuovo, { lineWidth: 100, noRefs: true }),
    separato.corpo,
    separato.fineRiga,
  );
  const righeUnix = file.split(CRLF).join('').includes('\n');
  assert.equal(righeUnix, false, 'è rimasta una riga con fine riga Unix');
});

prova('salvare senza toccare niente lascia i passaggi identici', () => {
  const nuovo = applicaModifiche(dati, { ...BASE, passaggi: daFile(dati) });
  assert.deepEqual(
    nuovo.passaggi.map((p) => p.testo),
    dati.passaggi.map((p) => p.testo),
  );
  assert.equal(nuovo.contributi, undefined);
});

prova('le foto restano attaccate al loro passaggio', () => {
  const nuovo = applicaModifiche(dati, { ...BASE, passaggi: daFile(dati) });
  assert.equal(nuovo.passaggi[2].foto, '/foto/pasta-alla-carbonara/passo-3.jpg');
  assert.equal(nuovo.passaggi[2].didascalia, dati.passaggi[2].didascalia);
});

prova('una nota su un passaggio diventa un contributo firmato', () => {
  const passaggi = daFile(dati);
  passaggi[2].nota = 'Il rame si vede meglio a fuoco basso.';
  const nuovo = applicaModifiche(dati, { ...BASE, passaggi });

  assert.equal(nuovo.contributi.length, 1);
  assert.deepEqual(nuovo.contributi[0], {
    autore: 'giulio-marano',
    data: '2026-08-17',
    testo: 'Il rame si vede meglio a fuoco basso.',
    passaggio: 3,
  });
});

prova('un passaggio nuovo si infila dove lo si mette', () => {
  const passaggi = daFile(dati);
  passaggi.splice(1, 0, { originale: null, titolo: 'Il pepe', testo: 'Macinalo al momento.' });
  const nuovo = applicaModifiche(dati, { ...BASE, passaggi });

  assert.equal(nuovo.passaggi.length, dati.passaggi.length + 1);
  assert.equal(nuovo.passaggi[1].titolo, 'Il pepe');
  assert.equal(nuovo.passaggi[2].testo, dati.passaggi[1].testo);
});

prova('togliendo un passaggio le note dei successivi lo seguono', () => {
  const conNota = {
    ...dati,
    contributi: [{ autore: 'giulio-marano', data: '2026-08-01', testo: 'Nota al quarto.', passaggio: 4 }],
  };
  const passaggi = daFile(conNota).filter((_, i) => i !== 0);
  const nuovo = applicaModifiche(conNota, { ...BASE, passaggi });

  assert.equal(nuovo.passaggi.length, dati.passaggi.length - 1);
  // Il quarto passaggio è diventato il terzo: la nota lo segue.
  assert.equal(nuovo.contributi[0].passaggio, 3);
});

prova('togliendo un passaggio la sua nota resta, come contributo generale', () => {
  const conNota = {
    ...dati,
    contributi: [{ autore: 'giulio-marano', data: '2026-08-01', testo: 'Nota al primo.', passaggio: 1 }],
  };
  const passaggi = daFile(conNota).filter((_, i) => i !== 0);
  const nuovo = applicaModifiche(conNota, { ...BASE, passaggi });

  assert.equal(nuovo.contributi.length, 1);
  assert.equal(nuovo.contributi[0].testo, 'Nota al primo.');
  assert.equal(nuovo.contributi[0].passaggio, undefined);
});

prova('un passaggio senza testo viene rifiutato', () => {
  const passaggi = daFile(dati);
  passaggi[0].testo = '   ';
  assert.throws(() => applicaModifiche(dati, { ...BASE, passaggi }), /senza testo/);
});

prova('una ricetta senza passaggi viene rifiutata', () => {
  assert.throws(() => applicaModifiche(dati, { ...BASE, passaggi: [] }), /senza passaggi/);
});

prova('il file ricomposto è ancora YAML valido e rileggibile', () => {
  const passaggi = daFile(dati);
  passaggi[0].nota = 'Prova.';
  const nuovo = applicaModifiche(dati, { ...BASE, passaggi });
  const file = ricomponiFile(dump(nuovo, { lineWidth: 100, noRefs: true }), corpo);

  const riletto = load(separaFrontmatter(file).frontmatter);
  assert.equal(riletto.titolo, dati.titolo);
  assert.equal(riletto.passaggi.length, dati.passaggi.length);
  assert.equal(riletto.contributi[0].testo, 'Prova.');
  assert.equal(separaFrontmatter(file).corpo, corpo);
});

prova('il messaggio di commit racconta cosa è cambiato', () => {
  const passaggi = daFile(dati).filter((_, i) => i !== 0);
  passaggi[0].nota = 'Una nota.';
  passaggi.push({ originale: null, testo: 'Un passaggio nuovo.' });

  const messaggio = messaggioCommit('Pasta alla carbonara', 'pasta-alla-carbonara', dati.passaggi.length, {
    ...BASE,
    passaggi,
  });
  assert.match(messaggio, /^fix\(pasta-alla-carbonara\): Pasta alla carbonara — /);
  assert.match(messaggio, /1 nota/);
  assert.match(messaggio, /1 passaggio aggiunto/);
  assert.match(messaggio, /1 passaggio tolto/);
});

console.log(`\n${passate} prove passate${process.exitCode ? ', con errori' : ''}.`);
