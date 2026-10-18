// The page of one run's pictures (pictures/index.html): every drawing as its
// thumbnail, opening its SVG, with its settings and a PNG made on demand.
// No PNG is kept in the archive (since 2026-10-18, Matthew: "the .png files
// are too big. We cannot archive them anymore"): the page's "png" draws the
// SVG, without its animations, 1920 wide, in the reader's own browser.
// archive.mjs writes this page for a new run; replay_dated_runs.mjs wrote it
// for the runs made before the redesign.
//   import { runPage } from "./run_page.mjs"; runPage(manifest, source, run)
import { when, tagOf } from "./runs.mjs";
const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const nameOf = file => file.replace(/\.svg$/, "");
// (the PNG of a drawing, from its SVG: what the archive kept as a file until 2026-10-18)
export const PNG_SCRIPT = `async function png(a) {
  const old = a.textContent; a.textContent = "making the png…";
  try {
    const s = new DOMParser().parseFromString(await (await fetch(a.dataset.svg)).text(), "image/svg+xml").documentElement;
    for (const x of s.querySelectorAll("animate,animateTransform,animateMotion,set")) x.remove();
    const vb = s.viewBox && s.viewBox.baseVal && s.viewBox.baseVal.width ? s.viewBox.baseVal : { width: +s.getAttribute("width"), height: +s.getAttribute("height") };
    const w = 1920, h = Math.round(w * vb.height / vb.width);
    s.setAttribute("width", w); s.setAttribute("height", h);
    const img = new Image(); img.src = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(s)], { type: "image/svg+xml" })); await img.decode();
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h; cv.getContext("2d").drawImage(img, 0, 0);
    const url = URL.createObjectURL(await new Promise(r => cv.toBlob(r, "image/png")));
    a.href = url; a.download = a.dataset.svg.split("/").pop().replace(/\\.svg$/, ".png"); a.onclick = null; a.textContent = old; a.click();
  } catch (e) { a.textContent = "png failed: " + e.message; }
  return false;
}`;
export function runPage(manifest, source, run) {
  const folders = [...new Set(manifest.map(m => m.folder))];
  const tag = tagOf(run), commit = source.commit || "";
  const thumb = m => m.thumb || m.svg;
  const links = m => `<a href="${esc(m.svg)}">svg</a> · <a href="${esc(m.settings)}">settings</a> · <a href="#" data-svg="${esc(m.svg)}" onclick="return png(this)">png</a>`;
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Dress Up pictures, ${esc(run)}</title>
<style>body{font-family:sans-serif;margin:16px;background:#faf8f3;color:#222} h2{margin:28px 0 8px} .g{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start}
figure{margin:0;width:240px} img{width:240px;border:1px solid #ccc;background:#fff} figcaption{font-size:12px} figure.dflt img{border:3px solid #c9a227}
ul.rest{font-size:13px;color:#555;margin:8px 0 0;padding-left:20px} ul.rest li{margin:2px 0} h3{font-size:14px;margin:12px 0 0;color:#555}</style>
<script>${PNG_SCRIPT}</script>
<h1>Messed Up Dress Up: every picture at its defaults</h1>
<p>Run ${esc(run)}, made ${esc(when(source) || "(time not recorded)")}, from Messed Up Dress Up ${esc(source.version || "?")}` +
    (commit ? ` (<a href="https://github.com/matthewhammer/kids-choice-games/commit/${esc(commit)}">${esc(commit.slice(0, 7))}</a>)` : "") + `.
This run is the tag <a href="https://github.com/matthewhammer/dress-up-pictures/tree/${esc(tag)}/pictures"><code>${esc(tag)}</code></a>; <a href="../index.html">every run</a>.</p>
<p>${manifest.filter(m => m.svg && !m.sameDrawingAs).length} distinct drawings, each an SVG (animations and all) and its settings (the game's save format: Load opens it).
The png link draws the SVG, still, 1920 wide, in your browser. Each section opens with its default picture (gold frame).
A menu hidden under the defaults is shown "with" the setting that brings it out. Under each section's pictures: the options that draw nothing different, each with the picture it equals, and the menus that show only once other settings are chosen.</p>` +
    folders.map(f => { const all = manifest.filter(m => m.folder === f), pics = all.filter(m => m.svg && !m.sameDrawingAs), repeats = all.filter(m => m.sameDrawingAs), same = all.filter(m => m.sameAsDefault), hidden = all.filter(m => m.onlyWithOtherSettings);
      return `<h2>${esc(f)}</h2><div class="g">` + pics.map(m =>
        `<figure${m.name === "_default" ? ' class="dflt"' : ""}><a href="${esc(m.svg)}"><img loading="lazy" src="${esc(thumb(m))}"></a><figcaption>${esc(m.label)}<br><code>${esc(m.name)}</code> · ${links(m)}</figcaption></figure>`).join("") + `</div>` +
        (repeats.length ? `<h3>The same drawing as another</h3><ul class="rest">` + repeats.map(m => `<li>${esc(m.label)} <code>${esc(m.name)}</code>: <a href="${esc(m.sameDrawingAs)}">${esc(nameOf(m.sameDrawingAs))}</a></li>`).join("") + `</ul>` : "") +
        (same.length ? `<h3>Draw nothing different here</h3><ul class="rest">` + same.map(m => `<li>${esc(m.label)} <code>${esc(m.name)}</code>: the same as ${m.sameAsFile ? `<a href="${esc(m.sameAsFile)}">${esc(nameOf(m.sameAsFile))}</a>` : "the default"}</li>`).join("") + `</ul>` : "") +
        (hidden.length ? `<h3>Show only once other settings are chosen</h3><ul class="rest">` + hidden.map(m => `<li>${esc(m.label)} <code>${esc(m.name)}</code></li>`).join("") + `</ul>` : ""); }).join("");
}
