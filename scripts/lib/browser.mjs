import { chromium } from 'playwright';

/**
 * Avvia un browser Chromium per la generazione di PDF e immagini.
 *
 * Chromium scaricato da Playwright è la scelta giusta — è quello che gira in CI — ma su una
 * macchina dove non è stato scaricato si ripiega su Edge o Chrome di sistema: stampano e
 * disegnano allo stesso modo, e così gli script funzionano anche senza `playwright install`.
 */
export async function avviaBrowser(log = () => {}) {
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
