# SQLPath — Interactive SQL Learning Platform (prototype)

A visual, hands-on SQL course, playground, visual explainer and interview trainer. Every query runs live in the browser on a real **SQLite** engine (sql.js / WebAssembly), against a **Healthcare Billing** sample database.

## Run it

Open `index.html` in a modern browser. No build step or server is needed: the WebAssembly engine is embedded, so it also works from `file://`.
Fonts load from Google Fonts when online and fall back to system fonts otherwise.

To serve it over HTTP instead, run `npx serve .` (or any static server) and open the printed URL.

## What's inside

| Area | Route | Highlights |
|---|---|---|
| Dashboard | `#/` | Progress, streak, XP, skill level, time left, learning-path roadmap with prerequisites, curriculum grid |
| Learning Mode | `#/learn/<lesson-id>` | 313 lessons in 16 sections (including Security, Administration & Applications), each following the 14-part structure: goals → concept (why/when/internals) → analogy → example data → syntax → breakdown → **visual execution** → result → mistakes → rules → try it → graded challenge → quiz → next |
| Practice Mode | `#/practice` | Playground with syntax highlighting, history, step-by-step execution, query plans; 435 auto-graded challenges (122 practice + 313 lesson) with difficulty and topic filters, progressive hints, expected output and the **Mistake Explainer**. Three grading modes: query results, **resulting data/schema state** (INSERT/UPDATE/DELETE/DDL), and **fix-the-query**. **Mixed review** (`#/practice/review`) is a spaced-repetition queue of missed, due and weak-topic challenges |
| Visual Explainer | `#/visualizer` | JOIN explorer, GROUP BY animator, execution order, window functions, set operations, NULL logic, PK/FK, ER diagram, correlated subquery, recursive CTE, B-tree index, real `EXPLAIN QUERY PLAN`, transaction timelines, DML before/after. You can also paste any query to step through it clause by clause |
| Query Builder | `#/builder` | Pick table, joins (detected from foreign keys), columns, filters, grouping, HAVING, ordering and limit; the SQL is generated live |
| Interview Mode | `#/interview` | 82 questions across 11 categories (MCQ, output prediction, query writing, debugging, scenarios) plus a timed round |
| Progress | `#/progress` | Per-section progress, accuracy, strong and weak topics, average challenge time, interview readiness, activity heatmap |

A **Database Explorer** sits on the right of every page. It lists tables, columns, PK/FK markers and relationships, and has buttons to preview a table, insert a name into the editor, open the ER diagram, and reset the DB.

Progress is stored in `localStorage`, per browser. **Light and dark themes**: toggle with ☀️/🌙 in the header. The default follows the OS setting, and the choice is remembered.

## Sample database: Healthcare Billing

The tables are `sites`, `treatment_locations`, `practitioners`, `payors`, `patients`, `invoices`, `charges`, `payments` and `transactions`. A **site** is a physical facility or campus, and each site has one or more treatment locations (care units). The scope, grain and column meaning of every table is documented in `js/schema-docs.js`, and the same text appears in the ER diagram and the explorer.
The data is deterministic and contains deliberate teaching cases: NULLs, patients with no invoices, a duplicate patient, a duplicate payment followed by its refund, a write-off, a void invoice, a new practitioner with no charges, and a practitioner supervisor hierarchy.

- `tools/build-seed.js` regenerates `js/seed.js` and `tools/seed.sql`.
- Anything the learner changes in the playground can be undone with **↺ Reset DB**.
- Lesson examples, grading and visuals run in a sandbox that is always rolled back.

## Project layout

```
index.html            app shell
css/app.css           dark developer theme (responsive)
vendor/               sql.js + embedded wasm
js/seed.js            generated sample DB
js/curriculum.js      sections & lesson ids
js/lessons/*.js       lesson content (see tools/CONTENT_GUIDE.md)
js/challenges.js      practice challenge bank
js/interview.js       interview question bank
js/db.js              engine wrapper, sandbox, clause splitter / stage runner, result comparison
js/visuals.js         all interactive visualizers
js/er.js              interactive ER diagram (cardinality, layers, join paths, live stats)
js/schema-docs.js     table scope and grain, column meanings, logical / derived / many-to-many relationships
js/practice.js        playground, graded challenge component, mistake explainer
js/lesson.js          lesson page renderer
js/builder.js         visual query builder
js/interview-view.js  interview mode
js/progress.js        XP, streaks, accuracy, topic stats
js/app.js             router, header, sidebar, explorer, dashboard, progress, visualizer hub
tools/                seed builder, content guide, validator, SQL runner
```

## Authoring and checking content

- `node tools/validate-bank.js` validates the practice and interview banks, including state-mode checks and fix-the-query items.
- `node tools/validate.js js/lessons/*.js` runs every lesson SQL snippet, challenge solution and visual query against the sample DB, and checks ids and fields.
- `node tools/sqlrun.js "SELECT * FROM payors"` runs a query against the sample DB from the terminal.
- `tools/CONTENT_GUIDE.md` documents the lesson format and every visual type.
