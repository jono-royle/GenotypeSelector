# Genotype Selector

A mobile-friendly 96-well plate (A1–H12) for marking genotypes.

- **Tap** a well to cycle its colour: blank → green → blue → red → blank
- **Long-press** a well to add or edit a note (a yellow dot marks wells that have one)
- Key: green = homozygous, blue = heterozygous, red = wildtype
- Your colours and notes are saved in the browser's local storage
- **Export to CSV** downloads an 8×12 grid (0 = blank, 1 = green, 2 = blue, 3 = red) followed by the gene, plate and a list of notes by well
- **Export as image** saves a JPG of the page as it looks on screen, with the same file name as the CSV

## Run locally

```sh
npm install
npm run dev
```

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Every push to `main` builds the site and publishes it to `https://jono-royle.github.io/GenotypeSelector/`.
