# Ricettario Marano — note per Claude Code

Sito Astro 5 statico + libro PDF stampabile, generati dagli stessi contenuti. Tutto in
italiano: nomi di file, variabili, commenti e testi dell'interfaccia.

## Regole del progetto

- **Le ricette sono dati, non pagine.** Vivono in `src/content/ricette/*.md` e passano dallo
  schema Zod in `src/content.config.ts`. Prima di aggiungere un campo a una ricetta, aggiungilo
  allo schema: la build valida tutto, ed è quello che tiene in piedi il PDF.
- **Un contenuto, due uscite.** Il sito (`src/pages/`) e il libro (`src/pages/stampa.astro`)
  leggono le stesse collection tramite `src/lib/ricettario.ts`. Non duplicare testi fra i due.
- **Le formattazioni stanno in `src/lib/formato.ts`.** Tempi, dosi, porzioni e date si scrivono
  in un solo posto, così carta e schermo dicono la stessa cosa.
- **I link interni passano da `src/lib/percorsi.ts`.** Il sito vive alla radice in locale e
  sotto `/Ricettario/` su GitHub Pages: un link scritto a mano funziona solo in uno dei due casi.
- **Non toccare a mano `src/data/versione.json` né i tag `v*`:** li scrive
  `scripts/calcola-versione.mjs` dalla CI.
- **La versione di una ricetta non si scrive a mano: si legge da git.** `src/lib/storia.ts`
  esegue `git log --follow` sul file della ricetta in fase di build e ne ricava revisione,
  date e contributori (compresi i `Co-authored-by:`). Non aggiungere un campo `versione` al
  frontmatter: sarebbe una seconda verità che si disallinea al primo commit dimenticato.
  Da non confondere con `contributi`, che sono invece note firmate scritte a mano e fanno
  parte del contenuto stampato.
- **Le foto stanno in `public/foto/<slug>/`** e si citano nel frontmatter del passaggio
  (`foto: /foto/<slug>/passo-1.jpg`). `src/lib/foto.ts` controlla a build time se il file
  esiste: se manca, si mostra un riquadro tratteggiato invece di un'immagine rotta, così una
  ricetta si può scrivere prima e fotografare dopo.

## Il PDF

`src/styles/libro.css` è CSS per la carta: `@page`, riquadri di margine, `break-inside`,
`string-set` per le testatine correnti e `target-counter(attr(href), page)` per i numeri di
pagina dell'indice. Due trappole già incontrate:

- `text-align-last` vale anche per le righe che finiscono con `<br>`: i blocchi centrati
  (copertina, occhielli, colophon) hanno bisogno di `text-align-last: center` esplicito.
- il numero di pagina nell'indice nasce da `attr(href)`, quindi la regola CSS deve applicarsi
  **all'elemento che ha l'href** (`a.riga-indice::after`), non a uno span figlio.
- **le foto nel libro sono `background-image`, non `<img>`** (`FotoPassaggioLibro.astro`):
  Paged.js impagina clonando i nodi e misura un `<img>` clonato prima che si scarichi, con
  un'altezza che cambia sotto i piedi e un'impaginazione che non termina mai. Per lo stesso
  motivo `impagina()` in `stampa.astro` parte solo dopo l'evento `load`.

Per controllare il risultato: `npm run pdf`, poi apri `public/pdf/ricettario-marano.pdf`.
La stessa impaginazione si vede nel browser su `/stampa/`, pagina per pagina.

## L'editor dentro la pagina

`src/components/EditorRicetta.astro` permette di correggere una ricetta dal sito: testo dei
passaggi, ordine, aggiunta e rimozione, più note firmate. Il sito è statico e non ha un server:
scrive direttamente su GitHub con le API Contents, dal browser, usando un token che sta in
`localStorage` (si incolla su `/modifica/`). Senza token il riquadro resta `hidden` e per
chiunque altro la pagina non cambia di una virgola.

- **La riscrittura del file non sta nel componente, sta in `src/lib/modifica-ricetta.ts`**, che
  è puro e senza dipendenze. È il pezzo che può corrompere una ricetta, quindi ha le sue prove:
  `npm run prova` (`scripts/prova-modifiche.mjs`). Se tocchi il motore, le prove vanno prima.
- **La convenzione di fine riga del file va conservata.** `separaFrontmatter` restituisce anche
  `fineRiga` e `ricomponiFile` la vuole indietro: su Windows git consegna i file con CRLF, e
  riscriverli con l'altra convenzione trasformerebbe una nota di due righe in un diff che tocca
  tutta la ricetta.
- **Le note firmate diventano `contributi`**, non testo dei passaggi: una nota su un passaggio
  porta `passaggio: <numero>` e si legge sotto quel passaggio, sul sito e nel libro; senza quel
  campo è una nota sulla ricetta intera e finisce in fondo. Se il passaggio viene tolto, la sua
  nota non si perde: diventa generale.
- **Il token non entra mai nel repository.** Sta nel browser, e i permessi richiesti sono
  `Contents: Read and write` più `Metadata: Read-only`, sul solo repository del ricettario.

## Comandi utili

```bash
npm run dev              # sito in locale
npm run build            # build + validazione delle ricette
npm run pdf              # build + PDF del libro
npm run versione         # anteprima della prossima edizione
npm run rimuovi-esempi   # elenca le ricette di prova
npm run prova            # prove sul motore delle modifiche
```

## Skill disponibili

- `nuova-ricetta` — crea una ricetta con il frontmatter corretto.
- `rilascio-ricettario` — prepara e verifica un'edizione in locale.
