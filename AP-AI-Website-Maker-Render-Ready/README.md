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
