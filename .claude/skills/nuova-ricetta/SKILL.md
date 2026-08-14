---
name: nuova-ricetta
description: Aggiunge una ricetta al ricettario Marano creando il file Markdown con il frontmatter corretto. Da usare quando l'utente detta o descrive una ricetta, chiede di "aggiungere una ricetta", o incolla una ricetta presa altrove da inserire nel ricettario.
---

# Aggiungere una ricetta al ricettario

Una ricetta è un file `src/content/ricette/<slug>.md`. Lo schema è definito in
`src/content.config.ts` e validato in fase di build: se un campo obbligatorio manca, `npm run build`
fallisce. Meglio scoprirlo scrivendo bene il file che dopo.

## Procedura

1. **Scegli lo slug**: minuscolo, senza accenti, parole separate da trattini
   (`ragu-della-domenica`, `pizza-in-teglia`). È l'URL della ricetta, non cambiarlo dopo.
2. **Verifica l'autore**: deve esistere un file in `src/content/autori/<id>.md`. Se non c'è,
   crealo prima (vedi sotto) — altrimenti la build fallisce sul riferimento.
3. **Scegli la sezione** fra quelle di `src/data/sezioni.ts`: `antipasti`, `primi`, `secondi`,
   `contorni`, `lievitati`, `dolci`, `conserve`, `bevande`.
4. **Scrivi il file** seguendo il modello qui sotto.
5. **Controlla** con `npm run build`.

## Modello

```markdown
---
titolo: Nome della ricetta
sezione: primi
autore: nonna-rosa            # id del file in src/content/autori/
descrizione: Una o due righe che raccontano il piatto.
porzioni: 4
unitaPorzioni: persone        # oppure: biscotti, vasetti, litri…
tempoPreparazione: 20         # minuti
tempoCottura: 45              # minuti (0 se non si cuoce)
tempoRiposo: 0                # lievitazione, marinatura, riposo in frigo
difficolta: media             # facile | media | difficile
stagione: [autunno, inverno]  # opzionale
accessori:
  - Casseruola dal fondo spesso
ingredienti:
  - { nome: Farina, quantita: 500, unita: g, note: setacciata }
  - { nome: Sale, unita: q.b. }
passaggi:
  - titolo: Impasto           # opzionale
    testo: Cosa fare, all'imperativo, con il perché quando serve.
    durata: 15                # opzionale, minuti
    foto: /foto/<slug>/passo-1.jpg   # opzionale
    didascalia: Cosa si deve guardare nella foto.  # opzionale
conservazione: In frigo 3 giorni.     # opzionale
note: Varianti e ricordi di famiglia. # opzionale
fonte: Da dove arriva, se non è di casa.  # opzionale
tag: [domenica, carne]
dataInserimento: 2026-08-10
---

Testo libero in Markdown: note lunghe, varianti, aneddoti. Finisce sia sul sito
sia nel libro stampato.
```

## Ingredienti a gruppi

Quando la ricetta ha più preparazioni, raggruppa. Le due forme sono entrambe valide,
lo schema le normalizza:

```yaml
ingredienti:
  - gruppo: Per la frolla
    voci:
      - { nome: Farina 00, quantita: 500, unita: g }
  - gruppo: Per la farcia
    voci:
      - { nome: Ricotta, quantita: 700, unita: g, note: scolata una notte }
```

## Aggiungere un contributo a una ricetta esistente

Quando qualcuno migliora una ricetta già scritta, **non si riscrive il passaggio**: si aggiunge
un contributo firmato, così resta memoria di chi ha proposto cosa e quando.

```yaml
contributi:
  - autore: gianna-protti
    data: 2026-09-03
    testo: Con la pasta di Gragnano la crema regge meglio.
```

L'autore deve avere la sua scheda in `src/content/autori/`. La revisione della ricetta non va
toccata: la calcola git dalla storia del file.

## Le foto dei passaggi

I file stanno in `public/foto/<slug-della-ricetta>/`, e nel frontmatter si scrive il percorso
pubblico: `foto: /foto/pasta-alla-carbonara/passo-1.jpg`.

Il campo si può scrivere **prima** di avere la foto: finché il file non esiste, al suo posto
compare un riquadro tratteggiato con il percorso da riempire — sul sito e anche nel libro. Non
serve quindi tornare a modificare la ricetta quando si scattano le foto: basta mettere i file
nella cartella con i nomi giusti.

Per riempire i buchi nel frattempo, `npm run segnaposto` genera un'immagine per ogni foto
dichiarata e non ancora presente, con impressa la scritta «Foto non ufficiale». Non tocca mai
le foto vere già in cartella.

## Regole che evitano errori

- **YAML e due punti**: se un valore contiene `: ` (due punti + spazio), usa il block scalar,
  altrimenti il file non si legge:
  ```yaml
  note: >-
    Il segreto è uno: la provola si unisce a fuoco spento.
  ```
- **Tempi sempre in minuti**, anche quelli lunghi: un giorno è `1440`, un mese è `43200`.
  Il sito li riscrive da solo in ore e giorni.
- **Quantità numeriche**, senza unità dentro: `quantita: 500, unita: g`. Per gli ingredienti a
  piacere ometti `quantita` e scrivi `unita: q.b.`.
- **Unità coerenti** con il resto del ricettario: `g`, `kg`, `ml`, `l`, `pz`, `spicchio`,
  `cucchiaio`, `cucchiaino`, `foglia`, `fetta`, `mazzetto`, `pizzico`, `q.b.`. Il plurale lo
  gestisce `src/lib/formato.ts`.
- **Niente `esempio: true`** sulle ricette vere: quel campo marca solo le ricette di prova,
  che `npm run rimuovi-esempi` cancella.
- **Passaggi utili**: uno per azione, all'imperativo. Se un passaggio ha una durata propria
  (riposi, cotture) mettila in `durata`, così finisce anche nel libro.

## Creare un autore

`src/content/autori/<id>.md`:

```markdown
---
nome: Zia Carmela
relazione: Zia               # opzionale
nota: Due righe di ritratto. # opzionale
ordine: 4                    # ordine nella pagina autori
---

Testo libero, opzionale.
```

## Alla fine

```bash
npm run build     # valida lo schema
npm run dev       # per guardarla nel sito
npm run pdf       # per vederla impaginata nel libro
```

Il PDF e la versione si aggiornano da soli al push su `main`: non serve toccarli a mano.
