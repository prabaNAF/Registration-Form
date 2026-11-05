# GitHub Pages deployment

The student-facing website is published from `docs/` in `prabaNAF/Registration-Form`. GitHub Pages serves the HTML, CSS, JavaScript and college QR codes. The existing NAF backend continues to enforce college, competition, topic, duplicate and deadline restrictions in one centralized D1 database. The secure administrator dashboard stays on that backend.

## One-time Pages activation

In the repository, open **Settings → Pages**. Under **Build and deployment**, select **Deploy from a branch**, then **main**, **/docs**, and **Save**. GitHub publishes the committed files without a build or credentials in the browser.

Expected portal address after activation: `https://prabanaf.github.io/Registration-Form/`.

- SRM: `/Registration-Form/register/srm/`
- VIT: `/Registration-Form/register/vit/`
- Adhiparashakthi Agricultural College: `/Registration-Form/register/aac/`

High-resolution college QR images and SVG artwork are in `docs/qr/`. Use these for GitHub-hosted links. The original backend portal's QR codes in `public/qr/` retain their original links.

## Rebuild student pages

Use the pinned pnpm version in `package.json` to install dependencies, then run:

```sh
node scripts/build-github-pages.mjs
python scripts/generate-college-qr.py --origin https://prabanaf.github.io/Registration-Form --output docs/qr
```

Commit `docs/` after rebuilding. The existing public backend must keep `PUBLIC_REGISTRATION_ORIGINS=https://prabanaf.github.io`. No production secrets, database contents, student contacts or local test databases are included in this repository.

## Registration security and backend checks

Only the exact approved GitHub origin can read public registration responses through CORS. Student acknowledgement uses an origin-bound, college-bound HMAC context retained only in browser memory. Third-party cookies are not required. Admin routes do not allow cross-origin access. Reloading a page requires acknowledging instructions again. All final capacity checks, duplicate checks and the 16 November 2026, 5:00 PM IST deadline remain in the server-side atomic database write.

```sh
node scripts/test-registration.mjs
node scripts/test-github-pages-api.mjs
python scripts/test-atomic-capacity.py
```

Changes to backend code still require publishing the backend through Sites; uploading code to GitHub does not run a server or migrate the database.
