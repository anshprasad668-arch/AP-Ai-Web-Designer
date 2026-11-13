
const { GoogleGenAI } = require("@google/genai");

const SYSTEM = `You are an expert web designer and front-end developer. Build a complete, polished, responsive static website from the client's brief.

OUTPUT FORMAT (strict): output only files. Each file starts with a line "=== FILE: <name> ===" followed by its raw content. No markdown fences, no commentary.

Required files: index.html, style.css, script.js. For every extra page requested add one HTML file (about.html, services.html, contact.html...) sharing style.css and script.js, and give every page the same navigation linking all pages. File names are flat (no folders).

RULES:
- Plain HTML/CSS/JS only. No frameworks, no build step, no external scripts. Google Fonts <link> is allowed.
- Define design tokens in :root of style.css: --primary, --primary-contrast, --bg, --surface, --text, --muted. Use them for every colour so the owner can recolour the site in one place.
- Use ONLY the uploaded image paths listed in the brief, exactly as written. Never invent other image files; where no image exists use CSS gradients or inline SVG.
- Write real copy from the brief, no lorem ipsum. Never invent phone numbers, emails or social links; use only those provided and omit the rest.
- Put each major block in its own <section> with a short descriptive id. Keep text in plain tags so a visual editor can edit it.
- Responsive, accessible, with title, meta description and Open Graph tags.
- There is no backend: contact forms must use mailto: or a WhatsApp link.
- One tasteful reveal/hover animation in script.js. Content must stay visible if JavaScript fails.
- Give the design a distinct personality fitted to the subject and chosen theme; avoid generic template looks.`;

const FIELDS = [
  ["ownerName", "Owner name"],
  ["siteName", "Website / business name"],
  ["profession", "Profession / category"],
  ["location", "Location"],
  ["tagline", "Tagline"],
  ["about", "About"],
  ["phone", "Phone"],
  ["whatsapp", "WhatsApp"],
  ["email", "Email"],
  ["address", "Address"],
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["youtube", "YouTube"],
  ["linkedin", "LinkedIn"],
  ["websiteType", "Website type"],
  ["theme", "Theme"],
  ["primaryColor", "Primary colour"],
  ["fontStyle", "Font style"],
  ["seoTitle", "SEO page title"],
  ["seoDescription", "SEO description"],
  ["keywords", "Search keywords"],
  ["language", "Website language"],
  ["audience", "Target audience"],
  ["contentTone", "Writing tone"],
  ["ctaText", "Main button text"],
  ["features", "Requested features"],
  ["instructions", "Extra instructions"],
];

function brief(b, img = {}) {
  let t = "CLIENT BRIEF\n";

  for (const [k, label] of FIELDS) {
    if (b[k] && String(b[k]).trim()) {
      t += `${label}: ${String(b[k]).trim()}\n`;
    }
  }

  const pages = [].concat(b.pages || ["Home"]);

  t += `Pages to build: ${pages.join(", ")} (${pages.length > 1 ? "multi-page" : "single page"})\n`;
  t += "Uploaded images (use these exact paths):\n";
  t += `- Logo: ${img.logo || "none"}\n`;
  t += `- Profile photo: ${img.profile || "none"}\n`;
  t += `- Hero background: ${img.background || "none"}\n`;
  t += `- Gallery/business photos: ${(img.gallery || []).join(", ") || "none"}\n`;

  return t;
}

function parse(text) {
  const out = {};
  const parts = String(text || "").split(/^=== FILE: (.+?) ===\s*$/m);

  for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i].trim().toLowerCase();

    if (!/^[a-z0-9_-]+\.(html|css|js)$/.test(name)) continue;

    out[name] = parts[i + 1]
      .replace(/^\s*```[a-z]*\s*\n/i, "")
      .replace(/\n```\s*$/, "")
      .trim() + "\n";
  }

  return out;
}

