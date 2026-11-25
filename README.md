# AP AI Website Maker — Render-ready structure

## Folder structure
- `frontend/` — browser UI (HTML, CSS, JavaScript, logo, editor)
- `backend/` — Express API, Gemini integration and generated-site storage

## GitHub upload
1. Extract this ZIP.
2. Upload the contents (the `backend` and `frontend` folders plus root files) to a new GitHub repository.
3. Confirm `.env` is NOT uploaded. Add your Gemini key only in Render Environment settings.

## Render deployment
Create **New → Web Service**, connect this GitHub repository, then set:
- Runtime: Node
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment variable: `GEMINI_API_KEY` = your Gemini API key
- Optional: `GEMINI_MODEL` = leave unset unless you need to pin a model

Render supplies `PORT` automatically. Do not hard-code it.

## Local run (Windows)
Open a terminal in the `backend` folder and run `npm install`, then `npm start`.
Open `http://localhost:10000` (or the port printed in the terminal).

## Important hosting note
Generated websites are stored in `backend/data/generated`. On Render instances without a persistent disk, these files may be lost when the service restarts or redeploys. For permanent user projects, attach a Render Persistent Disk and mount it at `/opt/render/project/src/backend/data` (adjust the mount path to the actual service path shown by Render), or integrate durable object storage.

## Security
Never commit `.env` or paste your API key into frontend files. Configure `GEMINI_API_KEY` in Render → Environment.

## Generated website data structure
Every generated website is stored in its own folder:

```text
backend/data/generated/<project-id>/
├── project.json       # Internal project metadata (not included in ZIP downloads)
├── index.html         # Main page
├── *.html             # Additional pages, when generated
├── style.css          # Website styling and shared theme
├── script.js          # Website interactions, when generated
└── assets/            # Uploaded and editor-replaced images
```

The editor saves page HTML and shared colour changes to this project folder. Download ZIP exports the website files and assets, ready to upload to a hosting provider.

## Publish a generated website with GitHub Pages
1. In the editor, choose **⋮ → Download website ZIP**.
2. Create a new repository at <https://github.com/new>.
3. Extract the ZIP and upload its contents to the repository root. Ensure `index.html` is at the root.
4. In the repository, open **Settings → Pages** and select **Deploy from a branch**, branch `main`, folder `/ (root)`, then save.
5. GitHub displays the public Pages URL after deployment finishes.

The editor's GitHub option opens the new-repository page. Automatic publishing is not enabled; it would require an explicit GitHub OAuth/app integration and permission to publish to an account.

## Mobile / desktop editor
The editor adapts to phone, tablet and desktop widths. On narrow screens the editing panel starts closed to give the live website the full available width; use the menu/panel button to open editing controls. The three-dot menu includes full-screen preview, project structure, GitHub publishing guidance and ZIP download.
