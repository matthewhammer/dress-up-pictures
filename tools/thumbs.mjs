// A day's thumbnails: each picture in its manifest at 480 wide, as WebP
// (it keeps a picture's see-through parts), in the day's thumbs/ under the
// picture's own path: backgrounds/forest.png -> thumbs/backgrounds/forest.webp.
// The picture viewer at matthewhammer.org/hazel/dress-up/pictures.html shows
// these, and the full PNG when one is opened. One ffmpeg at a time (this
// laptop crashes under load); a thumbnail already there is kept.
//   node thumbs.mjs <day dir>
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
const [day] = process.argv.slice(2);
const pngs = [...new Set(JSON.parse(readFileSync(join(day, "manifest.json"), "utf8")).map(e => e.png).filter(Boolean))];
let made = 0;
for (const png of pngs) {
  const out = join(day, "thumbs", png.replace(/\.png$/, ".webp"));
  if (existsSync(out) || !existsSync(join(day, png))) continue;
  mkdirSync(dirname(out), { recursive: true });
  const r = spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-i", join(day, png), "-vf", "scale=480:-1", "-c:v", "libwebp", "-quality", "72", out]);
  if (r.status !== 0) { console.error("thumbs: failed on", png, String(r.stderr).slice(0, 300)); process.exit(1); }
  made++;
}
console.log(made, "thumbnails made,", pngs.length, "pictures in", day);
