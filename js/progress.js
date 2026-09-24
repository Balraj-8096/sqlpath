// Learner progress, stored in localStorage (per browser).
(function () {
  const KEY = 'sqlpath.progress.v1';
  const today = () => new Date().toISOString().slice(0, 10);
  const blank = () => ({ completed: {}, quiz: {}, challenges: {}, interview: {}, xp: 0, streak: { last: null, count: 0, best: 0 }, activity: {}, current: null, history: [], hintsUsed: {}, review: {} });
  let st;
  try { st = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { st = blank(); }
  const listeners = [];
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage unavailable */ }
    listeners.forEach((f) => f(st));
  }
  function touch() {
    const d = today();
    st.activity[d] = (st.activity[d] || 0) + 1;
    if (st.streak.last !== d) {
      const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      st.streak.count = st.streak.last === y ? st.streak.count + 1 : 1;
      st.streak.last = d;
      st.streak.best = Math.max(st.streak.best, st.streak.count);
    }
  }
  function addXp(n, reason) {
    st.xp += n;
    if (n > 0) UI.toast(`+${n} XP · ${reason}`, 'xp');
  }

  // Spaced repetition (Leitner boxes): solving moves an item up a box and pushes its next review out;
  // failing sends it back to box 0, due again shortly.
  const INTERVAL_DAYS = [0, 1, 3, 7, 16, 35];
  function schedule(key, solved) {
    const r = st.review[key] || (st.review[key] = { box: 0, due: 0 });
    if (solved) { r.box = Math.min(r.box + 1, INTERVAL_DAYS.length - 1); r.due = Date.now() + INTERVAL_DAYS[r.box] * 864e5; }
    else { r.box = 0; r.due = Date.now() + 10 * 60e3; }
  }

  const P = {
    get state() { return st; },
    onChange(f) { listeners.push(f); },
    isDone: (id) => !!st.completed[id],
    complete(id) {
      if (st.completed[id]) return;
      st.completed[id] = Date.now();
      touch(); addXp(20, 'Lesson complete'); save();
    },
    uncomplete(id) { delete st.completed[id]; save(); },
    setCurrent(id) { st.current = id; save(); },
    quizAnswer(key, correct) {
      const q = st.quiz[key] || (st.quiz[key] = { correct: 0, total: 0, done: false });
      if (q.done) return;
      q.total++; if (correct) q.correct++;
      q.done = true;
      touch(); if (correct) addXp(5, 'Correct answer'); save();
    },
    // key: 'lesson:<id>' | 'practice:<id>' ; topic: section key or topic name
    attempt(key, { solved, level = 1, topic, ms }) {
      const c = st.challenges[key] || (st.challenges[key] = { solved: false, attempts: 0, topic, level, time: null, started: Date.now() });
      c.attempts++;
      c.topic = topic || c.topic;
      touch();
      schedule(key, solved);
      if (solved && !c.solved) {
        c.solved = true;
        c.time = ms || Date.now() - c.started;
        const hints = st.hintsUsed[key] || 0;
        addXp(Math.max(10, 25 * level - hints * 5), hints ? `Challenge solved (${hints} hint${hints > 1 ? 's' : ''})` : 'Challenge solved');
      }
      save();
      return c;
    },
    hint(key) { st.hintsUsed[key] = (st.hintsUsed[key] || 0) + 1; save(); },
    interviewAnswer(id, correct, category) {
      const r = st.interview[id] || (st.interview[id] = { correct: false, attempts: 0, category });
      r.attempts++;
      if (correct && !r.correct) { r.correct = true; addXp(15, 'Interview question'); }
      touch(); save();
    },
    logQuery(sql, ok) {
      st.history.unshift({ sql, ok, t: Date.now() });
      st.history = st.history.slice(0, 60);
      touch(); save();
    },
    clearHistory() { st.history = []; save(); },
    reset() { st = blank(); save(); },

    // ---------- derived stats ----------
    sectionStats(sec) { const done = sec.ids.filter((i) => st.completed[i]).length; return { done, total: sec.ids.length, pct: sec.ids.length ? done / sec.ids.length : 0 }; },
    overall() {
      const total = Curriculum.lessons.length;
      const done = Curriculum.lessons.filter((l) => st.completed[l.id]).length;
      return { done, total, pct: total ? done / total : 0 };
    },
    accuracy() {
      let a = 0, s = 0, qc = 0, qt = 0;
      Object.values(st.challenges).forEach((c) => { a += c.attempts; if (c.solved) s++; });
      Object.values(st.quiz).forEach((q) => { qc += q.correct; qt += q.total; });
      const denom = a + qt;
      return { pct: denom ? (s + qc) / denom : null, solved: s, attempts: a, quizCorrect: qc, quizTotal: qt };
    },
    topicStats() {
      // per topic: correct / attempts, from challenges + quizzes
      const m = {};
      const bump = (t, ok, n = 1) => { if (!t) return; const e = m[t] || (m[t] = { ok: 0, n: 0 }); e.ok += ok; e.n += n; };
      Object.values(st.challenges).forEach((c) => bump(c.topic, c.solved ? 1 : 0, Math.max(1, c.attempts)));
      Object.entries(st.quiz).forEach(([k, q]) => { const id = k.split('#')[0]; const l = Curriculum.byId[id]; if (l) bump(l.section, q.correct, q.total); });
      Object.values(st.interview).forEach((r) => bump('iv:' + r.category, r.correct ? 1 : 0, r.attempts));
      return m;
    },
    avgChallengeMs() {
      const t = Object.values(st.challenges).filter((c) => c.solved && c.time).map((c) => c.time);
      return t.length ? t.reduce((a, b) => a + b, 0) / t.length : null;
    },
    // Mixed review queue: items due for spaced review, then failed-but-unsolved items,
    // then untried items from the weakest topics. `all` = Practice.allChallenges().
    reviewQueue(all, size = 10) {
      const now = Date.now();
      const byKey = new Map(all.map((c) => [c.key, c]));
      const picked = [], seen = new Set();
      const add = (c, reason) => { if (c && !seen.has(c.key) && picked.length < size) { seen.add(c.key); picked.push({ ...c, reason }); } };
      Object.entries(st.review).filter(([, r]) => r.due <= now && r.box > 0).sort((a, b) => a[1].due - b[1].due).forEach(([k]) => add(byKey.get(k), 'due'));
      Object.entries(st.challenges).filter(([, c]) => !c.solved && c.attempts > 0).forEach(([k]) => add(byKey.get(k), 'retry'));
      const tstats = P.topicStats();
      const topicAcc = (t) => { const s = tstats[t] || tstats[Object.keys(Curriculum.sectionByKey).find((k) => Curriculum.sectionByKey[k].short === t)]; return s && s.n ? s.ok / s.n : 0.5; };
      const fresh = all.filter((c) => !st.challenges[c.key]).sort((a, b) => topicAcc(a.topic) - topicAcc(b.topic) || a.level - b.level);
      // interleave topics so a session mixes concepts
      const byTopic = new Map();
      fresh.forEach((c) => { if (!byTopic.has(c.topic)) byTopic.set(c.topic, []); byTopic.get(c.topic).push(c); });
      const lanes = [...byTopic.values()];
      for (let i = 0; picked.length < size && lanes.some((l) => l.length); i++) { const l = lanes[i % lanes.length]; if (l.length) add(l.shift(), 'weak'); }
      return picked;
    },
    reviewDueCount() { const now = Date.now(); return Object.values(st.review).filter((r) => r.box > 0 && r.due <= now).length + Object.values(st.challenges).filter((c) => !c.solved && c.attempts > 0).length; },
    interviewReadiness() {
      // blend of core-section completion, challenge accuracy and interview answers
      const core = ['fundamentals', 'filtering', 'aggregates', 'joins', 'subqueries', 'windows'].map((k) => P.sectionStats(Curriculum.sectionByKey[k]).pct);
      const coreAvg = core.reduce((a, b) => a + b, 0) / core.length;
      const ivTotal = (window.InterviewBank || []).length || 1;
      const ivOk = Object.values(st.interview).filter((r) => r.correct).length / ivTotal;
      const acc = P.accuracy().pct ?? 0;
      return Math.round((coreAvg * 0.5 + ivOk * 0.3 + acc * 0.2) * 100);
    },
    skillLevel() {
      const xp = st.xp;
      if (xp >= 4000) return 'Expert';
      if (xp >= 1800) return 'Advanced';
      if (xp >= 600) return 'Intermediate';
      return 'Beginner';
    },
  };
  window.Progress = P;
})();
