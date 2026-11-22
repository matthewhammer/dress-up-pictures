// (ticket 454, Matthew: "look into the dress-up-pictures for clipped pictures --- I used to notice those but haven't checked
// recently. Please do your own check, and see if you can find any and what caused them. Fix those if possible.") Every
// picture of an archive run, the friend against the picture's own frame: each SVG parsed alone, everything but the friend
// hidden (#figure and #figure-far, with the groups they sit in, so a clip the game put round them still clips), drawn with a
// margin round the frame as wide as the frame, and the friend's pixels outside the frame counted, side by side, and how far
// they reach past it (in the picture's own units). Run on GitHub's computers, never the laptop.
// (ticket 818, 2026-11-21) Kept here, beside archive.mjs, so every archive run finds it: it lived only on the game's
// archive branches (last archive-609, 0.0.429), and runs cut from the game's main since had none.
//   node clip_audit.mjs <devtools port> <pictures folder> <out.json>
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
const [dport, dir, outFile] = process.argv.slice(2);
const files = [];
const walk = d => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) { if (n !== "thumbs") walk(p); } else if (n.endsWith(".svg")) files.push(p); } };
walk(dir);
const page = await (await fetch(`http://127.0.0.1:${dport}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener("open", r, { once: true }));
let n = 0; const pending = new Map();
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(res => { const i = ++n; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async x => { const r = await send("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true }); return r.result.exceptionDetails ? { error: JSON.stringify(r.result.exceptionDetails).slice(0, 200) } : r.result.result.value; };
await send("Runtime.enable");
const MEASURE = `(async (text) => {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml"), root = doc.documentElement;
  const fig = doc.getElementById("figure"); if (!fig) return { figure: false };
  const far = doc.getElementById("figure-far"), keep = new Set();
  for (const f of [fig, far]) { if (!f) continue; for (let x = f; x; x = x.parentNode) keep.add(x); for (const d of f.querySelectorAll("*")) keep.add(d); }
  for (const d of root.querySelectorAll("defs, defs *")) keep.add(d);
  for (const e of [...root.querySelectorAll("*")]) if (!keep.has(e) && keep.has(e.parentNode)) e.setAttribute("display", "none");
  const [vx, vy, vw, vh] = root.getAttribute("viewBox").split(/[ ,]+/).map(Number), M = Math.max(vw, vh), s = Math.min(1, 1600 / (vw + 2 * M), 1600 / (vh + 2 * M));
  root.setAttribute("viewBox", [vx - M, vy - M, vw + 2 * M, vh + 2 * M].join(" "));
  const W = Math.round((vw + 2 * M) * s), H = Math.round((vh + 2 * M) * s); root.setAttribute("width", W); root.setAttribute("height", H);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)], { type: "image/svg+xml" }));
  const img = new Image(); await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = url; });
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d"); g.drawImage(img, 0, 0); URL.revokeObjectURL(url);
  const px = g.getImageData(0, 0, W, H).data, x0 = M * s, x1 = (M + vw) * s, y0 = M * s, y1 = (M + vh) * s;
  const out = { left: 0, right: 0, top: 0, bottom: 0 }, reach = { left: 0, right: 0, top: 0, bottom: 0 }; let inside = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (px[(y * W + x) * 4 + 3] < 24) continue;
    if (x < x0 - 1) { out.left++; reach.left = Math.max(reach.left, (x0 - x) / s); } else if (x > x1 + 1) { out.right++; reach.right = Math.max(reach.right, (x - x1) / s); }
    if (y < y0 - 1) { out.top++; reach.top = Math.max(reach.top, (y0 - y) / s); } else if (y > y1 + 1) { out.bottom++; reach.bottom = Math.max(reach.bottom, (y - y1) / s); }
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) inside++; }
  return { figure: true, frame: [vx, vy, vw, vh], scale: s, inside, out, reach: Object.fromEntries(Object.entries(reach).map(([k, v]) => [k, Math.round(v)])) };
})`;
const results = [];
for (const [i, f] of files.entries()) {
  const r = await ev(`${MEASURE}(${JSON.stringify(readFileSync(f, "utf8"))})`);
  const rel = relative(dir, f), outPx = r && r.out ? Object.values(r.out).reduce((a, b) => a + b, 0) : 0;
  results.push({ file: rel, ...r, outPx });
  if (outPx > 20) console.log(`CLIPPED ${rel}: ${JSON.stringify(r.out)} reach ${JSON.stringify(r.reach)} of frame ${r.frame.join(" ")}`);
  if (r && r.error) console.log(`ERROR ${rel}: ${r.error}`);
  if (i % 50 === 0) console.log(`  ${i}/${files.length}`);
}
writeFileSync(outFile, JSON.stringify(results, null, 1));
const clipped = results.filter(r => r.outPx > 20), byFolder = {};
for (const r of clipped) { const k = r.file.split("/")[0]; byFolder[k] = (byFolder[k] || 0) + 1; }
console.log(`${files.length} pictures, ${results.filter(r => r.figure).length} with the friend, ${clipped.length} clipped (more than 20 of the friend's pixels outside the frame)`);
console.log(JSON.stringify(byFolder));
await fetch(`http://127.0.0.1:${dport}/json/close/${page.id}`);
process.exit(0);
