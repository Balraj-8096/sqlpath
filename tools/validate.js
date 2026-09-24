// Validates lesson content files: node tools/validate.js js/lessons/joins.js [more files...]
const fs = require('fs');
const path = require('path');
const { load } = require('./sqldb');
const { checkChallenge } = require('./checks');
const root = path.join(__dirname, '..');
const win = {};
const run = (file) => new Function('window', 'Lessons', fs.readFileSync(file, 'utf8'))(win, win.Lessons);
new Function('window', fs.readFileSync(path.join(root, 'js/curriculum.js'), 'utf8'))(win);
new Function('window', fs.readFileSync(path.join(root, 'js/lessons/registry.js'), 'utf8'))(win);
const files = process.argv.slice(2);
let errors = 0, checked = 0;
const err = (id, msg) => { errors++; console.log(`✗ ${id}: ${msg}`); };
for (const f of files) {
  try { run(path.resolve(f)); } catch (e) { console.log(`✗ ${f}: file failed to load: ${e.message}`); process.exit(1); }
}
const VIS = ['join', 'groupby', 'setops', 'window', 'null', 'keys', 'order', 'stages', 'index', 'explain', 'txn', 'correlated', 'recursive', 'er', 'dml', 'flow', 'html'];
load().then(async (db0) => {
  const initSqlJs = require(path.join(root, 'vendor/sql-wasm.js'));
  const seed = db0; // reuse loader for fresh DBs
  const { load: fresh } = require('./sqldb');
  const tryRun = async (id, label, sql, { select = false } = {}) => {
    if (!sql) return null;
    checked++;
    const db = await fresh();
    try {
      const r = db.exec(sql);
      if (select && !r.length) err(id, `${label} returned no result set`);
      return r[r.length - 1] || null;
    } catch (e) { err(id, `${label} failed: ${e.message}\n    ${sql.replace(/\n/g, '\n    ')}`); return null; }
    finally { db.close(); }
  };
  const ids = Object.keys(win.Lessons.data);
  for (const id of ids) {
    const L = win.Lessons.data[id];
    if (!win.Curriculum.byId[id]) { err(id, 'unknown lesson id (not in curriculum)'); continue; }
    const runnable = !L.dialect;
    if (runnable && L.sql) await tryRun(id, 'sql', L.sql);
    if (L.exampleSql) await tryRun(id, 'exampleSql', L.exampleSql, { select: true });
    if (L.tryIt && L.tryIt.starter && !L.tryIt.dialect) await tryRun(id, 'tryIt.starter', L.tryIt.starter);
    if (L.challenge) {
      checked++;
      await checkChallenge(L.challenge, (msg) => err(id, 'challenge: ' + msg));
      if (!L.challenge.hints || L.challenge.hints.length < 2) err(id, 'challenge needs 2+ hints');
    }
    for (const [i, m] of (L.mistakes || []).entries()) if (m.fix && runnable && !m.fixDialect) await tryRun(id, `mistakes[${i}].fix`, m.fix);
    (L.quiz || []).forEach((qz, i) => { if (!Array.isArray(qz.options) || typeof qz.answer !== 'number' || qz.answer >= qz.options.length) err(id, `quiz[${i}] invalid`); });
    const v = L.visual;
    if (v) {
      const t = typeof v === 'string' ? v : v.type;
      if (!VIS.includes(t)) err(id, `unknown visual type ${t}`);
      if (v.source) await tryRun(id, 'visual.source', v.source, { select: true });
      if (v.a) await tryRun(id, 'visual.a', v.a, { select: true });
      if (v.b) await tryRun(id, 'visual.b', v.b, { select: true });
      if (v.view) await tryRun(id, 'visual.view', v.view, { select: true });
      if (v.statement) await tryRun(id, 'visual.statement', v.statement);
      if (v.index) await tryRun(id, 'visual.index', v.index);
      if (t === 'groupby' || t === 'window') {
        const r = await tryRun(id, 'visual.source cols', v.source, { select: true });
        if (r) for (const c of [v.group, v.value, v.partition, v.order].filter(Boolean)) if (!r.columns.includes(c)) err(id, `visual column '${c}' not in source columns [${r.columns}]`);
      }
      if (t === 'dml' && v.view) {
        const r = await tryRun(id, 'visual.view cols', v.view, { select: true });
        if (r && v.key && !r.columns.includes(v.key)) err(id, `dml key '${v.key}' not in view columns`);
      }
    }
    if (!L.concept) err(id, 'missing concept');
  }
  // coverage per file's sections
  const secs = new Set(ids.map((i) => win.Curriculum.byId[i] && win.Curriculum.byId[i].section).filter(Boolean));
  for (const s of secs) {
    const missing = win.Curriculum.sectionByKey[s].ids.filter((i) => !win.Lessons.data[i]);
    if (missing.length) console.log(`! section ${s} missing content for: ${missing.join(', ')}`);
  }
  console.log(`\n${ids.length} lessons, ${checked} SQL snippets checked, ${errors} error(s)`);
  process.exitCode = errors ? 1 : 0;
});
