const id = new URLSearchParams(location.search).get("id");
const $ = (s) => document.querySelector(s);
const frame = $("#frame"), panel = $("#panel");
let page = "index.html", sel = null, hist = [], pos = -1, dirty = false, timer, ft;
const D = () => frame.contentDocument;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const api = (u, o) => fetch(`/api/projects/${id}${u}`, o).then(async (r) => {
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Request failed");
  return j;
});
const flash = (m) => { $("#status").textContent = m; clearTimeout(ft); ft = setTimeout(upd, 2500); };
const hex = (v) => {
  const c = document.createElement("canvas").getContext("2d");
  c.fillStyle = "#000000"; c.fillStyle = (v || "").trim() || "#000000";
  return c.fillStyle.startsWith("#") ? c.fillStyle : "#000000";
};
const secOf = (el) => el && el.closest("section,header,footer,nav");
const EDITABLE = "h1,h2,h3,h4,h5,h6,p,li,figcaption,blockquote,label,small,button,a";
const BLOCKS = "div,section,ul,ol,p,h1,h2,h3,h4,h5,h6,img,nav,header,footer,form";

/* ---------- history ---------- */
const snap = () => {
  const c = D().body.cloneNode(true);
  c.querySelectorAll(".ap-sel").forEach((e) => e.classList.remove("ap-sel"));
  return JSON.stringify([c.innerHTML, D().documentElement.getAttribute("style") || ""]);
};
const commit = () => {
  clearTimeout(timer); timer = null;
  if (!D() || !D().body) return;
  const s = snap();
  if (s === hist[pos]) return;
  hist = hist.slice(0, pos + 1); hist.push(s);
  if (hist.length > 80) hist.shift();
  pos = hist.length - 1; dirty = true; upd();
};
const push = () => { clearTimeout(timer); timer = setTimeout(commit, 350); };
function restore(i) {
  const [body, style] = JSON.parse(hist[i]);
  D().body.innerHTML = body;
  style ? D().documentElement.setAttribute("style", style) : D().documentElement.removeAttribute("style");
  pos = i; dirty = true; sel = null; upd(); render();
}
const undo = () => { commit(); if (pos > 0) restore(pos - 1); };
const redo = () => { commit(); if (pos < hist.length - 1) restore(pos + 1); };
function upd() {
  $("#undo").disabled = pos <= 0; $("#redo").disabled = pos >= hist.length - 1;
  $("#status").textContent = dirty ? "Unsaved changes" : "All changes saved";
}

/* ---------- preview setup ---------- */
function editable(root) {
  root.querySelectorAll(EDITABLE).forEach((e) => { if (!e.querySelector(BLOCKS)) e.setAttribute("contenteditable", "true"); });
}
function setup() {
  const d = D();
  if (!d || !d.body) return;
  const st = d.createElement("style");
  st.id = "ap-ed";
  st.textContent = "[contenteditable]{outline:none;cursor:text}[contenteditable]:hover{outline:1px dashed #7893ff}.ap-sel{outline:2px solid #7893ff!important;outline-offset:2px}img{cursor:pointer}";
  d.head.appendChild(st);
  editable(d.body);
  d.addEventListener("click", (e) => { if (e.target.closest("a,button")) e.preventDefault(); select(e.target); }, true);
  d.addEventListener("submit", (e) => e.preventDefault(), true);
  d.addEventListener("input", push);
  d.addEventListener("keydown", keys);
  hist = [snap()]; pos = 0; dirty = false; sel = null; upd(); render();
}
frame.onload = setup;
function keys(e) {
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (k === "y") { e.preventDefault(); redo(); }
  else if (k === "s") { e.preventDefault(); save(); }
}
document.addEventListener("keydown", keys);

function select(el) {
  sel && sel.classList.remove("ap-sel");
  const d = D();
  sel = el && el !== d.body && el !== d.documentElement ? el : null;
  sel && sel.classList.add("ap-sel");
  render();
}

