# Local video assets

The homepage hero and flood section use `<video>` elements with SVG posters as the
visible fallback. To swap in real footage, drop these local files here (no code change):

Hero (vertical, portrait, muted/looping):
- `hero-devotion.mp4`   — devotees / offerings entering a river or lake
- `hero-leakage.mp4`    — broken pipe / water wastage
- `hero-drain.mp4`      — drain / wastewater entering a water body

Flood section (landscape background):
- `flood-bg.mp4`        — flooded roads / rising water / affected area

Guidance: keep each hero clip ~5-10s, 720x1280 (portrait), H.264 .mp4, no audio.
Flood bg ~10-20s, 1920x1080 landscape, H.264 .mp4, darkenable.
If a file is absent, the matching SVG poster shows instead (the UI never breaks).

Volunteer community page (aside):
- `volunteer-cleaning.mp4`  — volunteers cleaning a lake/river (landscape, ~10-20s, muted)
  Shown in the right aside of the Volunteers page. Falls back to poster-cleaning.svg if absent.

Region home page (full-page background):
- `region-bg.mp4`  — calm water / river / lake scenery (landscape, loops, muted)
  Fixed full-viewport background behind the region dashboard. Falls back to poster-region.svg.
