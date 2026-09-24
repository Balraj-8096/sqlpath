// Run SQL against the sample DB:  node tools/sqlrun.js "SELECT * FROM payors"
const { load } = require('./sqldb');
load().then((db) => {
  try {
    const res = db.exec(process.argv[2]);
    for (const r of res) {
      console.log(r.columns.join(' | '));
      for (const v of r.values.slice(0, Number(process.argv[3] || 40))) console.log(v.map((x) => (x === null ? 'NULL' : x)).join(' | '));
      console.log(`(${r.values.length} rows)\n`);
    }
    if (!res.length) console.log('(no result set)');
  } catch (e) { console.log('ERROR: ' + e.message); process.exitCode = 1; }
});
