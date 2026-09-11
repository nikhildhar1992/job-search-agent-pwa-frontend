# Job Search Agent — PWA Frontend

An installable Progressive Web App that lets you search for jobs across multiple platforms using natural-language prompts (or voice), with results automatically scored against a candidate's resume profile.

This is the **frontend** half of the project. The companion API lives in a sibling repo: `job-search-agent-pwa-backend`.

## What this app does

1. You open the app and land on a **Dashboard** with demo videos of the tool in action.
2. You go to **Search Job**, which is password-gated (a shared secret checked against the backend).
3. You choose a job platform (Naukri Gulf, GulfTalent, Greenhouse, Lever, Ashby, Workable, or "All"), how many results you want, and optionally type — or **record your voice** — a free-text prompt describing what you're looking for (e.g. "remote senior backend roles in the UAE paying above X").
4. The request goes to the backend, which uses OpenAI to turn your prompt into structured search criteria, fetches jobs (via Playwright scraping or the platform's public API), scores each job against a resume profile, and returns a ranked list.
5. Results are shown as cards (title, company, location, salary, posted date, match score, tags, link to apply), with a staged "progress" animation while the search runs.

## Tech stack

- **React 19** + **TypeScript** + **Vite 7**
- `react-router-dom` 7 for routing
- `vite-plugin-pwa` (Workbox) for installability, a service worker, and an app manifest
- No CSS framework — plain CSS in `src/index.css`

## Project structure

```
src/
  api/          fetch wrappers: jobSearch, transcribe, access (password gate)
  components/   PasswordGate, ProtectedSearchPage
  hooks/        useSearchAccess (session-based access state)
  layout/       AppLayout (top nav + routed content)
  pages/        DashboardPage, JobSearchPage
public/         PWA icons, favicon, demo videos
```

### Routes

| Path      | Page               | Notes                                    |
|-----------|--------------------|-------------------------------------------|
| `/`       | `DashboardPage`    | Demo video gallery                        |
| `/search` | `JobSearchPage`    | Behind `ProtectedSearchPage` (password gate, session-only) |
| `*`       | —                  | Redirects to `/`                          |

## Talking to the backend

The frontend calls three backend endpoints, all relative to `VITE_API_URL`:

- `POST /api/access/verify` — checks the shared search password
- `POST /api/job-search` — runs a search (`platform`, `count`, optional `prompt`, `excludeSeen`)
- `POST /api/transcribe` — uploads recorded audio, returns a transcript plus a guessed platform/country

If `VITE_API_URL` is not set, requests are made to relative paths, which works with the dev proxy (see below) or when the frontend and backend are served from the same origin in production.

## Voice search

The search page includes a "record" option that uses `MediaRecorder`/`getUserMedia` to capture audio (webm/opus), uploads it to `/api/transcribe` on stop, and then auto-runs a search using the platform/country detected from the transcript.

## Running locally

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:3000` and proxies `/api/*` requests to the deployed backend (`https://api.jobsearchagent.koshurwaan.in`, configured in `vite.config.ts`). To point at a local backend instead, run the backend on `http://localhost:4000` and either:

- update the proxy target in `vite.config.ts`, or
- set `VITE_API_URL=http://localhost:4000` in a `.env` file and call the API directly (bypassing the proxy).

### Environment variables

| Variable       | Purpose                                   | Default                          |
|----------------|--------------------------------------------|-----------------------------------|
| `VITE_API_URL` | Base URL for backend API calls             | unset → relative paths (dev proxy) |

### Build

```bash
npm run build    # type-checks (tsc -b) then builds with Vite
npm run preview  # serves the production build locally
```

## PWA

The app is installable: it ships a web app manifest (name, theme color, icons) and a Workbox-generated service worker (`vite-plugin-pwa`, `registerType: "autoUpdate"`) that precaches the app shell for offline loading of the UI itself. API responses (job search results, transcription) are not cached offline — a network connection is required to actually search for jobs.

## The backend, briefly

For full backend details see the `job-search-agent-pwa-backend` repo. In short, it's a **Fastify + TypeScript** API that:

- Uses **OpenAI** (chat completion) to convert a free-text prompt into structured search criteria, and **Whisper** to transcribe voice recordings, with heuristic fallbacks if no API key is configured
- Fetches jobs by either scraping with **Playwright** (Naukri Gulf, GulfTalent — no public APIs available) or calling public ATS APIs (**Greenhouse, Lever, Ashby, Workable**) for a configured list of companies
- Scores and ranks results against a static resume profile (`resume-profile.json`) using weighted keyword/skill/location/salary matching
- Has no database — persistence (seen-jobs tracking, resume profile, company lists) is flat JSON files on disk
- Gates the search feature behind a shared password (`JOBPASSWORD`)
