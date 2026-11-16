# ADITYA — THE CREATOR

A cinematic, streaming-inspired portfolio for **Aditya Kumar Ratre**: Founder, Developer, Digital Marketer, Creator and Entrepreneur.
Every section is an episode, every project is an Original, and the whole site plays like a series.

> A personal portfolio with a fictional streaming-platform look. It is not affiliated with Netflix or any other streaming service and uses none of their logos.

## Run it locally

Requires **Node.js 18+**.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

Production build:

```bash
npm run build
npm run preview
```

The static site is written to `dist/` and can be deployed as-is to Vercel, Netlify, GitHub Pages or any static host.

## Updating the content

Bundled fallback content lives in [`src/data/portfolio.ts`](src/data/portfolio.ts). Once the CMS is connected, the public website loads the latest published content from Supabase. Use the private admin workspace to update profile, education, experience, projects, achievements, certifications, skills, highlights, navigation, visibility and SEO without editing source code.

| To change… | Edit |
| --- | --- |
| Name, intro, email, LinkedIn, GitHub | `profile` |
| A project, or a new one | `projects` (add an object; it appears in Originals, the overlay, the resume sheet and the counts) |
| Achievements / certifications | `achievements`, `certifications` |
| Skills and their "where it's used" notes | `skillCategories`, `skillEvidence` |
| Seasons and episodes (My Journey) | `seasons` |
| Top 10 row | `topPicks` |
| ▶ Play Intro highlight reel | `introSlides` |
| Profile order (Recruiter / Developer / Creative) | `viewerProfiles` |
| Opening studio card text | `profile.originalLabel` |

**Resume:** replace `public/assets/Aditya_Ratre_Resume.pdf`.

**Photo:** replace `pic1.jpeg` (high-res photo), `pic.png`, and `public/assets/portrait-cutout.webp` (transparent cutout used in the About section), then run:

```bash
npm run images
```

This rebuilds the responsive WebP portraits and the social share image in `public/assets/`.

## What's inside

```
src/
  data/portfolio.ts        ← single source of truth (from the resume)
  App.tsx                  ← stages: opening → profile select → home; overlays
  components/
    OpeningSequence        ← black → studio card → ADITYA → THE SERIES → portrait → ▶ PLAY
    ProfileSelector        ← "Who's watching?" (changes section order only)
    Navbar                 ← hide-on-scroll nav, profile switcher, mobile menu
    Hero                   ← billboard: parallax portrait, particles, light streaks, floating chips
    PlayIntro              ← ▶ Play Intro: zoom into portrait → highlight reel (pause, ← →, tap zones)
    ContinueWatching       ← cards with real "watched" progress bars
    About                  ← The Pilot
    Seasons / EpisodeCard  ← My Journey as seasons and episodes
    Originals / ProjectCard← pinned horizontal sequence on desktop, swipe rail on touch
    ProjectModal           ← full-screen project overlay with a shared-element transition
    TopPicks               ← Top 10-style row
    Skills                 ← skill genres; each card shows where the skill appears
    Achievements           ← award-poster cards + certification rail (links to credentials)
    ResumeViewer/ResumeModal ← designed resume sheet, PDF viewer, download
    FinalCTA               ← TO BE CONTINUED… + contact links
    CustomCursor, fx.tsx   ← cursor states, magnetic buttons, 3D tilt, text reveals, particles
  hooks/                   ← Lenis smooth scroll + scroll lock, media queries, watch progress
scripts/build-images.mjs   ← portrait/share-image pipeline (sharp)
```

**Stack:** React 18, TypeScript, Vite 6, Tailwind CSS 4, Framer Motion 11, Lenis.

## Accessibility and performance

- `prefers-reduced-motion` is respected: smooth scroll, the custom cursor, tilt, particles, grain and the pinned horizontal scroll turn off, and the opening jumps straight to its final frame.
- Hover effects only run on devices with a precise pointer. Touch devices get tap interactions and native swipe rails.
- The custom cursor appears only with a mouse or trackpad.
- Overlays close with Esc, and the highlight reel supports Space and the ← → keys.
- Portraits are responsive WebP files (25–90 KB). Overlays are code-split, and particles pause when they're off screen.

## Keyboard shortcuts

- **Opening:** Enter or Esc skips it.
- **Play Intro:** Space pauses, ← and → change slides, Esc closes.
- **Project and resume overlays:** Esc closes.

### Cinematic audio
The site includes original synthesized audio assets in `public/assets/audio/`: `intro.mp3`, `ambient.mp3`, `transition.mp3`, and `success.mp3`. The opening sound and ambient loop start after the visitor clicks PLAY or SKIP INTRO, respecting browser autoplay rules. No floating sound/FX controls are shown, and no Netflix audio or soundtrack is included.


## Secure admin and CMS setup

The admin workspace is available at:

`/_private-console-8a4f2d`

It is intentionally not linked from the public navigation. A hidden URL is not the security boundary: access is enforced by Supabase Auth and PostgreSQL Row Level Security (RLS). Only a user whose UUID is explicitly listed in `public.portfolio_admins` can publish edits.

### 1. Create a dedicated Supabase project

Create a separate project for this portfolio (do not reuse another app's database). Open the Supabase SQL Editor and run:

`supabase/migrations/202611160001_portfolio_cms.sql`

The migration creates the portfolio content table, admin allowlist, and RLS policies. Visitors can read published portfolio content; only allowlisted authenticated admins can insert or update it.

### 2. Create your private admin login

In Supabase Dashboard → Authentication → Users, create the email/password user you will use for the admin panel. Keep public sign-ups disabled.

Then run this in the SQL Editor, replacing the email with your own admin email:

```sql
insert into public.portfolio_admins (user_id)
select id
from auth.users
where email = 'YOUR_ADMIN_EMAIL'
on conflict (user_id) do nothing;
```

Do not add any other user's ID. The panel checks the authenticated user's ID against this table; it does not trust editable profile metadata.

### 3. Configure the deployment

Copy `.env.example` to your deployment environment. Set these values using the project URL and **publishable** key from Supabase → Connect:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Set both `VITE_SITE_URL` and `SITE_URL` to the real public portfolio origin (for example, your actual HTTPS domain, with no trailing slash). Never put a Supabase secret or service-role key in a `VITE_*` variable.

Redeploy the site after setting environment variables. Then open `/_private-console-8a4f2d`, sign in with the allowlisted account, edit content and select **Save changes**.

### 4. SEO publishing

The admin SEO section edits the page title, description, target topics, canonical URL, social image and indexing preference. The public app applies these values to document metadata and emits Person, WebSite and ProfilePage JSON-LD.

The production build also generates `robots.txt` and (when `SITE_URL` is set) a one-page `sitemap.xml`. Add the site to Google Search Console, verify the domain, and submit `https://YOUR_DOMAIN/sitemap.xml`. Search visibility and ranking are determined by search engines; no metadata change can guarantee a first-place result. Build useful, accurate content and earn relevant third-party mentions over time.

**Deployment note:** if you change the canonical domain or the static social-preview defaults, redeploy after changing environment settings. Some social preview crawlers read only the initial HTML and do not execute the app's JavaScript.

### Security notes

- The browser only uses the Supabase publishable key; all write access is enforced by RLS.
- Admin sessions are held in session storage and can be ended with Sign out.
- No admin link is exposed in the public UI; `robots.txt` discourages crawlers from the admin path. Robots rules are not authentication.
- Do not commit `.env` files or expose a service-role/secret key.