/* ---------- side panel ---------- */
const TEMPLATES = {
  "Text block": `<section style="padding:80px 6vw;text-align:center"><h2>Section title</h2><p style="max-width:640px;margin:14px auto 0">Write your text here. Click any text to edit it.</p></section>`,
  "Image + text": `<section style="padding:80px 6vw;display:flex;flex-wrap:wrap;gap:40px;align-items:center;justify-content:center"><img alt="Placeholder" style="width:min(100%,420px);border-radius:12px" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect width='100%25' height='100%25' fill='%23888' opacity='.3'/%3E%3C/svg%3E"><div style="max-width:460px"><h2>Your headline</h2><p>Tell visitors about this part of your story. Select the image to replace it.</p></div></section>`,
  "Three cards": `<section style="padding:80px 6vw;text-align:center"><h2>What we offer</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-top:32px;text-align:left">${[1, 2, 3].map((n) => `<article style="background:var(--surface,#8883);padding:24px;border-radius:14px"><h3>Service ${n}</h3><p>Describe this service in a sentence or two.</p></article>`).join("")}</div></section>`,
  "Call to action": `<section style="padding:80px 6vw;text-align:center"><h2>Ready to get started?</h2><p style="margin:12px 0 24px">Get in touch today.</p><a href="#contact" style="display:inline-block;padding:12px 26px;border-radius:999px;background:var(--primary,#4f6cff);color:var(--primary-contrast,#fff);text-decoration:none">Contact us</a></section>`,
};
function render() {
  const d = D();
  if (!d || !d.documentElement) return;
  const root = getComputedStyle(d.documentElement);
  const tok = [["--primary", "Primary"], ["--bg", "Background"], ["--surface", "Cards"], ["--text", "Text"]];
  let h = `<h4>Site colors</h4><div class="row2">${tok.map(([k, l]) => `<label>${l}<input type="color" data-tok="${k}" value="${hex(root.getPropertyValue(k))}"></label>`).join("")}</div>`;
  if (!sel) h += `<p class="hint">Click any text in the preview to edit it directly. Click an image, button or section to see its settings here.</p>`;
  else {
    const t = sel.tagName, sec = secOf(sel), cs = getComputedStyle(sel);
    h += `<h4>Selected: ${t.toLowerCase()}</h4>`;
    if (t === "IMG") {
      h += `<label>Alt text<input data-a="alt" value="${esc(sel.alt)}"></label>
      <label>Width (px)<input type="number" data-a="w" min="20" max="2000" value="${Math.round(sel.getBoundingClientRect().width)}"></label>
      <div class="btns"><button class="btn" data-do="aL">Left</button><button class="btn" data-do="aC">Center</button><button class="btn" data-do="aR">Right</button></div>
      <div class="btns"><button class="btn pri" data-do="upImg">Change image</button><button class="btn danger" data-do="del">Delete image</button></div>`;
    } else {
      if (t === "A") h += `<label>Link URL<input data-a="href" value="${esc(sel.getAttribute("href"))}" placeholder="https://… or #contact"></label>`;
      if (!sel.matches("section,header,footer,nav,main,div,ul,ol"))
        h += `<div class="row2"><label>Text color<input type="color" data-a="color" value="${hex(cs.color)}"></label><label>Size (px)<input type="number" data-a="fs" min="8" max="120" value="${parseInt(cs.fontSize)}"></label></div>
        <div class="btns"><button class="btn danger" data-do="del">Delete element</button></div>`;
    }
    if (sec) h += `<h4>Section (${sec.id ? "#" + esc(sec.id) : sec.tagName.toLowerCase()})</h4>
      <div class="btns"><button class="btn" data-do="up">↑ Move up</button><button class="btn" data-do="down">↓ Move down</button><button class="btn" data-do="dup">Duplicate</button></div>
      <label>Background color<input type="color" data-a="secbg" value="${hex(getComputedStyle(sec).backgroundColor)}"></label>
      <div class="btns"><button class="btn" data-do="upBg">Background image</button><button class="btn" data-do="noBg">Clear background</button></div>
      <div class="btns"><button class="btn danger" data-do="delSec">Delete section</button></div>`;
  }
  h += `<h4>Add section</h4><select id="tpl">${Object.keys(TEMPLATES).map((k) => `<option>${k}</option>`).join("")}</select>
    <div class="btns"><button class="btn pri" data-do="add">Add ${sel ? "below selected" : "to page"}</button></div>`;
  panel.innerHTML = h;
}
const pick = (cb) => {
  const i = document.createElement("input");
  i.type = "file"; i.accept = "image/png,image/jpeg,image/webp";
  i.onchange = async () => {
    const f = i.files[0];
    if (!f) return;
    if (f.size > 8e6) return flash("Image must be under 8 MB");
    const fd = new FormData(); fd.append("image", f);
    try { const r = await api("/assets", { method: "POST", body: fd }); cb(r.path); commit(); render(); } catch (e) { flash(e.message); }
  };
  i.click();
};
panel.addEventListener("input", (e) => {
  const t = e.target, a = t.dataset.a, d = D();
  if (t.dataset.tok) d.documentElement.style.setProperty(t.dataset.tok, t.value);
  else if (a && sel) {
    if (a === "alt") sel.alt = t.value;
    else if (a === "href") sel.setAttribute("href", t.value);
    else if (a === "w") { sel.style.width = t.value + "px"; sel.style.height = "auto"; }
    else if (a === "color") sel.style.color = t.value;
    else if (a === "fs") sel.style.fontSize = t.value + "px";
    else if (a === "secbg") secOf(sel).style.background = t.value;
  } else return;
  push();
});
panel.addEventListener("click", (e) => {
  const b = e.target.closest("[data-do]");
  if (!b) return;
  const a = b.dataset.do, s = secOf(sel), d = D();
  const align = (m) => { sel.style.display = "block"; sel.style.margin = m; };
  const act = {
    del: () => { sel.remove(); sel = null; },
    delSec: () => { s.remove(); sel = null; },
    aL: () => align("0 auto 0 0"), aC: () => align("0 auto"), aR: () => align("0 0 0 auto"),
    up: () => { const p = s.previousElementSibling; p && s.parentNode.insertBefore(s, p); s.scrollIntoView({ block: "center" }); },
    down: () => { const n = s.nextElementSibling; n && s.parentNode.insertBefore(n, s); s.scrollIntoView({ block: "center" }); },
    dup: () => { const c = s.cloneNode(true); c.removeAttribute("id"); c.classList.remove("ap-sel"); s.after(c); },
    noBg: () => { s.style.background = ""; s.style.backgroundImage = "none"; },
    upImg: () => pick((p) => { sel.removeAttribute("srcset"); sel.src = p; }),
    upBg: () => pick((p) => { s.style.background = `url(${p}) center/cover no-repeat`; }),
    add: () => {
      const tpl = document.createElement("template");
      tpl.innerHTML = TEMPLATES[$("#tpl").value];
      const el = tpl.content.firstElementChild, foot = d.querySelector("footer");
      editable(el);
      if (s) s.after(el); else if (foot) foot.before(el); else (d.querySelector("main") || d.body).append(el);
      el.scrollIntoView({ block: "center" });
    },
  };
  if (!act[a]) return;
  act[a]();
  commit(); render();
});

