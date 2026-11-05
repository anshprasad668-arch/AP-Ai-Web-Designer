require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const archiver = require("archiver");
const { generateSite } = require("./services/gemini");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "generated");
fs.mkdirSync(ROOT, { recursive: true });

const EXT = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 15, fields: 60, parts: 75, fieldSize: 100 * 1024 },
  fileFilter: (_q, f, cb) => EXT[f.mimetype] ? cb(null, true) : cb(new Error("Only PNG, JPG/JPEG and WEBP images are supported.")),
});
const dir = (id) => path.join(ROOT, id);
const readMeta = (id) => JSON.parse(fs.readFileSync(path.join(dir(id), "project.json"), "utf8"));

app.use(express.json({ limit: "10mb" }));
app.use("/sites", express.static(ROOT, { etag: false, setHeaders: (r) => r.set("Cache-Control", "no-store") }));
app.use(express.static(path.join(__dirname, "public")));
app.param("id", (req, res, next, id) =>
  /^[a-f0-9]{16}$/.test(id) && fs.existsSync(path.join(dir(id), "project.json")) ? next() : res.status(404).json({ error: "Project not found." }));

app.get("/api/health", (_q, res) => res.json({ ok: true, gemini: !!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("add_your") }));

app.post("/api/generate",
  upload.fields([{ name: "logo", maxCount: 1 }, { name: "profile", maxCount: 1 }, { name: "background", maxCount: 1 }, { name: "gallery", maxCount: 12 }]),
  async (req, res) => {
    const b = req.body;
    if (!b.ownerName?.trim() || !b.siteName?.trim() || !b.about?.trim())
      return res.status(400).json({ error: "Please fill in your name, website name and description." });
    const id = crypto.randomBytes(8).toString("hex"), d = dir(id);
    try {
      fs.mkdirSync(path.join(d, "assets"), { recursive: true });
      const img = { logo: null, profile: null, background: null, gallery: [] };
      for (const k of ["logo", "profile", "background", "gallery"])
        (req.files?.[k] || []).forEach((f, i) => {
          const name = (k === "gallery" ? `gallery-${i + 1}` : k) + EXT[f.mimetype];
          fs.writeFileSync(path.join(d, "assets", name), f.buffer);
          if (k === "gallery") img.gallery.push("assets/" + name); else img[k] = "assets/" + name;
        });
      const files = await generateSite(b, img);
      for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(d, name), content);
      const pages = Object.keys(files).filter((f) => f.endsWith(".html")).sort((a, z) => (a === "index.html" ? -1 : z === "index.html" ? 1 : a.localeCompare(z)));
      fs.writeFileSync(path.join(d, "project.json"), JSON.stringify({ id, name: b.siteName.trim(), created: Date.now(), pages }));
      res.json({ id });
    } catch (e) {
      console.error("Generation failed:", e.message);
      fs.rmSync(d, { recursive: true, force: true });
      res.status(500).json({ error: e.message || "Generation failed." });
    }
  });

app.get("/api/projects", (_q, res) => {
  const list = fs.readdirSync(ROOT).filter((n) => /^[a-f0-9]{16}$/.test(n) && fs.existsSync(path.join(dir(n), "project.json")))
    .map((n) => { const { id, name, created } = readMeta(n); return { id, name, created }; })
    .sort((a, b) => b.created - a.created);
  res.json(list);
});

app.get("/api/projects/:id", (req, res) => res.json(readMeta(req.params.id)));

app.put("/api/projects/:id/pages/:page", (req, res) => {
  const { id, page } = req.params, meta = readMeta(id);
  const { html, vars } = req.body || {};
  if (!meta.pages.includes(page) || typeof html !== "string") return res.status(400).json({ error: "Invalid page." });
  fs.writeFileSync(path.join(dir(id), page), html);
  const clean = Object.entries(vars || {}).filter(([k, v]) => /^--[a-z0-9-]+$/.test(k) && /^#[0-9a-f]{6}$/i.test(v));
  if (clean.length) {  // colours are saved once in style.css so every page shares them
    const cssPath = path.join(dir(id), "style.css");
    let css = fs.readFileSync(cssPath, "utf8").replace(/\n?\/\* ap-theme \*\/[\s\S]*?\/\* end-ap-theme \*\/\n?/g, "");
    css += `\n/* ap-theme */\n:root{${clean.map(([k, v]) => `${k}:${v}`).join(";")}}\n/* end-ap-theme */\n`;
    fs.writeFileSync(cssPath, css);
  }
  res.json({ ok: true });
});

app.post("/api/projects/:id/assets", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Please choose a PNG, JPG or WEBP image under 8 MB." });
  const name = `img-${crypto.randomBytes(4).toString("hex")}${EXT[req.file.mimetype]}`;
  fs.writeFileSync(path.join(dir(req.params.id), "assets", name), req.file.buffer);
  res.json({ path: "assets/" + name });
});

app.get("/api/projects/:id/download", (req, res) => {
  const meta = readMeta(req.params.id);
  const slug = meta.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "website";
  res.attachment(`${slug}.zip`);
  const zip = archiver("zip", { zlib: { level: 9 } });
  zip.on("error", () => res.end());
  zip.pipe(res);
  zip.directory(dir(req.params.id), false, (e) => (e.name === "project.json" ? false : e));
  zip.finalize();
});

app.delete("/api/projects/:id", (req, res) => {
  fs.rmSync(dir(req.params.id), { recursive: true, force: true });
  res.json({ ok: true });
});

app.use((err, _q, res, next) => {
  if (!err) return next();
  console.error("Request error:", err.message);
  const message = err.code === "LIMIT_FILE_SIZE"
    ? "An image is larger than 8 MB. Please resize it and try again."
    : err.code === "LIMIT_FILE_COUNT"
      ? "Too many images. Use up to 15 images in total (12 gallery images plus 3 main images)."
      : err.code === "LIMIT_UNEXPECTED_FILE"
        ? "An image field has too many files. Use one logo, one profile photo, one background and up to 12 gallery images."
        : err.message || "The request could not be processed.";
  res.status(400).json({ error: message });
});
app.get("*", (_q, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`AP AI Website Maker running at http://localhost:${PORT}`));
