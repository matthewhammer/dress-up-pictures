// An archive of Dress Up's pictures, for one run: every background with the
// friend hidden and with the default friend; every option of every chip menu
// (each against the defaults: colors and sliders are left alone; a menu
// repeated for each castle, room, cat or horse taken once, for the first);
// and moves the defaults never show (ticket 183): the friend climbing each
// place's ladder, low, halfway and near the top (the climb set by hand, as
// the controller sets it, so the hands are where that height puts them).
// Each distinct drawing is three files: <folder>/<setting key>--<value>.svg
// (the drawing, animations and all), .json beside it (the settings, in the
// game's own save format: Load opens it) and thumbs/<folder>/<...>.webp (480
// wide, for the picture viewer). A repeat of a drawing points at its first;
// an option that draws nothing different under the defaults is noted. With
// a page (run_page.mjs) and a manifest.
// (Dress Up ticket 262, Matthew: "do the pictures in each scene, with and without 'what its made of' on. And with and
// without collision boxes on. So 3x the pictures in total") Each background, with and without the friend, twice more:
// with 🔬 🧩 what it is made of, and with 🔬 🧱 the collision boxes (folders <folder>-made-of, <folder>-collision-boxes):
// the picture with the game's own overlay drawn over it, its look (colours, lines) as the page's stylesheet gives it.
// (2026-10-18, Matthew: "the .png files are too big. We cannot archive them anymore ... the paths overwrite each
// other, using git hub and git's diffing mechanism to save space") Every run writes the same paths, the archive's
// pictures/ folder, replaced whole; git keeps the runs before, each a tag (run-YYYY-MM-DD[-HH-MM]). No PNG: the page
// draws one from the SVG on demand. The settings leave out the save format's "saved" time (Load ignores it), so a
// drawing whose settings are unchanged keeps the same file, byte for byte, and git stores it once.
//   node archive.mjs <devtools port> <page url> <out dir: <archive>/pictures> <run: YYYY/MM/DD[/HH-MM]> [source.json]
// (source.json: the game's version and commit, and when and where the run was made; copied into the run's folder)
import { writeFileSync, mkdirSync, rmSync, renameSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runPage } from "./run_page.mjs";
const [dport, url, finalDir, run, sourceFile] = process.argv.slice(2), outDir = finalDir + ".new";
if (!run) { console.log("usage: node archive.mjs <devtools port> <page url> <archive>/pictures <run>"); process.exit(1); }
rmSync(outDir, { recursive: true, force: true }); mkdirSync(outDir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const page = (await (await fetch(`http://127.0.0.1:${dport}/json/list`)).json()).find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener("open", r, { once: true }));
let n = 0; const pending = new Map(), errs = [];
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") errs.push(JSON.stringify(m.params.exceptionDetails).slice(0, 300)); });
const send = (method, params = {}) => new Promise(res => { const i = ++n; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "about:blank" }); await sleep(300);
await send("Page.navigate", { url }); await sleep(4000);
// 1. the list of pictures to take, from the page's own menus
let plan = (await send("Runtime.evaluate", { returnByValue: true, expression: `(() => {
  const slug = s => s.replace(/[^A-Za-z0-9]+/g, " ").trim().toLowerCase().replace(/ +/g, "-");
  const txt = (t, b) => typeof t === "function" ? t(b) : t;
  const shots = [];
  for (const [kind, label] of PLACES) {
    if (kind === "none") continue;
    if (kind === "castleroom") { for (const [st, sl] of CASTLE_ROOM_CHOICES) for (const friend of [false, true])
      shots.push({ folder: friend ? "backgrounds-with-friend" : "backgrounds", name: "castleroom--" + st, label: label + ": " + sl, bg: { kind: "castleroom", castle: "N", castleRoomsN: 6, castleRoom6N: st, castleRoom: 6 }, friend }); continue; }
    for (const friend of [false, true]) shots.push({ folder: friend ? "backgrounds-with-friend" : "backgrounds", name: kind, label, bg: { kind }, friend });
  }
  const walk = (rows, part, folder, tabLabel, group) => { for (const row of rows) {
    const [kind, key, label] = row;
    if (kind === "group") { walk(row[3], part, folder, tabLabel, label); continue; }
    if (part === "music" || part === "visible") continue;
    if (typeof key !== "string") continue;   // (a row that is not a menu: a note, a world grid, a set of chips)
    // (a menu repeated per castle, room, cat or horse: only castle N's, the first one's)
    if (/[MD]$/.test(key) && /^castle/.test(key) || (key.match(/[0-9]+/g) || []).some(d => +d >= 2)) continue;
    const opts = kind === "choice" ? row[3].map(o => [o[0], txt(o[1], DEFAULTS[part])]) : kind === "toggle" ? [[true, "on"], [false, "off"]] : kind === "flip" ? [[true, row[2][1]], [false, row[2][0]]] : null;
    if (!opts) continue;
    for (const [v, text] of opts) shots.push({ folder, name: key + "--" + slug(String(v)), label: (group ? group + " / " : "") + (kind === "flip" ? "" : label + ": ") + text, part, key, value: v, kindOf: kind, tab: tabLabel });
  } };
  for (const [tabLabel, part, rows] of TABS) {
    const folder = part === "background" ? "background-menus" : slug(tabLabel) || part;
    // (each tab's folder opens with the friend at the defaults: what its "same as default" means)
    if (part !== "background" && part !== "music" && part !== "visible") shots.push({ folder, name: "_default", label: "everything at its default", defaultOf: part, tab: tabLabel });
    walk(rows, part, folder, tabLabel, null);
  }
  return shots;
})()` })).result;
if (!plan || plan.exceptionDetails || !Array.isArray(plan.result.value)) { console.log("the plan failed:", JSON.stringify(plan && (plan.exceptionDetails || plan.result)).slice(0, 1500)); process.exit(1); }
plan = plan.result.value;
// (moves: the places with a ladder, the friend there at the defaults; each
// climbed at three heights. A game without climbs by hand has none.)
const ladderPlaces = (await send("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `(async () => {
  if (typeof startClimb !== "function" || typeof bgShown === "undefined") return [];
  const out = [];
  for (const s of ${JSON.stringify(plan.filter(s => s.folder === "backgrounds-with-friend"))}) {
    for (const [p, v] of Object.entries(DEFAULTS)) if (state[p] && typeof v === "object") { for (const key of Object.keys(state[p])) delete state[p][key]; Object.assign(state[p], structuredClone(v)); }
    state.music.mute = true; Object.assign(state.background, s.bg); changed(); await new Promise(r => setTimeout(r, 60));
    if (bgShown.node && bgShown.node.querySelector("[data-ladder]")) out.push(s);
  }
  return out;
})()` })).result.result.value || [];
for (const s of ladderPlaces) for (const [at, word] of [[0.25, "low"], [0.5, "halfway"], [0.8, "near the top"]])
  plan.push({ folder: "moves", name: `climb--${s.name}--${Math.round(at * 100)}`, label: `${s.label}: 🧗 climbing its ladder, ${word}`, bg: s.bg, friend: true, move: { at } });
// (ticket 262) each background twice more, with an overlay of 🔬's on
const OVERLAYS = [["made", "made-of", "🔬 🧩 what it is made of"], ["boxes", "collision-boxes", "🔬 🧱 collision boxes"]];
for (const s of plan.filter(s => s.folder === "backgrounds" || s.folder === "backgrounds-with-friend"))
  for (const [overlay, suffix, word] of OVERLAYS) plan.push({ ...s, folder: s.folder + "-" + suffix, label: s.label + ": " + word, overlay });
console.log(plan.length, "pictures planned,", ladderPlaces.length, "places with a ladder");
// 2. take them, a batch at a time
const out = [];
for (let i = 0; i < plan.length; i += 20) {
  const batch = plan.slice(i, i + 20);
  const r = await send("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `(async () => {
    const tick = () => new Promise(r => setTimeout(r, 60)), res = [];
    const h = s => { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return (x >>> 0).toString(16); };
    const reset = () => { for (const [p, v] of Object.entries(DEFAULTS)) if (state[p] && typeof v === "object") { for (const key of Object.keys(state[p])) delete state[p][key]; Object.assign(state[p], structuredClone(v)); }
      state.music.mute = true; };   // (the scene's LFO choices at the game's own defaults: a still leaves out their animations)
    const pic = document.getElementById("pic");
    const svgOf = () => { const c = pic.cloneNode(true), vb = pic.viewBox.baseVal; c.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      c.setAttribute("width", Math.round(vb.width)); c.setAttribute("height", Math.round(vb.height)); c.removeAttribute("style"); c.removeAttribute("class");
      return '<?xml version="1.0" encoding="UTF-8"?>\\n' + new XMLSerializer().serializeToString(c); };
    // (the thumbnail: the drawing, still, drawn 480 wide and kept as WebP, which keeps its see-through parts)
    const TW = 480;
    const webpOf = async (svgText, w, hh) => { const img = new Image(); img.src = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml" })); await img.decode();
      const cv = document.createElement("canvas"); cv.width = w; cv.height = hh; cv.getContext("2d").drawImage(img, 0, 0, w, hh); URL.revokeObjectURL(img.src);
      return cv.toDataURL("image/webp", 0.72).split(",")[1]; };
    const snap = async () => { const c = pic.cloneNode(true), vb = pic.viewBox.baseVal, w = TW, hh = Math.round(TW * vb.height / vb.width);
      c.setAttribute("xmlns", "http://www.w3.org/2000/svg"); c.setAttribute("width", w); c.setAttribute("height", hh); c.removeAttribute("style"); c.removeAttribute("class");
      for (const a of c.querySelectorAll("animate,animateTransform,animateMotion")) a.remove();
      return webpOf(new XMLSerializer().serializeToString(c), w, hh); };
    // (ticket 262: the picture with 🔬's overlay over it: #access-layer's drawings, each with its look from the page's
    // stylesheet written into it, over the picture at its size on the screen; 1920 wide)
    const LOOK = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray", "stroke-linecap", "stroke-linejoin",
                  "opacity", "font-family", "font-size", "font-weight", "paint-order", "display", "visibility", "text-anchor", "dominant-baseline"];
    const overlayParts = () => { const L = document.getElementById("access-layer"), pr = pic.getBoundingClientRect(), outp = [];
      for (const o of L.querySelectorAll(":scope > svg")) { const r = o.getBoundingClientRect(), c = o.cloneNode(true);
        const a = [o, ...o.querySelectorAll("*")], b = [c, ...c.querySelectorAll("*")];
        a.forEach((el, i) => { const cs = getComputedStyle(el); b[i].setAttribute("style", LOOK.map(p => p + ":" + cs.getPropertyValue(p)).join(";")); b[i].removeAttribute("class"); });
        for (const x of c.querySelectorAll("animate,animateTransform,animateMotion,set")) x.remove();
        c.setAttribute("x", (r.left - pr.left).toFixed(1)); c.setAttribute("y", (r.top - pr.top).toFixed(1)); c.setAttribute("width", r.width.toFixed(1)); c.setAttribute("height", r.height.toFixed(1));
        if (!c.getAttribute("viewBox")) c.setAttribute("viewBox", "0 0 " + r.width.toFixed(1) + " " + r.height.toFixed(1));
        c.style.overflow = "hidden"; outp.push(new XMLSerializer().serializeToString(c)); }
      const leg = L.querySelector(".made-legend"); return { svgs: outp, legend: leg ? leg.textContent : "" }; };
    const overlaySvg = () => { const pr = pic.getBoundingClientRect(), c = pic.cloneNode(true);
      for (const a of c.querySelectorAll("animate,animateTransform,animateMotion")) a.remove();
      c.setAttribute("xmlns", "http://www.w3.org/2000/svg"); c.setAttribute("x", 0); c.setAttribute("y", 0); c.setAttribute("width", pr.width.toFixed(1)); c.setAttribute("height", pr.height.toFixed(1));
      c.removeAttribute("style"); c.removeAttribute("class"); c.removeAttribute("id");
      const w = 1920, hh = Math.round(1920 * pr.height / pr.width);
      return '<?xml version="1.0" encoding="UTF-8"?>\\n<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + hh + '" viewBox="0 0 ' + pr.width.toFixed(1) + " " + pr.height.toFixed(1) + '">' +
        new XMLSerializer().serializeToString(c) + overlayParts().svgs.join("") + "</svg>"; };
    const overlaySnap = async svg => { const m = /width="(\\d+)" height="(\\d+)"/.exec(svg.slice(0, 400)), w = TW, hh = Math.round(TW * +m[2] / +m[1]);
      return webpOf(svg.replace(/width="\\d+" height="\\d+"/, 'width="' + w + '" height="' + hh + '"'), w, hh); };
    // (a still picture's markup: what an option draws is judged without the animations, which a
    // still cannot show, so an LFO's or a blink's choice draws nothing different)
    const markup = () => { const c = pic.cloneNode(true); for (const a of c.querySelectorAll("animate,animateTransform,animateMotion,set,style")) a.remove();
      return c.innerHTML.replace(/ begin="[^"]*"/g, "").replace(/animation:[^;"]*;?/g, ""); };
    // (a menu hidden under the defaults: the one setting of its own tab that shows it, if there is
    // one, chosen first: the nose's side shape with the nose set to a side view)
    const rowsOf = part => { const out = []; const walk = rows => { for (const r of rows) {
        if (r[0] === "group") walk(r[3]);
        else if (r[0] === "choice") out.push([r[1], r[2], r[3].map(o => [o[0], typeof o[1] === "function" ? o[1](DEFAULTS[part]) : o[1]])]);
        else if (r[0] === "toggle") out.push([r[1], r[2], [[true, "on"], [false, "off"]]]);
        else if (r[0] === "flip") out.push([r[1], "", [[true, r[2][1]], [false, r[2][0]]]]);
        else if (r[0] === "range") out.push([r[1], r[2], [[r[6], String(r[6])], [r[4], String(r[4])]]]); } };
      for (const [, p, rows] of TABS) if (p === part) walk(rows); return out; };
    const contextFor = (part, key) => { const rule = SHOWN_WHEN[part + "." + key]; if (!rule) return null; const P = state[part];
      let ok; try { ok = rule(P); } catch (_) { ok = true; } if (ok) return null;
      for (const [k2, label2, opts] of rowsOf(part)) { if (k2 === key) continue; const old = P[k2];
        for (const [v2, t2] of opts) { P[k2] = v2; let r = false; try { r = rule(P); } catch (_) {}
          if (r) { P[k2] = old; return { key: k2, value: v2, label: (label2 ? label2 + ": " : "") + t2 }; } }
        P[k2] = old; }
      return "none"; };
    // (a background menu: in the first place where it shows)
    const placeFor = key => { const f = SHOWN_WHEN["background." + key]; if (!f) return null;
      for (const [kind] of PLACES) { const b = { ...structuredClone(DEFAULTS.background), kind }; try { if (f(b)) return { kind }; } catch (_) {} }
      // (shown nowhere under the defaults: a place, and one setting of the background's that brings it out there)
      const rows = rowsOf("background");
      for (const [kind] of PLACES) for (const [k2, label2, opts] of rows) { if (k2 === key) continue;
        for (const [v2, t2] of opts) { const b = { ...structuredClone(DEFAULTS.background), kind, [k2]: v2 }; let r = false; try { r = f(b); } catch (_) {}
          if (r) return { kind, ctx: { key: k2, value: v2, label: (label2 ? label2 + ": " : "") + t2 } }; } }
      return null; };
    for (const s of ${JSON.stringify(batch)}) {
      reset();
      // (ticket 262: a background with an overlay of 🔬's on)
      if (s.overlay) {
        Object.assign(state.background, s.bg); for (const g of VISIBLE_PARTS) state.visible[g] = s.friend ? 100 : 0;
        Object.assign(state.access, s.overlay === "made" ? { showMadeOf: true } : { showSolids: true });
        changed(); await tick(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        madeShown = ""; solidsShown = ""; madeOfHud(); solidsHud(); await tick();
        const svg = overlaySvg(), ov = overlayParts();
        res.push({ ...s, label: s.label + (ov.legend ? " (" + ov.legend + ")" : ""), hash: h(markup() + "|" + s.overlay + "|" + ov.svgs.join("")), baseHash: null, same: false,
                   thumb: await overlaySnap(svg), svg, settings: JSON.stringify({ app: "dress-up", version: 1, state }, null, 2) });
        reset(); changed();
        continue;
      }
      // (a move: up the ladder nearest where the friend stands, by hand to its height)
      if (s.move) {
        Object.assign(state.background, s.bg); for (const g of VISIBLE_PARTS) state.visible[g] = 100;
        state.body.anim = "climbup"; state.body.facing = "back"; climb = null; climbAnywhere = true;
        changed(); await tick(); if (!climb) startClimb();
        if (!climb || climb.none) { res.push({ ...s, hash: "", same: false, hidden: true, thumb: null, svg: null, settings: null }); climb = null; continue; }
        climb.manual = true; climb.got = 0; changed(); await tick();
        climb.got = s.move.at * (climb.all || 0); changed(); await tick();
        const m = markup();
        res.push({ ...s, hash: h(m), baseHash: null, same: false, thumb: await snap(), svg: svgOf(),
                   settings: JSON.stringify({ app: "dress-up", version: 1, state }, null, 2) });
        climb = null; reset(); changed();
        continue;
      }
      if (s.defaultOf) { state.background.kind = "none"; changed(); await tick(); const m0 = markup();
        res.push({ ...s, hash: h(m0), same: false, thumb: await snap(), svg: svgOf(), settings: JSON.stringify({ app: "dress-up", version: 1, state }, null, 2) }); continue; }
      if (s.bg) { Object.assign(state.background, s.bg); for (const g of VISIBLE_PARTS) state.visible[g] = s.friend ? 100 : 0; }
      else if (s.part === "background") {
        const at = placeFor(s.key);
        // (a menu that shows nowhere, even with one more setting chosen: noted, no picture)
        if (!at) { res.push({ ...s, hash: "", same: false, hidden: true, thumb: null, svg: null, settings: null }); continue; }
        state.background.kind = at.kind; for (const g of VISIBLE_PARTS) state.visible[g] = 0;
        if (at.ctx) { state.background[at.ctx.key] = at.ctx.value; s.label += " (with " + at.ctx.label + ")"; }
      }
      else state.background.kind = "none";
      let ctx = null;
      if (s.part && s.part !== "background") { ctx = contextFor(s.part, s.key);
        if (ctx === "none") { res.push({ ...s, hash: "", same: false, hidden: true, thumb: null, svg: null, settings: null }); continue; }
        if (ctx) state[s.part][ctx.key] = ctx.value; }
      changed(); await tick();
      let before = s.part ? markup() : null;
      if (ctx) s.label += " (with " + ctx.label + ")";
      if (s.part) { state[s.part][s.key] = s.value; changed(); await tick(); }
      let m = markup(), same = before !== null && before === m;
      // (the same as the defaults: try one more setting of its tab, under which it shows: spiky teeth with the mouth open)
      if (same && s.part && s.part !== "background" && !ctx) {
        const P = state[s.part];
        search: for (const [k2, label2, opts] of rowsOf(s.part)) { if (k2 === s.key) continue; const old2 = P[k2];
          for (const [v2, t2] of opts) { if (v2 === old2) continue;
            P[k2] = v2; P[s.key] = DEFAULTS[s.part][s.key]; changed(); const b2 = markup();
            P[s.key] = s.value; changed(); const a2 = markup();
            if (a2 !== b2) { before = b2; m = a2; same = false; s.label += " (with " + (label2 ? label2 + ": " : "") + t2 + ")"; break search; } }
          P[k2] = old2; }
        if (same) { P[s.key] = s.value; changed(); }
        await tick();
      }
      res.push({ ...s, hash: h(m), baseHash: before !== null ? h(before) : null, same, thumb: same ? null : await snap(), svg: same ? null : svgOf(),
                 settings: same ? null : JSON.stringify({ app: "dress-up", version: 1, state }, null, 2) });
    }
    return res;
  })()` });
  if (r.result.exceptionDetails) { console.log("EXC", JSON.stringify(r.result.exceptionDetails).slice(0, 500)); process.exit(1); }
  out.push(...r.result.result.value);
  process.stdout.write(".");
}
// 3. files, a manifest, a page: the run's folder written whole beside the old one, then put in its place
const manifest = [], firstOf = new Map();
for (const s of out) {
  let file = null, sameAs = null;
  if (!s.same && !s.hidden) {
    if (firstOf.has(s.hash)) { file = firstOf.get(s.hash); sameAs = file; }
    else { file = `${s.folder}/${s.name}.svg`; firstOf.set(s.hash, file); mkdirSync(join(outDir, s.folder), { recursive: true }); mkdirSync(join(outDir, "thumbs", s.folder), { recursive: true });
      writeFileSync(join(outDir, file), s.svg); writeFileSync(join(outDir, s.folder, s.name + ".json"), s.settings);
      writeFileSync(join(outDir, "thumbs", s.folder, s.name + ".webp"), Buffer.from(s.thumb, "base64")); }
  }
  manifest.push({ folder: s.folder, name: s.name, label: s.label, tab: s.tab || null, key: s.key || null, value: s.value ?? null, hash: s.hash, sameAsDefault: s.same, onlyWithOtherSettings: !!s.hidden,
                  sameAsFile: s.same ? firstOf.get(s.baseHash) || null : null,
                  svg: file, settings: file && file.replace(/\.svg$/, ".json"), thumb: file && "thumbs/" + file.replace(/\.svg$/, ".webp"), sameDrawingAs: sameAs });
}
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
const source = sourceFile ? JSON.parse(readFileSync(sourceFile, "utf8")) : {};
if (sourceFile) writeFileSync(join(outDir, "source.json"), JSON.stringify(source, null, 1) + "\n");
writeFileSync(join(outDir, "index.html"), runPage(manifest, source, run));
if (existsSync(finalDir)) renameSync(finalDir, finalDir + ".old");
renameSync(outDir, finalDir); rmSync(finalDir + ".old", { recursive: true, force: true });
console.log("\n" + firstOf.size, "distinct drawings written (svg, json, webp),", out.filter(s => !s.same && !s.hidden).length - firstOf.size, "repeats pointed at their first,", out.filter(s => s.same).length, "same as default,", out.filter(s => s.hidden).length, "shown only with other settings;", errs.length, "page errors", errs.slice(0, 2).join(" | "));
process.exit(0);