// Google retires models often, so we ask the API which models YOUR key can use
// and try the newest Flash models first. Hard-coded names are only a backup.
const BACKUP_MODELS = ["gemini-flash-latest", "gemini-3-flash-preview", "gemini-2.5-flash"];

function versionScore(name) {
  const m = name.match(/gemini-(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

async function discoverModels(ai) {
  try {
    const found = [];
    const pager = await ai.models.list({ config: { pageSize: 100 } });
    for await (const m of pager) {
      const name = String(m.name || "").replace(/^models\//, "");
      const actions = m.supportedActions || [];
      if (!/^gemini-.*flash/.test(name)) continue;
      if (/image|tts|live|audio|lite|embedding|robotics|computer|thinking-exp|exp/.test(name)) continue;
      if (actions.length && !actions.includes("generateContent")) continue;
      found.push(name);
    }
    // newest version first; stable models before "-preview" within the same version
    found.sort((a, b) => versionScore(b) - versionScore(a) || (/preview/.test(a) ? 1 : 0) - (/preview/.test(b) ? 1 : 0));
    return found;
  } catch (e) {
    console.error("Could not list models:", String(e.message || e).slice(0, 200));
    return [];
  }
}

async function modelList(ai) {
  const wanted = (process.env.GEMINI_MODEL || "").trim();
  const discovered = await discoverModels(ai);
  const all = [...new Set([wanted, ...discovered.slice(0, 4), ...BACKUP_MODELS].filter(Boolean))];
  // If discovery worked, skip a configured/backup name the key cannot see.
  return discovered.length ? all.filter((m) => discovered.includes(m) || BACKUP_MODELS.includes(m) || m === wanted) : all;
}

async function callGemini(ai, model, body, images) {
  const config = { systemInstruction: SYSTEM, maxOutputTokens: 60000 };
  // Gemini 3 works best at its default temperature; older models are fine with 0.8.
  if (!/gemini-3/.test(model)) config.temperature = 0.8;
  if (/2\.5-flash/.test(model)) config.thinkingConfig = { thinkingBudget: 1024 };

  const stream = await ai.models.generateContentStream({ model, contents: brief(body, images), config });
  let text = "";
  for await (const chunk of stream) text += chunk.text || "";
  return text;
}

async function generateSite(body, images) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.startsWith("add_your") || key.startsWith("PASTE_")) {
    throw new Error("GEMINI_API_KEY is missing. Add it to your .env file and restart the server.");
  }

  const ai = new GoogleGenAI({ apiKey: key });
  const models = await modelList(ai);
  console.log("Models to try:", models.join(", "));
  const failures = [];

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await callGemini(ai, model, body, images);
        const files = parse(text);
        if (!files["index.html"] || !files["style.css"]) {
          throw new Error("The AI reply was incomplete. Please try generating again.");
        }
        files["script.js"] = files["script.js"] || "";
        console.log(`Website generated with ${model}`);
        return files;
      } catch (e) {
        const msg = String(e.message || "");
        console.error(`[${model}] attempt ${attempt + 1} failed:`, msg.slice(0, 300));
        if (/API key|API_KEY|UNAUTHENTICATED|401/i.test(msg) && !/NOT_FOUND|404/.test(msg)) {
          throw new Error("Gemini rejected your API key. Create a new key at aistudio.google.com/apikey, put it in .env and restart.");
        }
        if (/NOT_FOUND|no longer available|not supported|404|PERMISSION_DENIED|403/i.test(msg)) {
          failures.push(`${model}: not available for this key`);
          break; // next model right away
        }
        if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
          failures.push(`${model}: quota/rate limit reached`);
          break;
        }
        if (attempt === 1) failures.push(`${model}: ${msg.slice(0, 120)}`);
        else await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  throw new Error("No Gemini model worked with your key. Tried -> " + (failures.join(" | ") || "none") +
    ". Check your key and quota at aistudio.google.com.");
}

module.exports = { generateSite, parse };