/* ---------- save / pages / devices ---------- */
function output(vars) {
  const c = D().documentElement.cloneNode(true);
  c.querySelector("#ap-ed")?.remove();
  c.querySelectorAll("[contenteditable]").forEach((e) => e.removeAttribute("contenteditable"));
  c.querySelectorAll(".ap-sel").forEach((e) => e.classList.remove("ap-sel"));
  c.querySelectorAll("[class='']").forEach((e) => e.removeAttribute("class"));
  Object.keys(vars).forEach((k) => c.style.removeProperty(k));
  if (!c.getAttribute("style")) c.removeAttribute("style");
  return "<!DOCTYPE html>\n" + c.outerHTML;
}
async function save() {
  commit();
  if (!dirty) return true;
  $("#status").textContent = "Saving…";
  try {
    const st = D().documentElement.style, vars = {};
    for (const k of st) if (k.startsWith("--")) vars[k] = st.getPropertyValue(k).trim();
    await api(`/pages/${page}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ html: output(vars), vars }) });
    dirty = false; upd(); flash("Saved ✓");
    return true;
  } catch (e) { flash("Save failed: " + e.message); return false; }
}
const load = (p) => { page = p; $("#pages").value = p; frame.src = `/sites/${id}/${p}`; };
$("#pages").onchange = async (e) => { if (await save()) load(e.target.value); else $("#pages").value = page; };
$("#save").onclick = save;
$("#undo").onclick = undo; $("#redo").onclick = redo;
$("#zip").onclick = async () => { if (await save()) location.href = `/api/projects/${id}/download`; };
$("#back").onclick = (e) => { if (dirty && !confirm("You have unsaved changes. Leave without saving?")) e.preventDefault(); };
document.querySelectorAll("[data-w]").forEach((b) => (b.onclick = () => {
  frame.style.width = b.dataset.w;
  document.querySelectorAll("[data-w]").forEach((x) => x.classList.toggle("on", x === b));
}));
window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

(async () => {
  if (!id) return (location.href = "/");
  try {
    let p = await api("");
    // Opened while the AI is still building the site: wait here and continue automatically.
    while ((p.status || "ready") === "generating") {
      $("#title").textContent = p.name;
      $("#status").textContent = "AI is building your site…";
      await new Promise((r) => setTimeout(r, 2000));
      try { p = await api(""); } catch (e) { if (/not found/i.test(e.message)) throw e; }
    }
    if (p.status === "error") throw new Error(p.error || "Generation failed. Please go back and try again.");
    $("#title").textContent = p.name;
    $("#pages").innerHTML = p.pages.map((x) => `<option>${esc(x)}</option>`).join("");
    load(p.pages[0]);
  } catch (e) { $("#title").textContent = "Could not open this project"; $("#status").textContent = e.message; }
})();
