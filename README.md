# Messed Up Dress Up: every picture, run by run

An archive of the pictures in [Messed Up Dress Up](https://matthewhammer.org/kids-choice-games/dress-up/), the dress-up game Matthew Hammer makes with his kids, M and N ([its source](https://github.com/matthewhammer/kids-choice-games)). Each run of the archive draws, from the game as it is that day:

- every background at its default settings, with the friend hidden (`backgrounds/`) and with the default friend (`backgrounds-with-friend/`), and each of those again with 🔬 🧩 what it is made of (`…-made-of/`) and with 🔬 🧱 the collision boxes (`…-collision-boxes/`);
- every option of every chip menu, each against the defaults (one folder per tab: `costume/`, `hair/`, `shirt/`, …). Colors and sliders are left at their defaults. A menu that repeats for each castle, room, cat or horse is taken once;
- the friend climbing each place's ladder (`moves/`).

## One folder, every run in git

Every run writes the same folder, **`pictures/`**, replaced whole. The runs before it are in git's history, each one **a tag**, `run-YYYY-MM-DD` (a later run that day: `run-YYYY-MM-DD-HH-MM`, in Mountain time). Git stores a file once however many runs share it, and a file that changes a little (an SVG or a settings file) as a small difference from the last, so a run costs only what it changed. Five runs took 24 MiB here; the same five took 1.1 GB as a folder per day with PNGs.

In `pictures/`, each drawing is:

- `<folder>/<setting>--<value>.svg`: the drawing, animations and all;
- `<folder>/<setting>--<value>.json`: its settings, in the game's own save format. The game's 📂 Load opens it, and the game at the run's version (`pictures/source.json`) draws the same SVG again from it;
- `thumbs/<folder>/<setting>--<value>.webp`: 480 wide, for the picture viewer.

**No PNG is kept.** A PNG is drawn from the SVG when someone asks for one: the png link on a run's page draws it, still, 1920 wide, in their own browser (with their browser's fonts).

Also in `pictures/`: `manifest.json` (every option and what it drew), `source.json` (the game version and commit, and when and where the run was made) and `index.html` (the run's page). At the top, `runs.json` lists every run, newest first, with its tag; `index.html` is the same list.

## Looking back

- **The newest run** is on the site: **https://matthewhammer.org/dress-up-pictures/**.
- **Any run**, in the [picture viewer](https://matthewhammer.org/hazel/dress-up/pictures.html): it reads an earlier run from its tag.
- **A run's files** on GitHub: the tag's tree (`/tree/run-…/pictures`), or the whole run as a zip (`/archive/refs/tags/run-….zip`).
- **One picture's history**: GitHub's history of its file.

The archive before this one kept a folder per day, PNGs and all, and outgrew GitHub Pages' 1 GB. It is kept as it was, read-only: [dress-up-pictures-2026-10-18](https://github.com/matthewhammer/dress-up-pictures-2026-10-18) (its pages: https://matthewhammer.org/dress-up-pictures-2026-10-18/). Its five runs are this archive's first five tags, replayed from its commits by `tools/replay_dated_runs.mjs`. An old link into a day's folder here is sent there.

The music has its own archive, made the same way: [dress-up-music](https://github.com/matthewhammer/dress-up-music).

## Making a run

On GitHub's computers, not the laptop (it crashes under load): the "Dress Up archive" workflow in [kids-choice-games](https://github.com/matthewhammer/kids-choice-games) runs `tools/archive.mjs` in headless Chrome on the game at `main` and uploads the run as an artifact. Then, here:

```
gh run download <run id> -R matthewhammer/kids-choice-games -n pictures -D <an empty folder>
tools/add_run.sh <that folder>
```

`add_run.sh` checks the run, puts it in `pictures/`, lists it (`runs_index.mjs`), commits, tags and pushes. It also records what the run added to git, the thin pack a push of it sends (its files as differences from the run before), in the run's entry in `runs.json` (`added_bytes`); the front page shows each run's and the total. When the workflow has a token that can write here (the Actions secret `ARCHIVE_TOKEN` in kids-choice-games), it runs `add_run.sh` itself, on GitHub, and the run lands with no step on the laptop. The tools: `archive.mjs` (the pictures), `run_page.mjs` (a run's page), `runs_index.mjs` (the list of runs) and `runs.mjs` (what they share), `add_run.sh`, and `site.json` (this archive's title and links).
