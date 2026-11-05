# AP AI Website Maker

A local AI website builder: describe a website, upload images, generate pages with Gemini, edit the result visually, preview desktop/tablet/mobile layouts, and export a ZIP.

## Requirements
- Windows, macOS, or Linux
- Node.js 18 or newer (Node.js 20 LTS is recommended)
- A Google Gemini API key from https://aistudio.google.com/apikey
- Internet connection while generating a website

## Start on Windows (easy way)
1. Extract this ZIP to a normal folder (do not run it from inside the ZIP).
2. Open the `AP-AI-Website-Maker` folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Run `npm install` and wait until it finishes.
5. Copy `.env.example` and name the copy `.env`.
6. Open `.env` and replace `PASTE_YOUR_GEMINI_API_KEY_HERE` with your own Gemini API key. Keep this file private; never upload it or share it.
7. Run `npm start`.
8. Open http://localhost:3000 in Chrome or Edge.

You can also double-click `start-windows.bat` after completing steps 4–6. The batch file starts the server; it does not install Node.js or create an API key.

## How to use the app
1. On the homepage, enter your name, website/business name, and a clear description.
2. Add contact details only if you want them displayed publicly.
3. Upload your logo, profile/hero image, background image, and up to 12 gallery images. Supported formats: PNG, JPG/JPEG, WEBP; maximum 8 MB each.
4. Choose the website type, theme, brand colour, font style, and pages.
5. Complete the SEO and features section: page title, description, keywords, audience, language, tone, CTA and requested features.
6. Press **Generate Website** and keep the browser open while Gemini works.
7. In the editor, click text to edit it; select images or sections to change them; use Undo/Redo; preview Desktop, Tablet and Mobile; press Save.
8. Press **Download ZIP**. Extract the downloaded ZIP and open its `index.html` to preview it, or upload the extracted website files to a static hosting provider.

## Included functionality
- AI-generated multi-page HTML/CSS/JS websites
- Logo, profile, background and gallery image uploads with previews
- Website type, theme, colour, font and page selection
- SEO and content brief fields
- Visual editor with text editing, image replacement, section add/move/duplicate/delete, colour controls, Undo/Redo
- Desktop, tablet and mobile preview sizes
- Project list, save, delete and ZIP export
- Health check at http://localhost:3000/api/health

## Important limitations
- Gemini generation requires your own API key, internet access, and may incur usage charges under Google's current terms.
- This app runs locally by default. Your generated sites are not automatically published to the internet.
- The generated websites are static. Contact links can use the supplied email/WhatsApp details; features such as real payments, user accounts, database storage, appointment booking, or order management need a separate backend/service integration. Do not treat a visual demo as a live transaction system.
- SEO fields help create good metadata and content, but cannot guarantee Google indexing or ranking. After publishing, connect the domain to Google Search Console and submit the sitemap if one is generated.

## Troubleshooting
- `GEMINI_API_KEY is missing`: check that `.env` is in the same folder as `server.js`, that the variable is spelled `GEMINI_API_KEY`, and restart `npm start`.
- `npm is not recognized`: install Node.js LTS from https://nodejs.org, restart VS Code, and try again.
- Port 3000 is busy: close the other app using it or set another port in `.env`, e.g. `PORT=3001`, then open the matching localhost URL.
- Generation fails: check internet access, API key validity/quota, and the terminal error. Try a shorter brief or fewer images.
- Do not put your Gemini API key into frontend JavaScript or generated website files.

## Project structure
- `server.js` — local Express API and static hosting
- `services/gemini.js` — Gemini prompt and generated-file parser
- `public/` — builder homepage, styles, browser logic and visual editor
- `generated/` — projects created on your computer (not included as dependencies)
- `.env.example` — safe environment-variable template
