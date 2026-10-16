# Messed Up Dress Up: every picture, by day

An archive of the pictures in [Messed Up Dress Up](http://matthewhammer.org/kids-choice-games/dress-up/), the dress-up game Matthew Hammer makes with his kids, M and N ([its source](https://github.com/matthewhammer/kids-choice-games)). One folder per day, `YYYY/MM/DD/`, holds:

- every background at its default settings, with the friend hidden (`backgrounds/`) and with the default friend (`backgrounds-with-friend/`);
- every option of every chip menu, each against the defaults (one folder per tab: `costume/`, `hair/`, `shirt/`, …). Colors and sliders are left at their defaults. A menu that repeats for each castle, room, cat or horse is taken once;
- each drawing as three files: a 1920-wide PNG, the SVG (animations and all), and its settings as JSON in the game's own save format (the game's 📂 Load opens it);
- `thumbs/`: each picture at 480 wide, as WebP, for the [picture viewer](http://matthewhammer.org/hazel/dress-up/pictures.html);
- `manifest.json` (every option and what it drew), `source.json` (the game version and commit it was drawn from), and `index.html` to browse them.

**A file unchanged since an earlier day is a relative symlink to that day's file**, so a day costs only what changed. The day's page links straight to the real file.

Browse it at **http://matthewhammer.org/dress-up-pictures/** (every file, by day), or in the [picture viewer](http://matthewhammer.org/hazel/dress-up/pictures.html). `days.json` lists the days, newest first, for the viewer. The music has its own archive, made the same way: [dress-up-music](https://github.com/matthewhammer/dress-up-music).

This repository exists only to keep every past version of the game's pictures, for looking back. It is expected to reach GitHub's storage limits before the game does; if it does, it can move to other storage. The tools that make it (`archive.mjs`, `thumbs.mjs`, `days_index.mjs`, `archive-today.sh`) are in `tools/`.
