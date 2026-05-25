Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require source edits, stop and ask before editing.

## Goal

Verify the visual map annotation placement UI on the Raspberry Pi deployed environment.

This is a verification-only handoff for commit `93117bd` (`Add visual annotation placement`) and later images that include it.

## Background

The previous implementation added an interactive placement surface to `frontend/src/AnnotationEditor.tsx`.

Expected behavior:

- Courses -> Notes/Annotations now has a visual surface before the annotation create form.
- Route targets try `/assets/routes/<route_id>.png`.
- Course targets try `/assets/maps/world.png`.
- If the image is missing, the UI should fall back to a neutral normalized surface with no broken image icon.
- Clicking/tapping the surface sets pending create X/Y and moves the numeric fields.
- Existing annotation markers can be clicked to enter edit mode.
- Dragging an editing marker updates edit X/Y locally; Save commits, Cancel discards.

Local browser verification was blocked because the local backend was not running. Typecheck and build already passed.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/handoffs/README.md`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/NotesView.tsx`
- `frontend/src/App.css`
- `frontend/public/assets/routes/`
- `frontend/public/assets/maps/`

## Files To Edit

None. This is verification-only.

If a source change appears necessary, stop and report the issue instead of editing.

## Constraints

- Do not edit source files.
- Do not commit screenshots or temporary files.
- Do not delete existing notes or annotations unless they were created only for this verification.
- It is acceptable to create temporary test notes/annotations through the UI or API, but clean up verification annotations after testing when possible.
- If using Portainer API redeploy, preserve all stack environment values:
  - `DATA_DIR`
  - `POSTGRES_DB`
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`
  - `FRONTEND_PORT=3030`
  - `BACKEND_PORT=8001`
- The Pi host ports must remain frontend `3030` and backend `8001`.
- Do not change Portainer stack YAML semantics beyond pulling/redeploying the latest images.

## Verification

### 1. Deployment / Image Sanity

Confirm the deployed frontend includes the visual annotation placement implementation.

Recommended checks:

- `mkw-postgres`, `mkw-backend`, `mkw-frontend` are up.
- `GET http://192.168.1.205:8001/api/v1/health` returns OK.
- `GET http://192.168.1.205:3030/api/v1/health` returns OK through the frontend proxy.
- The frontend bundle contains a new annotation surface class such as `ann__surface-wrap` or `ann__marker-btn`.

If the deployed image is old:

- Pull/redeploy through Portainer with `pullImage: true`.
- Preserve the six environment values listed above.
- Re-check the bundle.

### 2. Courses View Smoke

Open `http://192.168.1.205:3030`.

Verify:

- Courses view loads without a blank screen.
- Notes and map annotations section loads.
- Target selector works for course and route targets.
- Browser console has no JavaScript/React errors.

### 3. Course Target Fallback Surface

Select a course target.

Verify:

- A visual placement surface appears before the annotation create form.
- If `/assets/maps/world.png` is not present, the fallback surface appears cleanly.
- No broken image icon is visible.
- No React/JS console error is emitted.
- Click/tap the surface.
- X and Y numeric fields update to normalized values between `0` and `1`.
- A pending create marker appears and moves if X/Y are manually changed.

Create a temporary course annotation if needed:

- Use a clear label such as `Pi検証 annotation course`.
- Confirm the created annotation appears in the list and as a marker on the surface.

### 4. Route Target Image / Fallback Surface

Select a route target that has a local route image if available, for example:

- `rt_mario_bros_circuit_to_crown_city`

Verify:

- The surface uses the route image as a background when the asset exists.
- Click/tap updates X/Y and shows pending marker.
- Create a temporary route annotation if needed.
- Marker appears on top of the image.

Then select a route target without a local image.

Verify:

- Fallback surface appears cleanly.
- No broken UI or JS/React console error.

### 5. Edit / Drag / Cancel

Using a positioned annotation:

- Click its marker.
- Confirm the annotation enters edit mode.
- Drag the marker.
- Confirm edit X/Y fields update while editing.
- Click Cancel.
- Confirm unsaved drag movement is discarded.
- Re-enter edit mode, drag again, Save.
- Confirm the marker persists at the new position after target reselect or page reload.

### 6. Delete / Cleanup

Verify existing delete behavior still works.

Delete temporary verification annotations created during this handoff when possible.

Report any remaining verification data by ID, target, and label.

### 7. Responsive / Console

At 375px viewport:

- Courses view has no horizontal overflow.
- Surface, markers, form fields, and list remain usable.
- Marker labels do not force the page wider than the viewport.

Check browser console:

- JavaScript/React errors: 0 expected.
- Network 404 for missing image assets is acceptable only if handled by fallback and not surfaced as broken UI.

## Expected Report

- Changed files: should be `None`
- GHCR / Portainer deploy state
- API sanity results
- Course fallback surface result
- Route image-backed surface result
- Route fallback surface result
- Click-to-place result
- Drag-to-edit / cancel / save result
- Cleanup result and any residual test data
- 375px responsive result
- Console errors
- Blocked checks
- Bugs found
- Design questions for Codex
