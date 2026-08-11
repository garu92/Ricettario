# Ricettario

Il ricettario della famiglia Marano: un sito da consultare e un libro PDF da stampare,
generati dagli stessi file.

- **Sito**: https://garu92.github.io/Ricettario/
- **Libro in PDF**: [`public/pdf/ricettario-marano.pdf`](public/pdf/ricettario-marano.pdf) —
  aggiornato ad ogni push, e allegato ad ogni [release](../../releases).

Ogni ricetta è un file Markdown: si aggiunge una ricetta scrivendo un file, e al push
il ricettario si versiona, si ristampa e si ripubblica da solo.

## Come si aggiunge una ricetta

Crea `src/content/ricette/<nome-ricetta>.md`:

```markdown
---
titolo: Ragù della domenica
sezione: primi                # antipasti primi secondi contorni lievitati dolci conserve bevande
autore: nonna-rosa            # un file in src/content/autori/
descrizione: Il sugo che cuoce dalle sette del mattino.
porzioni: 8
tempoPreparazione: 30         # sempre in minuti
tempoCottura: 240
tempoRiposo: 0
difficolta: media             # facile | media | difficile
accessori: [Pentola di coccio, Cucchiaio di legno]
ingredienti:
  - { nome: Cipolla ramata, quantita: 2, unita: pz, note: tritata fine }
  - { nome: Sale grosso, unita: q.b. }
passaggi:
  - titolo: Il soffritto
    testo: Fai appassire la cipolla a fuoco bassissimo.
    durata: 25
conservazione: In frigo 4 giorni, si congela bene.
note: Il giorno dopo è più buono.
tag: [domenica, carne]
dataInserimento: 2026-08-10
---

Testo libero in Markdown per note, varianti e ricordi.
```

Poi `npm run build`: se manca qualcosa la build fallisce e ti dice cosa.

Due dettagli che fanno risparmiare tempo:

- se un valore contiene `: ` (due punti e spazio) va scritto come blocco, altrimenti YAML
  non lo legge:
  ```yaml
  note: >-
    Il segreto è uno: la provola si unisce a fuoco spento.
  ```
- gli ingredienti possono essere raggruppati quando la ricetta ha più preparazioni:
  ```yaml
  ingredienti:
    - gruppo: Per la frolla
      voci:
        - { nome: Farina 00, quantita: 500, unita: g }
    - gruppo: Per la farcia
      voci:
        - { nome: Ricotta, quantita: 700, unita: g }
  ```

Gli autori stanno in `src/content/autori/<id>.md` e le sezioni in `src/data/sezioni.ts`.

## Le foto dei passaggi

Ogni passaggio può avere la sua foto. I file vanno in `public/foto/<slug-della-ricetta>/` e nel
frontmatter si scrive il percorso pubblico:

```yaml
passaggi:
  - titolo: Il guanciale
    testo: Rosolalo finché prende il color rame.
    foto: /foto/pasta-alla-carbonara/passo-3.jpg
    didascalia: Il colore da raggiungere, rame e non più scuro.
```

Il campo si scrive anche prima di avere la foto: finché il file non c'è, sul sito e nel libro
compare un riquadro tratteggiato con il percorso da riempire. Quando metti il file nella
cartella con quel nome, la foto appare da sola al build successivo — la ricetta non va toccata.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | sito in locale su http://localhost:4321 |
| `npm run build` | costruisce il sito e **valida tutte le ricette** |
| `npm run pdf` | build + PDF del libro in `public/pdf/` |
| `npm run pdf:solo` | solo PDF, dal `dist/` già costruito |
| `npm run versione` | mostra la prossima versione e l'anteprima del changelog |
| `npm run rilascio` | edizione completa in locale: versione, build, PDF, changelog |
| `npm run rimuovi-esempi` | elenca le ricette di prova (`--conferma` per cancellarle) |

Per il PDF serve un browser Chromium: `npx playwright install chromium`, oppure basta
avere Edge o Chrome installati (lo script li usa come alternativa).

## Le ricette di prova

Il ricettario parte con nove ricette d'esempio, marcate `esempio: true`, che servono solo a
far vedere come si comporta il libro con contenuti veri. Quando non servono più:

```bash
npm run rimuovi-esempi              # mostra cosa verrebbe cancellato
npm run rimuovi-esempi:conferma     # cancella
```

Vengono rimossi anche gli autori d'esempio, ma solo quelli che non firmano più nessuna
ricetta vera.

## Versionamento e pubblicazione

Ad ogni push su `main`, `.github/workflows/rilascio.yml`:

1. calcola la nuova versione dai messaggi di commit — `feat:` → minor, `fix:` e il resto →
   patch, `BREAKING CHANGE` → major;
2. aggiorna `package.json`, `src/data/versione.json` e `CHANGELOG.md`, dove finisce l'elenco
   delle **ricette aggiunte e modificate** in quell'edizione;
3. ricostruisce il sito e rigenera il PDF completo;
4. committa il tutto come `chore(release): vX.Y.Z`, crea il tag e pubblica una release con il
   PDF versionato allegato;
5. pubblica il sito su GitHub Pages.

La versione compare sul frontespizio del libro e in fondo al sito, così una copia stampata
si riconosce sempre.

> Prima del primo push va abilitato GitHub Pages sul repository:
> *Settings → Pages → Source: GitHub Actions*.

## Com'è fatto

Astro 5 (sito statico) + content collections con schema Zod. Il libro è una sola pagina,
`src/pages/stampa.astro`, che [Paged.js](https://pagedjs.org) impagina in A5 dentro Chromium —
indice con numeri di pagina reali, testatine correnti, occhielli di sezione — e che Chromium
stampa in PDF (`scripts/genera-pdf.mjs`).

```
src/
  content.config.ts        schema delle ricette e degli autori
  content/ricette/*.md     una ricetta = un file
  content/autori/*.md      chi le ha scritte
  data/sezioni.ts          le sezioni del ricettario
  data/versione.json       edizione corrente (la scrive la CI)
  pages/stampa.astro       il libro intero, sorgente del PDF
  styles/libro.css         l'impaginazione della carta
scripts/
  genera-pdf.mjs           Paged.js + Chromium → PDF
  calcola-versione.mjs     versione e changelog dai commit
  rimuovi-esempi.mjs       ripulisce le ricette di prova
```

Chi lavora al ricettario con Claude Code ha due skill pronte in `.claude/skills/`:
`nuova-ricetta` per scrivere una ricetta con il frontmatter giusto, `rilascio-ricettario`
per preparare e controllare un'edizione.
