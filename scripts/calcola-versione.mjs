#!/usr/bin/env node
/**
 * Calcola la prossima versione del ricettario leggendo i commit fatti dall'ultimo tag.
 *
 *   node scripts/calcola-versione.mjs             mostra cosa succederebbe
 *   node scripts/calcola-versione.mjs --applica   scrive versione e CHANGELOG
 *   node scripts/calcola-versione.mjs --imposta 2.0.0 --applica   versione a mano
 *
 * Regole (Conventional Commits, versione minima):
 *   BREAKING CHANGE nel corpo, o `!` prima dei due punti   → major
 *   feat: ...                                              → minor
 *   tutto il resto                                         → patch
 *
 * Il CHANGELOG non elenca hash: elenca **quali ricette** sono entrate o sono
 * cambiate, che è l'unica cosa che interessa sapere di un'edizione del ricettario.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const argomenti = process.argv.slice(2);
const applica = argomenti.includes('--applica');
const indiceImposta = argomenti.indexOf('--imposta');
const versioneImposta = indiceImposta !== -1 ? argomenti[indiceImposta + 1] : null;

const RADICE = resolve('.');
const CARTELLA_RICETTE = 'src/content/ricette';

function git(...args) {
  try {
    // stderr ignorato: `git describe` senza tag è un caso normale, non un errore da mostrare.
    return execFileSync('git', args, {
      cwd: RADICE,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

/** L'ultimo tag di versione, o null se il ricettario non ha ancora edizioni. */
function ultimoTag() {
  const tag = git('describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*');
  return tag || null;
}

function commitDa(riferimento) {
  const intervallo = riferimento ? `${riferimento}..HEAD` : 'HEAD';
  const grezzo = git('log', intervallo, '--no-merges', '--pretty=format:%s%x1f%b%x1e');
  if (!grezzo) return [];

  return grezzo
    .split('\x1e')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const [oggetto = '', corpo = ''] = c.split('\x1f');
      return { oggetto: oggetto.trim(), corpo: corpo.trim() };
    });
}

/** major | minor | patch, in base ai messaggi di commit. */
function tipoDiSalto(commit) {
  const rompente = commit.some(
    (c) => /^[a-z]+(\([^)]*\))?!:/.test(c.oggetto) || /BREAKING[ -]CHANGE/.test(c.corpo),
  );
  if (rompente) return 'major';

  const nuoveFunzioni = commit.some((c) => /^feat(\([^)]*\))?:/.test(c.oggetto));
  return nuoveFunzioni ? 'minor' : 'patch';
}

