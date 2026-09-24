// Node helper: opens the seeded sample database using the vendored sql.js build.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
function load() {
  const win = {};
  new Function('window', fs.readFileSync(path.join(root, 'vendor/sql-wasm-binary.js'), 'utf8'))(win);
  new Function('window', fs.readFileSync(path.join(root, 'js/seed.js'), 'utf8'))(win);
  const initSqlJs = require(path.join(root, 'vendor/sql-wasm.js'));
  return initSqlJs({ wasmBinary: Buffer.from(win.SQL_WASM_BASE64, 'base64') }).then((SQL) => {
    const db = new SQL.Database();
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec(win.SEED_SQL);
    return db;
  });
}
module.exports = { load };
