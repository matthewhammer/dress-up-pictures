// Used once, on 2026-10-18, to begin this archive: one run of the archive
// before it (matthewhammer/dress-up-pictures-2026-10-18, a folder per day,
// YYYY/MM/DD[/HH-MM], each with PNGs, and unchanged files as symlinks to an
// earlier day's) read from one of its commits and written as this archive
// keeps a run: the pictures/ folder, whole, with each drawing's SVG, its
// settings and its thumbnail, and no PNG. The settings leave out the save
// format's "saved" time (Load ignores it), as archive.mjs does now, so an
// unchanged drawing keeps the same file. The manifest's paths name the SVG
// where they named the PNG. The run's page is run_page.mjs's.
//   node replay_dated_runs.mjs <old archive repo> <commit> <run's folder there> <run> <this archive>
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { join, posix } from "node:path";
import { runPage } from "./run_page.mjs";
const [old, commit, dir, run, root] = process.argv.slice(2);
if (!root) { console.log("usage: node replay_dated_runs.mjs <old archive repo> <commit> <run's folder there> <run> <this archive>"); process.exit(1); }
const git = (args, input) => { const r = spawnSync("git", ["-C", old, ...args], { input, maxBuffer: 2 ** 31 });
  if (r.status !== 0) { console.error("git", args.join(" "), "failed:", String(r.stderr)); process.exit(1); } return r.stdout; };
// (the commit's whole tree: a symlink can point into another day's folder)
const tree = new Map();
for (const line of git(["ls-tree", "-r", "-z", "--full-tree", commit]).toString("utf8").split("\0").filter(Boolean)) {
  const [meta, path] = line.split("\t"), [mode, , sha] = meta.split(" ");
  tree.set(path, { mode, sha });
}
// (many blobs at once: git cat-file --batch, its output cut at each header)
const blobs = shas => { const want = [...new Set(shas)], out = new Map(), buf = git(["cat-file", "--batch"], want.join("\n") + "\n");
  let at = 0;
  while (at < buf.length) { const nl = buf.indexOf(10, at), [sha, type, size] = buf.subarray(at, nl).toString().split(" ");
    if (type !== "blob") { console.error("not a blob:", sha, type); process.exit(1); }
    out.set(sha, buf.subarray(nl + 1, nl + 1 + +size)); at = nl + 1 + +size + 1; }
  return out; };
// (a path, its symlinks followed, as the old archive's pages did: to the real file)
const resolve = path => { for (let i = 0; i < 10; i++) { const e = tree.get(path); if (!e) return null; if (e.mode !== "120000") return { path, sha: e.sha };
    path = posix.normalize(posix.join(posix.dirname(path), blobs([e.sha]).get(e.sha).toString())); } return null; };
const read = rel => { const r = resolve(posix.join(dir, rel)); return r ? r.sha : null; };
const first = blobs([read("manifest.json"), read("source.json")]);
const oldManifest = JSON.parse(first.get(read("manifest.json")).toString()), source = JSON.parse(first.get(read("source.json")).toString());
const svgOf = p => p && p.replace(/\.png$/, ".svg"), jsonOf = p => p && p.replace(/\.png$/, ".json"), webpOf = p => p && "thumbs/" + p.replace(/\.png$/, ".webp");
// (each distinct drawing's three files, their blobs, read in one go)
const files = new Map();
for (const m of oldManifest) if (m.png && !m.sameDrawingAs) for (const f of [svgOf(m.png), jsonOf(m.png), webpOf(m.png)]) { const sha = read(f); if (sha) files.set(f, sha); }
const data = blobs([...files.values()]);
const outDir = join(root, "pictures.new"), finalDir = join(root, "pictures");
rmSync(outDir, { recursive: true, force: true });
let missing = 0;
for (const [f, sha] of files) {
  let body = data.get(sha);
  if (f.endsWith(".json")) { const j = JSON.parse(body.toString()); delete j.saved; body = JSON.stringify(j, null, 2); }
  mkdirSync(join(outDir, posix.dirname(f)), { recursive: true }); writeFileSync(join(outDir, f), body);
}
const manifest = oldManifest.map(m => {
  if (m.png && !m.sameDrawingAs && !files.has(svgOf(m.png))) missing++;
  return { folder: m.folder, name: m.name, label: m.label, tab: m.tab ?? null, key: m.key ?? null, value: m.value ?? null, hash: m.hash, sameAsDefault: !!m.sameAsDefault, onlyWithOtherSettings: !!m.onlyWithOtherSettings,
    sameAsFile: svgOf(m.sameAsFile) ?? null, svg: svgOf(m.png) ?? null, settings: jsonOf(m.png) ?? null,
    thumb: m.png && files.has(webpOf(m.png)) ? webpOf(m.png) : null, sameDrawingAs: svgOf(m.sameDrawingAs) ?? null };
});
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
writeFileSync(join(outDir, "source.json"), JSON.stringify(source, null, 1) + "\n");
writeFileSync(join(outDir, "index.html"), runPage(manifest, source, run));
if (existsSync(finalDir)) renameSync(finalDir, finalDir + ".old");
renameSync(outDir, finalDir); rmSync(finalDir + ".old", { recursive: true, force: true });
const n = ext => [...files.keys()].filter(f => f.endsWith(ext)).length;
console.log(`${run} (${source.version}, from ${commit}:${dir}): ${n(".svg")} svg, ${n(".json")} json, ${n(".webp")} webp; ${manifest.filter(m => m.svg && !m.thumb).length} without a thumbnail; ${missing} drawings missing`);
