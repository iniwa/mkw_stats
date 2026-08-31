# Runtime database status and build identity

Status: implementation, independent review, and local verification complete; production application and smoke verification remain deferred to the user-owned Portainer update. Initial route: `adaptive` (API failure handling and build-to-runtime metadata across the existing two images).

## Goal and approved scope

The user approved improvements 2 and 3: make a database connection failure visible in the header and show the running commit/build timestamp in Settings. Preserve the existing liveness endpoint and all recording/settings behavior. This is one operational-information slice; backup/restore, Records fixes, CI test gates, and old documentation-policy cleanup are out of scope.

## Contract

- Preserve `GET /api/v1/health` and its exact existing 200 response; it remains process liveness, not database readiness.
- Add `GET /api/v1/ready`: use the existing read-only SQLAlchemy database dependency to execute `SELECT 1`. Return 200 with `{status: "ok", service: "mkw-stats-backend", database: "ok"}` on success, and 503 with `{status: "error", service: "mkw-stats-backend", database: "error"}` on a database exception. Never return or log connection strings, exception detail, credentials, or user data. Release the request session without writes; leave the application's engine/pool and recording transactions unchanged.
- Add DB-independent `GET /api/v1/version` with `{commit: string | null, built_at: string | null}`. Read only the public `APP_COMMIT_SHA` and `APP_BUILD_TIMESTAMP` build values. Missing/blank/unknown metadata is null, never invented. Both new endpoints and their frontend reads must avoid caching.
- Replace the header's one-shot liveness-only check with a readiness check at mount and roughly every 30 seconds (one check at a time). Bound the frontend wait (about 5 seconds), clean up requests/timers on unmount, and prevent obsolete responses from changing current state. Clearly distinguish healthy backend+DB, DB unavailable (the recognized 503 body), and failed/unknown API status. Errors and timeout must not leave a green indicator. Exclude OBS overlay and styleguide from polling. A small manual recheck control is appropriate.
- Settings gets a small, read-only running-version card showing frontend and backend separately. Frontend identity must be baked into the loaded JS bundle (public Vite env values); do not reuse the backend commit as the frontend identity. Backend version loading must be independent of account/settings loading so a DB outage does not hide version information. Provide an explicit unknown/unavailable state, include the year and timezone for build dates, and avoid overflow at 375px. If both known commits differ, explain the differing versions without changing either service.
- Build metadata uses existing GH Actions metadata: `APP_COMMIT_SHA=${{ github.sha }}` and `APP_BUILD_TIMESTAMP=${{ fromJSON(steps.meta.outputs.json).labels['org.opencontainers.image.created'] }}` as Docker build args for BOTH matrix services. Pass existing `steps.meta.outputs.labels` to the build/push step. Preserve action versions, triggers, image names, tags, credentials, platforms and publication/deployment flow.
- Backend Dockerfile persists those public build args for `/version`; frontend Dockerfile passes them into Vite as `VITE_APP_COMMIT_SHA` and `VITE_APP_BUILD_TIMESTAMP` at build time. No Portainer env edits or runtime Git/network lookup. Local builds without metadata remain explicitly unknown.

## Writer ownership

One adaptive implementer owns the source candidate and directly relevant regression checks:

- `backend/app/main.py`; a tiny new backend module only if it makes this slice clearer.
- `backend/tests/test_api.py` or a focused `backend/tests/test_system_status.py` for readiness and version compatibility.
- `frontend/src/App.tsx`, `frontend/src/SettingsView.tsx`, `frontend/src/api.ts`, and small purpose-specific status/build components or helpers if useful.
- `frontend/src/App.css` limited to affected status/version presentation; `frontend/src/vite-env.d.ts` for public Vite env typing if needed.
- `backend/Dockerfile`, `frontend/Dockerfile`, `.github/workflows/docker-publish.yml` limited to the metadata handoff above.

The primary owns this handoff, living documentation, dependency setup for local verification, independent review, browser verification, and any Git/publication actions. Do not edit primary-owned docs or run commit/push/deployment as the writer.

## Inspect and constraints

