# AP AI Website Maker — stage audit

This checklist describes what is present in this codebase and what still needs an external service or a real API-key test.

| Stage | Status | What is included |
|---|---|---|
| 1. App foundation | Implemented | Node/Express server, project storage, API routes, static preview and Gemini service |
| 2. Website brief form | Implemented | Business details, contact details, image upload previews, website types, themes, brand colour, font, page selection and extra instructions |
| 3. AI website generation | Implemented; API-key test required | Gemini prompt/parser creates a multi-page HTML/CSS/JS website. A valid personal Gemini API key and internet connection are required to verify a real generation run |
| 4. Visual editor | Implemented | Edit text, replace images, change colours, add/move/duplicate/delete sections, undo/redo and desktop/tablet/mobile preview |
| 5. Save and export | Implemented | Saved project list, reopen/edit, delete and download generated website ZIP |
| 6. SEO and professional polish | Implemented in the builder brief | SEO title/description/keywords, language, audience, content tone, CTA, requested features, responsive/accessibility instructions and AP logo |

## Still needed for a production business platform

These are not silently marked as complete because they require additional infrastructure:
- Publish/hosting integration and a custom domain
- Real e-commerce checkout, payment gateway, orders and inventory database
- User accounts, authentication and cloud project storage
- Working appointment/booking backend or contact-form delivery service
- Automated website testing, backups, monitoring and production security hardening
- Google Search Console setup after a site is published

The AI prompt now tells the generator not to pretend that backend-only features (payments, accounts, bookings, databases) are live when they have not been connected.

## Checks performed on this package

- Node syntax checks passed for `server.js`, `services/gemini.js`, `public/script.js` and `public/editor.js`.
- Local server health endpoint returned HTTP 200.
- Homepage returned HTTP 200 and included the SEO/features form section.
- Empty generation form correctly returned HTTP 400 with a validation message.
- A real Gemini generation was not run as part of this package check. Add your own key to `.env` and run a test website generation from the browser.
