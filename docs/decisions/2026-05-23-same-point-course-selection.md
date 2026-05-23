# Same-Point Course Selection

## Context

Route master Pi verification confirmed that `rt_dk_pass_3lap` exists in the seed, but normal course selection cannot resolve to that route.

When the user selects the same map point for start and destination, `course_selection.py` returns `kind=course` directly. For example, `mp_dk_pass -> mp_dk_pass` resolves to course `dk_pass`, not route `rt_dk_pass_3lap`.

## Decision

Keep same-point selection as `kind=course`.

Keep `rt_dk_pass_3lap` in the seed for now as a compatibility and fixture route, but do not treat it as part of the normal Playing UI flow.

## Reason

For the user-facing flow, same-point selection means a normal 3-lap course. Returning the course keeps the UI simpler and avoids representing ordinary course play as a special route.

The fixture route still has value for tests, seed coverage, and possible future direct route selection or route-detail UI, but it should not drive the current course selection behavior.

## Constraints

- Do not change `POST /api/v1/course-selection/resolve` to return `rt_dk_pass_3lap` for same-point selections without an explicit UI/design change.
- Do not remove `rt_dk_pass_3lap` until tests and any future route-detail assumptions are reviewed.
- Route records from the normal Playing UI may legitimately have `route_id = null` and `course_id` set when the selection is same-point.

