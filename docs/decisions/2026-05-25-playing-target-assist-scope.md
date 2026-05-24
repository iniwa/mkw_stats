# Playing Target Assist Scope

## Context

Playing is now the primary race-recording flow. Course and route masters, route metadata, notes, and map annotations are implemented and verified on the Raspberry Pi deployment.

The current Playing view shows route metadata during route confirmation, but it does not surface user-authored notes or annotations for the selected course/route. Users must switch to Courses to check reminders, which is inefficient while recording races.

## Decision

Add a small read-only "target assist" panel to Playing using existing APIs:

- course/route notes from `GET /api/v1/notes`
- map annotations from `GET /api/v1/map-annotations`

Show the panel for the target currently being confirmed or recorded:

- course selection confirmation
- ranked draft result input

For Lounge, route/course warnings and sidebar history remain unchanged; target assist should not block recording.

## Reason

The useful next step is to make existing course/route knowledge available at the point of recording, without adding backend scope or changing the data model.

## Constraints

- Frontend-only slice.
- Do not add backend endpoints or DB migrations.
- Do not edit note or annotation data from Playing.
- Do not add map images or route drawing.
- Fetch only the relevant target's notes/annotations rather than loading all notes for every selection.
- Pinned and higher-priority notes should appear first.
- Missing notes/annotations should render a compact empty state, not a blank panel.
- API errors should be visible but should not prevent recording.
