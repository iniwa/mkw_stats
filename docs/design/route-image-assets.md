# Route Image Assets

## Path Convention

```text
frontend/public/assets/routes/<route_id>.png
```

Runtime URL: `/assets/routes/<route_id>.png`

## Source Note

Images are sourced from approved reference page URLs stored in `backend/app/seed/initial_data.py` under `route.tags.image_url`.

- Approved reference page: `https://japan-mk.blog.jp/mkworld.info-1/route.html`
- Actual image URLs: `https://mario.wiki.gallery/images/...` (referenced by the approved page)
- Assets are stored locally. Do not hotlink at runtime.
- Acquisition script: `scripts/download_route_images.py` (run from repository root)

## Routes With image_url Metadata

11 routes currently have `image_url` in seed metadata. All 11 images are present.

| route_id | Local file | Status |
|----------|-----------|--------|
| `rt_mario_bros_circuit_to_crown_city` | `rt_mario_bros_circuit_to_crown_city.png` | present |
| `rt_mario_bros_circuit_to_whistlestop_summit` | `rt_mario_bros_circuit_to_whistlestop_summit.png` | present |
| `rt_crown_city_to_mario_bros_circuit` | `rt_crown_city_to_mario_bros_circuit.png` | present |
| `rt_crown_city_to_whistlestop_summit` | `rt_crown_city_to_whistlestop_summit.png` | present |
| `rt_crown_city_to_dk_spaceport` | `rt_crown_city_to_dk_spaceport.png` | present |
| `rt_whistlestop_summit_to_mario_bros_circuit` | `rt_whistlestop_summit_to_mario_bros_circuit.png` | present |
| `rt_whistlestop_summit_to_crown_city` | `rt_whistlestop_summit_to_crown_city.png` | present |
| `rt_whistlestop_summit_to_dk_spaceport` | `rt_whistlestop_summit_to_dk_spaceport.png` | present |
| `rt_dk_spaceport_to_mario_bros_circuit` | `rt_dk_spaceport_to_mario_bros_circuit.png` | present |
| `rt_dk_spaceport_to_crown_city` | `rt_dk_spaceport_to_crown_city.png` | present |
| `rt_dk_spaceport_to_whistlestop_summit` | `rt_dk_spaceport_to_whistlestop_summit.png` | present |

**Present: 11 / 11**

## Remaining Routes

192 routes have no `image_url` in seed metadata. These intentionally fall back to text-only display in `TargetImage` (`onError` → `return null`) and in `AnnotationEditor`. No action needed unless new `image_url` values are added to seed metadata.
