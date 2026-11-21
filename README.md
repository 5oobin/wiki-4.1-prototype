# Wiki User Project (1), Sub RQ 4.1 — interview prototype

Static research prototype: participants read a frozen snapshot of a Wikipedia
talk-page discussion (left) and look at information about each editor in it
(right), shown at five levels of interpretive work as "Frame 1"–"Frame 5"
(Extract, Prioritize, Select, Connect, Judge; level names are not shown).
No backend; deploys to GitHub Pages. Talk pane, editor tabs, highlighting and
popovers are reused from `wiki-talk-prototype` (Project (2)), which is untouched.

## Layout

```
public/data/
  manifest.json                    the 4 discussions (pinned revisions)
  discussions/<id>/talk.html       snapshot of the section at the pinned revision
  discussions/<id>/meta.json       participants and comment ids (generated)
  users/<User_name>_levels.json    one file per editor, from project1-extraction
scripts/fetch_snapshot.py          manifest.json -> talk.html + meta.json
```

## Local development

```
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check and build to dist/
```