function prossimaVersione(attuale, salto) {
  const [major, minor, patch] = attuale.split('.').map((n) => Number.parseInt(n, 10) || 0);
  if (salto === 'major') return `${major + 1}.0.0`;
  if (salto === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/** Ricette aggiunte, modificate o rimosse rispetto al tag precedente. */
function ricetteCambiate(riferimento) {
  if (!riferimento) {
    return {
      aggiunte: readdirSync(CARTELLA_RICETTE)
        .filter((f) => f.endsWith('.md'))
        .map((f) => basename(f, '.md')),
      modificate: [],
      rimosse: [],
    };
  }

  const grezzo = git('diff', '--name-status', `${riferimento}..HEAD`, '--', CARTELLA_RICETTE);
  const risultato = { aggiunte: [], modificate: [], rimosse: [] };

  for (const riga of grezzo.split('\n').filter(Boolean)) {
    const [stato, percorso] = riga.split('\t');
    if (!percorso?.endsWith('.md')) continue;
    const nome = basename(percorso, '.md');
    if (stato.startsWith('A')) risultato.aggiunte.push(nome);
    else if (stato.startsWith('D')) risultato.rimosse.push(nome);
    else risultato.modificate.push(nome);
  }
  return risultato;
}

/** Il titolo leggibile della ricetta, letto dal frontmatter. */
function titoloRicetta(nome) {
  const percorso = `${CARTELLA_RICETTE}/${nome}.md`;
  if (!existsSync(percorso)) return nome;
  const riga = readFileSync(percorso, 'utf8')
    .split('\n')
    .find((r) => r.startsWith('titolo:'));
  return riga ? riga.slice('titolo:'.length).trim().replace(/^["']|["']$/g, '') : nome;
}

function contaRicette() {
  return existsSync(CARTELLA_RICETTE)
    ? readdirSync(CARTELLA_RICETTE).filter((f) => f.endsWith('.md')).length
    : 0;
}

function sezioneChangelog(versione, data, salto, cambiate, commit) {
  const righe = [`## v${versione} — ${data}`, ''];

  const elenco = (titolo, nomi) => {
    if (nomi.length === 0) return;
    righe.push(`### ${titolo}`, '');
    for (const nome of nomi.sort()) righe.push(`- ${titoloRicetta(nome)}`);
    righe.push('');
  };

  elenco('Ricette aggiunte', cambiate.aggiunte);
  elenco('Ricette aggiornate', cambiate.modificate);
  elenco('Ricette rimosse', cambiate.rimosse);

  const altri = commit.filter((c) => !/^(chore|release)/.test(c.oggetto)).map((c) => c.oggetto);
  if (altri.length > 0) {
    righe.push('### Modifiche al ricettario', '');
    for (const oggetto of altri) righe.push(`- ${oggetto}`);
    righe.push('');
  }

  if (cambiate.aggiunte.length + cambiate.modificate.length + cambiate.rimosse.length === 0 && altri.length === 0) {
    righe.push(`Nessuna modifica al contenuto (salto ${salto}).`, '');
  }

  return righe.join('\n');
}

// ---------------------------------------------------------------------------

const pacchetto = JSON.parse(readFileSync('package.json', 'utf8'));
const tag = ultimoTag();
const commit = commitDa(tag);
const salto = versioneImposta ? 'manuale' : tipoDiSalto(commit);
const versioneAttuale = tag ? tag.replace(/^v/, '') : pacchetto.version;
const versione = versioneImposta ?? prossimaVersione(versioneAttuale, salto);
const cambiate = ricetteCambiate(tag);
const data = new Date().toISOString().slice(0, 10);
const commitCorrente = git('rev-parse', '--short', 'HEAD') || 'locale';

const nulla = commit.length === 0 && !versioneImposta;

console.log(`Ultimo tag:        ${tag ?? '(nessuno)'}`);
console.log(`Commit dall'ultimo tag: ${commit.length}`);
console.log(`Salto:             ${salto}`);
console.log(`Versione:          ${versioneAttuale} → ${versione}`);
console.log(
  `Ricette:           +${cambiate.aggiunte.length} ~${cambiate.modificate.length} -${cambiate.rimosse.length}`,
);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    [
      `versione=${versione}`,
      `tag=v${versione}`,
      `salto=${salto}`,
      `data=${data}`,
      `da_pubblicare=${nulla ? 'false' : 'true'}`,
    ].join('\n') + '\n',
  );
}

if (nulla) {
  console.log('\nNiente da pubblicare: nessun commit dopo l\'ultimo tag.');
  process.exit(0);
}

if (!applica) {
  console.log('\n--- anteprima CHANGELOG ---\n');
  console.log(sezioneChangelog(versione, data, salto, cambiate, commit));
  console.log('Esegui con --applica per scrivere le modifiche.');
  process.exit(0);
}

// package.json
pacchetto.version = versione;
writeFileSync('package.json', `${JSON.stringify(pacchetto, null, 2)}\n`);

// versione.json, letta dal sito e dal frontespizio del PDF
writeFileSync(
  'src/data/versione.json',
  `${JSON.stringify(
    { versione, data, commit: commitCorrente, numeroRicette: contaRicette() },
    null,
    2,
  )}\n`,
);

// CHANGELOG: la sezione nuova va in cima, sotto il titolo
const intestazione = '# Storico delle edizioni\n\nOgni push su `main` produce una nuova edizione del ricettario, con il PDF rigenerato.\n';
const esistente = existsSync('CHANGELOG.md')
  ? readFileSync('CHANGELOG.md', 'utf8').replace(intestazione, '').trimStart()
  : '';
writeFileSync(
  'CHANGELOG.md',
  `${intestazione}\n${sezioneChangelog(versione, data, salto, cambiate, commit)}\n${esistente}`.trimEnd() + '\n',
);

console.log(`\nScritti package.json, src/data/versione.json e CHANGELOG.md per la v${versione}.`);
