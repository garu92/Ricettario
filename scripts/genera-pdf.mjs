#!/usr/bin/env node
/**
 * Genera il PDF stampabile dell'intero ricettario a partire da dist/.
 *
 *   npm run pdf                                 build del sito + PDF
 *   node scripts/genera-pdf.mjs                 solo PDF, dal dist/ già presente
 *   node scripts/genera-pdf.mjs --uscita x.pdf  cambia il file di destinazione
 *
 * Il percorso è: pagina /stampa/ del sito statico → Paged.js impagina in A5 dentro
 * Chromium (indice con numeri di pagina veri, testatine, numerazione) → Chromium stampa.
 */

import { copyFileSync, createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const argomenti = process.argv.slice(2);
const indiceUscita = argomenti.indexOf('--uscita');
/**
 * Il PDF vive in public/: così Astro lo copia da solo dentro dist/ alla build
 * successiva ed è scaricabile dal sito all'indirizzo /pdf/ricettario-marano.pdf.
 */
const fileUscita = resolve(
  indiceUscita !== -1 ? argomenti[indiceUscita + 1] : 'public/pdf/ricettario-marano.pdf',
);

const RADICE = resolve('.');
const DIST = join(RADICE, 'dist');
/** Deve combaciare con `base` in astro.config.mjs: il sito buildato usa link assoluti. */
const BASE = (process.env.SITO_BASE ?? '/').replace(/\/*$/, '/');

const TIPI = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function log(messaggio) {
  console.log(`[pdf] ${messaggio}`);
}

/** Serve dist/ sotto il prefisso `base`, come farà GitHub Pages. */
function avviaServer() {
  const server = createServer((richiesta, risposta) => {
    let percorso = decodeURIComponent(new URL(richiesta.url, 'http://localhost').pathname);

    if (BASE !== '/' && percorso.startsWith(BASE.slice(0, -1))) {
      percorso = percorso.slice(BASE.length - 1) || '/';
    }

    // normalize() blocca i tentativi di uscire da dist/ con ../
    let file = join(DIST, normalize(percorso).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(DIST)) {
      risposta.writeHead(403).end('vietato');
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      risposta.writeHead(404).end(`non trovato: ${percorso}`);
      return;
    }

    risposta.writeHead(200, {
      'content-type': TIPI[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(risposta);
  });

  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

/**
 * Chromium scaricato da Playwright è la scelta giusta (è quello che gira in CI), ma su una
 * macchina dove non è stato scaricato si ripiega su Edge o Chrome di sistema: entrambi
 * stampano allo stesso modo, e così `npm run pdf` funziona anche senza `playwright install`.
 */
async function avviaBrowser() {
  const tentativi = [
    { nome: 'Chromium di Playwright', opzioni: {} },
    { nome: 'Microsoft Edge di sistema', opzioni: { channel: 'msedge' } },
    { nome: 'Google Chrome di sistema', opzioni: { channel: 'chrome' } },
  ];

  for (const tentativo of tentativi) {
    try {
      const browser = await chromium.launch(tentativo.opzioni);
      log(`browser: ${tentativo.nome}`);
      return browser;
    } catch {
      // si prova il successivo
    }
  }

  throw new Error(
    'nessun browser disponibile: esegui `npx playwright install chromium`, oppure installa Edge o Chrome.',
  );
}

async function main() {
  if (!existsSync(join(DIST, 'stampa', 'index.html'))) {
    console.error('[pdf] manca dist/stampa/index.html — esegui prima `npm run build`.');
    process.exit(1);
  }

  const server = await avviaServer();
  const porta = server.address().port;
  const indirizzo = `http://127.0.0.1:${porta}${BASE}stampa/`;
  log(`servo il sito su ${indirizzo}`);

  const browser = await avviaBrowser();
  let uscita = 0;

  try {
    const pagina = await browser.newPage();
    const errori = [];
    pagina.on('pageerror', (e) => errori.push(e.message));

    await pagina.goto(indirizzo, { waitUntil: 'networkidle', timeout: 120_000 });

    log('impaginazione con Paged.js…');
    await pagina.waitForFunction(
      () => document.documentElement.dataset.paginato !== undefined,
      null,
      { timeout: 180_000 },
    );

    if (await pagina.evaluate(() => document.documentElement.dataset.paginato === 'errore')) {
      throw new Error(`Paged.js ha fallito l'impaginazione: ${errori.join(' | ')}`);
    }

    // I font devono essere pronti prima della stampa, o il testo si rimpagina nel PDF.
    await pagina.evaluate(() => document.fonts.ready);

    const pagine = await pagina.evaluate(
      () => document.querySelectorAll('.pagedjs_page').length,
    );
    if (pagine === 0) throw new Error('Paged.js non ha prodotto nessuna pagina');

    mkdirSync(resolve(fileUscita, '..'), { recursive: true });
    await pagina.pdf({
      path: fileUscita,
      preferCSSPageSize: true,
      printBackground: true,
      // Segnalibri PDF ricavati dai titoli: rendono navigabile la versione digitale.
      outline: true,
      tagged: true,
    });

    // Il dist/ appena costruito non contiene ancora il PDF (è nato dopo la build):
    // ce lo si mette a mano, così il sito pubblicato ha subito il link funzionante.
    try {
      const copiaDist = join(DIST, 'pdf', 'ricettario-marano.pdf');
      mkdirSync(resolve(copiaDist, '..'), { recursive: true });
      copyFileSync(fileUscita, copiaDist);
    } catch (errore) {
      // Capita quando il PDF è aperto in un lettore: il file buono è già stato scritto.
      log(`copia in dist/ non riuscita (${errore.code ?? errore.message}), non è un problema.`);
    }

    const dimensione = statSync(fileUscita).size;
    log(`fatto: ${fileUscita}`);
    log(`${pagine} pagine · ${(dimensione / 1024 / 1024).toFixed(2)} MB`);

    if (errori.length > 0) {
      log(`attenzione, errori JavaScript nella pagina: ${errori.join(' | ')}`);
    }
  } catch (errore) {
    console.error('[pdf] generazione fallita:', errore.message);
    uscita = 1;
  } finally {
    await browser.close();
    server.close();
  }

  process.exit(uscita);
}

main();
