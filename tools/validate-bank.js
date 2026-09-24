// Validates js/challenges.js (PracticeBank) and js/interview.js (InterviewBank).
// node tools/validate-bank.js
const fs = require('fs');
const path = require('path');
const { checkChallenge, runOn } = require('./checks');
const root = path.join(__dirname, '..');
const win = {};
for (const f of ['js/challenges.js', 'js/interview.js']) new Function('window', fs.readFileSync(path.join(root, f), 'utf8'))(win);
const LEVELS = [1, 2, 3, 4];
let errors = 0;
const err = (id, m) => { errors++; console.log(`✗ ${id}: ${m}`); };
(async () => {
  const ids = new Set();
  for (const c of win.PracticeBank) {
    if (ids.has(c.id)) err(c.id, 'duplicate id'); ids.add(c.id);
    if (!c.title || !c.prompt || !c.topic) err(c.id, 'title, prompt and topic are required');
    if (!LEVELS.includes(c.level)) err(c.id, 'level must be 1-4');
    if (!c.hints || c.hints.length < 2) err(c.id, 'needs 2+ hints');
    await checkChallenge(c, (m) => err(c.id, m));
  }
  for (const q of win.InterviewBank) {
    if (ids.has(q.id)) err(q.id, 'duplicate id'); ids.add(q.id);
    if (q.type === 'write' || q.type === 'debug') await checkChallenge({ ...q, buggy: q.type === 'debug' ? q.sql : undefined }, (m) => err(q.id, m));
    else {
      if (!Array.isArray(q.options) || typeof q.answer !== 'number' || q.answer >= q.options.length) err(q.id, 'invalid options/answer');
      if (q.type === 'predict') { try { await runOn(q.sql); } catch (e) { err(q.id, 'predict sql failed: ' + e.message); } }
    }
  }
  const topics = {};
  win.PracticeBank.forEach((c) => (topics[c.topic] = (topics[c.topic] || 0) + 1));
  console.log('practice by topic:', topics);
  console.log(`\n${win.PracticeBank.length} practice challenges, ${win.InterviewBank.length} interview questions, ${errors} error(s)`);
  process.exitCode = errors ? 1 : 0;
})();
