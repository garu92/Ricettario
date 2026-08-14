#!/usr/bin/env node
/**
 * Genera le immagini segnaposto per i passaggi che citano una foto non ancora scattata.
 *
 *   node scripts/genera-segnaposto.mjs                        tutte le ricette
 *   node scripts/genera-segnaposto.mjs pasta-alla-carbonara   una sola
 *   node scripts/genera-segnaposto.mjs --tutte                rifà anche quelle esistenti
 *
 * Ogni immagine porta impressa la scritta FOTO NON UFFICIALE: serve a non far sembrare
 * vera una foto che non lo è, né sul sito né sulla pagina stampata. Quando si sostituisce
 * il file con la foto vera, la scritta sparisce da sé — non è un livello del sito, è
 * dentro l'immagine segnaposto.
 *
 * Le foto scattate davvero non vengono mai toccate: si generano solo i file mancanti.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { load as leggiYaml } from 'js-yaml';
import { avviaBrowser } from './lib/browser.mjs';

const argomenti = process.argv.slice(2);
const rigenera = argomenti.includes('--tutte');
const soloRicetta = argomenti.find((a) => !a.startsWith('--'));

const CARTELLA_RICETTE = 'src/content/ricette';
const PUBBLICA = resolve('public');

const log = (m) => console.log(`[segnaposto] ${m}`);

/** Legge titolo e passaggi dal frontmatter di una ricetta. */
function leggiRicetta(file) {
  const testo = readFileSync(join(CARTELLA_RICETTE, file), 'utf8');
  const fine = testo.indexOf('\n---', 4);
  if (fine === -1) return null;

  const dati = leggiYaml(testo.slice(4, fine));
  return {
    id: basename(file, '.md'),
    titolo: dati?.titolo ?? basename(file, '.md'),
    passaggi: Array.isArray(dati?.passaggi) ? dati.passaggi : [],
  };
}

/** Tutte le foto dichiarate ma non ancora presenti in public/. */
function fotoDaGenerare(ricetta) {
  return ricetta.passaggi
    .map((passaggio, indice) => {
      const foto = typeof passaggio === 'object' ? passaggio.foto : undefined;
      if (!foto) return null;
      const percorsoFile = join(PUBBLICA, foto.replace(/^\//, ''));
      if (existsSync(percorsoFile) && !rigenera) return null;
      return {
        numero: indice + 1,
        titolo: (typeof passaggio === 'object' && passaggio.titolo) || `Passaggio ${indice + 1}`,
        percorsoFile,
      };
    })
    .filter(Boolean);
}

/** La cartolina che diventerà l'immagine: pensata per leggersi anche stampata piccola. */
function paginaSegnaposto({ numero, titolo, ricetta }) {
  const esc = (t) =>
    String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 1400px; height: 1050px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 26px;
    background: #f2ece0;
    font-family: Georgia, 'Times New Roman', serif;
    color: #2c2723;
    position: relative;
  }
  body::before {
    content: ''; position: absolute; inset: 26px;
    border: 3px solid #d9cfbb;
  }
  .numero {
    width: 118px; height: 118px; border-radius: 50%;
    border: 3px solid #a8452c; color: #a8452c;
    display: flex; align-items: center; justify-content: center;
    font-size: 58px;
  }
  .titolo { font-size: 62px; text-align: center; max-width: 76%; line-height: 1.1; }
  .ricetta {
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 25px; letter-spacing: .22em; text-transform: uppercase; color: #857b6d;
  }
  .fascia {
    margin-top: 22px;
    background: #a8452c; color: #fdf8ef;
    padding: 20px 66px;
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 40px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase;
  }
  .nota {
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 24px; color: #857b6d;
  }
</style></head><body>
  <div class="numero">${numero}</div>
  <div class="titolo">${esc(titolo)}</div>
  <div class="ricetta">${esc(ricetta)}</div>
  <div class="fascia">Foto non ufficiale</div>
  <div class="nota">segnaposto — sostituisci il file con la foto vera</div>
</body></html>`;
}

// ---------------------------------------------------------------------------

const file = readdirSync(CARTELLA_RICETTE).filter((f) => f.endsWith('.md'));
const ricette = file
  .map(leggiRicetta)
  .filter(Boolean)
  .filter((r) => !soloRicetta || r.id === soloRicetta);

if (ricette.length === 0) {
  console.error(`Nessuna ricetta trovata${soloRicetta ? ` con id "${soloRicetta}"` : ''}.`);
  process.exit(1);
}

const lavoro = ricette.flatMap((r) =>
  fotoDaGenerare(r).map((f) => ({ ...f, ricetta: r.titolo, idRicetta: r.id })),
);

if (lavoro.length === 0) {
  log('nessuna foto da generare: tutti i passaggi hanno già la loro immagine.');
  process.exit(0);
}

log(`${lavoro.length} immagini da generare`);

const browser = await avviaBrowser(log);
const pagina = await browser.newPage({ viewport: { width: 1400, height: 1050 } });

for (const voce of lavoro) {
  await pagina.setContent(paginaSegnaposto(voce), { waitUntil: 'load' });
  mkdirSync(dirname(voce.percorsoFile), { recursive: true });
  await pagina.screenshot({ path: voce.percorsoFile, type: 'jpeg', quality: 88 });
  log(`${voce.idRicetta} · passaggio ${voce.numero} → ${voce.percorsoFile.replace(PUBBLICA, 'public')}`);
}

await browser.close();
log('fatto. Rigenera il libro con `npm run pdf`.');
