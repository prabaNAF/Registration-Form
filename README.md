# Registration-Form

# National Agro Foundation — World Soil Day 2026

A central D1-backed registration system for SRM Institute of Science and Technology (SRM), Vellore Institute of Technology (VIT), and Anna University (AU). Event: 5 December 2026. Theme: “Tackle soil compaction, boost food production.”

## Public college links

- `/register/srm`
- `/register/vit`
- `/register/au`

Each server route fixes its college. Every member's college name is locked in the form and validated against the route server-side. No university selector is offered. Each page requires the full registration instructions to be acknowledged before its form is accessible. An HttpOnly, signed college-specific cookie proves acknowledgement to the API. Changing a body field, cookie payload, signature or college context cannot move an entry to another college. These public links enforce registration scope; student eligibility is confirmed in the registration declaration, without an external campus SSO provider.

## Fixed capacity and deadline rules

Every college has 25 Essay places, 15 PPT teams, and 25 Poster places. PPT accepts 2–3 students per team and exactly one of five supplied topics. Each topic accepts three teams per college. Total capacity: 75 Essay, 45 PPT teams, 75 Poster.

The common deadline is **16 November 2026, 5:00 PM IST**, which is `2026-11-16T11:30:00Z`. All new registrations close at that instant, regardless of remaining places or manual controls. The countdown uses a server-clock snapshot. The final atomic insert checks the database clock, so a request that crosses the cutoff while being submitted is rejected. No scheduled job or open browser is required for closure.

`lib/registration-sql.ts` checks the college's total count, its topic count, every member's normalized email/mobile, normalized team name, configured opening switches, poster choices and the deadline in one SQLite write statement. All member details and instructions acknowledgement are stored in the same inserted record. Request UUIDs and a server-generated payload fingerprint make repeated or simultaneous identical requests idempotent.

Duplicate contacts are restricted within the same college and competition. Duplicate normalized PPT team names are also blocked within that college. Cancelling an entry releases only its own college's capacity, topic slot and contacts. A different college or competition may accept the same student separately, subject to its own eligibility and limits.

## Organizer access and reports

`/admin` uses Sites-managed ChatGPT authentication and the existing server-only `ADMIN_EMAILS` allowlist. Every data, export and mutation API authorizes the visitor on the server. No student sign-in is required. The dashboard displays consolidated and per-college counts, remaining places, closure reasons, per-college PPT topics, student/team details, and a historical-record review view. Global and college-specific manual controls cannot extend the hard deadline.

Excel (.xlsx) and UTF-8 CSV exports respect college, competition, status and search filters, with one row per team member. Excel includes College Overview, Student Registrations, PPT Topic Availability and Report Information sheets. User values are stored as text in XLSX and formula-like CSV values are escaped. Faculty email and degree/programme fields are included. Successful submission produces an on-screen, printable and downloadable confirmation with a unique ID. No automatic email provider is configured.

## Existing records and migrations

The nullable `college_id` column is added by the second schema migration. Existing SRM/VIT aliases remain recognized and their bookings count against the corresponding new college limits. Prior Annamalai University records remain historical; Annamalai is not silently renamed to Anna University. Records created under earlier rules remain intact and are marked for organizer review, including single-member PPT teams and missing newly required contact fields. Organizers can cancel invalid entries; no automated deletion or relabeling is performed.

## Runtime configuration

Set these through Sites environment settings. Do not place production values in source or the hosting manifest:

- `ADMIN_EMAILS`: authorized organizer emails.
- `PUBLIC_SITE_URL`: canonical published origin.
- `REGISTRATION_CONTEXT_SECRET`: at least 32 random characters, used only server-side to sign college instruction contexts.

## Checks

Follow the Sites skill for builds, source synchronization, preview and publication. Use `npm run db:generate` for schema migrations and inspect the generated SQL. Apply pending migrations only to local D1 for preview testing; Sites applies hosted migrations during deployment. Never reset the production database for tests.

Run `node scripts/test-registration.mjs`, then `python3 scripts/test-atomic-capacity.py`. The first invokes the actual API handlers in an isolated SQLite harness, including signed cookies, college tampering, independent capacities, duplicates, report privacy, cancellations, exact deadline boundaries, and a request crossing the cutoff. The Python check uses many independent concurrent database connections against the exact production SQL. The harness's controlled clock and identity exist only in test scripts; no test API is deployed.

QR artwork is generated by `python3 scripts/generate-college-qr.py` and independently decoded in QA. The PNGs are 2450 × 2450 at 300 DPI; SVG artwork is scalable. Each QR contains its public college URL, never student details or authentication tokens. Public downloads are in `/qr/`, including a ZIP of all three QR codes and circulation links.

## GitHub Pages

A GitHub Pages deployment is prepared in `docs/`. See [GITHUB_DEPLOYMENT.md](GITHUB_DEPLOYMENT.md) for the one-time Pages activation, rebuild steps, student URLs and backend integration. Student pages use the existing central registration database; production credentials and student records are excluded from Git.
