---
name: rilascio-ricettario
description: Prepara e verifica in locale una nuova edizione del ricettario Marano — calcolo della versione, build, PDF stampabile e changelog — riproducendo la stessa catena che la CI esegue ad ogni push su main. Da usare quando si chiede di "rilasciare", "fare una nuova edizione", "rigenerare il PDF" o di controllare il libro prima di pubblicarlo.
---

# Rilasciare una nuova edizione del ricettario

Ad ogni push su `main` la CI (`.github/workflows/rilascio.yml`) fa da sola: alza la versione,
rigenera il PDF, aggiorna il CHANGELOG, crea tag e release e pubblica il sito. Questa skill serve
per **fare la stessa cosa in locale**, di solito per guardare il libro prima che lo veda qualcun
altro, oppure per forzare una versione.

## Come si decide la versione

`scripts/calcola-versione.mjs` legge i commit fatti dall'ultimo tag `v*`:

| Commit | Salto |
|---|---|
| `feat: ...` | **minor** — 1.2.3 → 1.3.0 |
| `feat!: ...` o `BREAKING CHANGE` nel corpo | **major** — 1.2.3 → 2.0.0 |
| tutto il resto (`fix:`, `docs:`, testo libero) | **patch** — 1.2.3 → 1.2.4 |

Per il ricettario la convenzione utile è: `feat:` quando entrano ricette nuove, `fix:` quando si
corregge una dose o un passaggio.

## Anteprima, senza toccare niente

```bash
npm run versione
```

Stampa versione attuale, prossima versione, quante ricette sono cambiate e l'anteprima della
sezione di CHANGELOG. Non scrive nulla.

## Edizione completa in locale

```bash
npm run rilascio
```

Equivale a: `calcola-versione --applica` → `astro build` → `genera-pdf`. Aggiorna
`package.json`, `src/data/versione.json`, `CHANGELOG.md` e `public/pdf/ricettario-marano.pdf`.

Per forzare un numero:

```bash
node scripts/calcola-versione.mjs --imposta 2.0.0 --applica && npm run pdf
```

## Solo il PDF

```bash
npm run pdf        # build + PDF
npm run pdf:solo   # PDF dal dist/ già presente, più veloce
```

## Cosa controllare nel PDF prima di pubblicare

Apri `public/pdf/ricettario-marano.pdf` e guarda:

1. **Frontespizio** — versione, data e numero di ricette corretti.
2. **Indice** — i numeri di pagina devono corrispondere davvero alle pagine delle ricette.
   Se sono tutti `0` o mancanti, Paged.js non ha completato l'impaginazione: controlla gli
   errori JavaScript segnalati da `npm run pdf`.
3. **Occhielli di sezione** — una pagina intera per sezione, senza numero e senza testatina.
4. **Ricette** — ognuna inizia a pagina nuova; nessun blocco di ingredienti o passaggio spezzato
   male fra due pagine.
5. **Testatine** — sezione a sinistra, titolo della ricetta a destra.
6. **Indice alfabetico** in fondo, completo.

## Se qualcosa non torna

- **PDF con pagine bianche di troppo**: di solito è un `height: 176mm` da rivedere in
  `src/styles/libro.css` dopo aver cambiato i margini di `@page`.
- **Numeri di pagina dell'indice sbagliati**: le voci d'indice devono essere `<a class="riga-indice"
  href="#ric-...">`; il numero nasce da `target-counter(attr(href), page)`, quindi l'attributo
  `href` deve stare sull'elemento a cui si applica la regola.
- **Chromium mancante**: `npx playwright install chromium`.

## Cosa NON fare a mano

Non modificare `src/data/versione.json` né creare tag `v*` a mano su `main`: li scrive la CI, e
due fonti di verità sulla versione si disallineano al primo push.
