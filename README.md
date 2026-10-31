# blymrsn.github.io

My personal site, should be live at https://blymrsn.github.io

## Where things live

- `index.html`: all the page text (Home, Research, Publications, Talks). Each page is a `<section>` marked with a comment such as `<!-- TALKS -->`.
- `css/style.css`: colours, fonts and layout. Colours are set once at the top as variables (`--accent`, `--paper` …).
- `js/site.js`: page switching, the simulated transcription animation, the smFISH comparison slider, the pipeline-figure zoom and the cell movie.
- `images/`: photos and figures.
- `media/`: movies.

## when making edits

- **Change text:** edit `index.html`, find the sentence, change it, commit.
- **Swap an image:** upload a new file with the *same name* into `images/` and it replaces the old one. A new name means updating the `src="images/…"` in `index.html` too.
- **Add a talk or paper:** copy an existing `<li>…</li>` block in the Talks or Publications section and edit it.
- **Remove an "Upcoming" tag:** delete `<span class="flag">Upcoming</span>`.

Keeping images under ~500 KB and movies under ~5 MB so the site stays relatively quick..