Read `AGENTS.md`, `CLAUDE.md`, current `App.tsx`, `SettingsView.tsx`, `api.ts`, `core/database.py`, `tests/conftest.py`, the existing liveness test, Dockerfiles/workflow, `docs/design/deployment.md`, relevant operations/settings/metadata decisions, and this contract.

You are not alone. Pre-existing root `AGENTS.md` and `README.md` modifications have unknown authorship; preserve them. No schema/migrations/seed, protected data/settings, production access, dependencies or lockfile changes, new external exposure, credentials, registry changes, or unrelated cleanup. Do not change business recording semantics or global database timeouts/pool behavior. Current local Docker daemon is unavailable; primary is preparing an ignored Python environment for focused tests. Ask the primary about material contract issues instead of expanding the slice.

## Acceptance and verification

1. Existing liveness test passes unchanged. Meaningful focused backend coverage proves readiness success, sanitized DB failure (including no exception text in response), and version availability without DB access. Cover explicit build values and missing values; reuse existing pytest/TestClient fixtures.
2. Frontend typecheck, existing tests, and production build pass. Do not add a UI testing framework or superficial implementation-mirroring tests.
3. Primary browser checks healthy status, DB failure, request failure/timeout, retry/recovery, and build-card loaded/unknown/mismatched values at desktop and 375px using only local/synthetic data. No production writes or induced production outages.
4. Build args and metadata must reach both final runtime artifacts. Verify as far as available local tools permit, and explicitly report any actual container/publication check still pending.
5. Finish self-review and return a stable candidate, exact files/commands/results and any limitations. No changes after final independent review begins without re-establishing acceptance.

## Completion / deferred verification

The first stable source candidate passed the existing tests. Independent review identified readiness-response classification and explicit timeout cleanup issues; the implementer corrected them in one round and added focused response-contract tests. The final focused independent review found no blocking issues.

Contract reset for final visual acceptance: the 375px screenshot showed the new header status and retry label wrapping into narrow columns. API, metadata, and polling behavior are accepted and stay frozen. The primary now owns a small header-only CSS layout correction and repeats the affected browser/production-build check; no implementation rediscovery or additional subsystem work is authorized by this reset.

The final header CSS passed a production build and browser checks at 320, 375, 480, 512, and 1280px, including the longest failure label. Status and retry text remain readable without horizontal page overflow. No further source correction is pending.

Verification completed:

- Implementer: `.venv/Scripts/python.exe -m pytest`, run from `backend`, passed (177 tests).
- Primary: `.venv/Scripts/python.exe -m pytest tests/test_system_status.py tests/test_api.py::test_health_still_ok -q`, run from `backend`, passed (5 tests). Existing liveness response, readiness, and DB-independent version behavior are covered.
- Implementer and independent reviewer: frontend `npm run typecheck`, `npm test -- --run` (15 tests), and `npm run build` passed. The final CSS-only change was built and visually checked again by the primary.
- Local real API checks used an in-memory SQLite database for successful connectivity and an unused loopback PostgreSQL port for connection failure. Liveness stayed 200, readiness returned sanitized 503, and version stayed available without the DB. No schema, persistent data, or production runtime was touched.
- Browser checks on the production frontend build covered healthy/DB-unavailable/unknown states, malformed and proxy responses, request failure, a roughly 5-second timeout, ignored late responses, manual recovery, and automatic 30-second polling. The automatic poll observed the induced local DB failure and recovery succeeded. No mutating API requests or JavaScript page errors occurred; induced network failures produced expected browser network errors.
- Build-card checks covered separately baked frontend metadata, backend metadata, unknown and unavailable values, mismatched commits, and backend identity loading while DB-backed settings failed. All values were synthetic and dates included year and Japan timezone.

Release and runtime follow-up:

- The local Docker daemon was unavailable. Actual arm64 image/config verification follows the authorized commit/push through the existing mirror and GHCR workflow; the source revision and publication result are reported in the conversation.
- Portainer operation remains user-owned per the conversation. No production deployment is performed by this handoff. No migrations, seeds, stack environment changes, or service identity changes are required.
- After the user updates both images, confirm the unchanged liveness response, successful readiness, and Settings frontend/backend identities for the published revision after a browser hard reload. Archive this handoff only after that production smoke check is complete.
- Pre-existing root `AGENTS.md` and `README.md` edits are excluded from this change.
