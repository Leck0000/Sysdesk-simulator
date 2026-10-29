// Compare two `vitest run --reporter=json` outputs per test file.
// Usage: node scripts/test-count-diff.mjs <before.json> <after.json> [--names]
import { readFileSync } from 'node:fs';

const [beforePath, afterPath, flag] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error('usage: node scripts/test-count-diff.mjs <before.json> <after.json> [--names]');
  process.exit(1);
}

function load(path, rootMarker) {
  const report = JSON.parse(readFileSync(path, 'utf8'));
  const files = new Map();
  for (const r of report.testResults) {
    const norm = r.name.replace(/\\/g, '/');
    const idx = norm.indexOf('/src/') >= 0 ? norm.indexOf('/src/') : norm.indexOf('/tests/');
    const rel = idx >= 0 ? norm.slice(idx + 1) : norm;
    const names = r.assertionResults.map((a) => ({ name: a.fullName, status: a.status }));
    files.set(rel, { status: r.status, message: r.message ?? '', names });
  }
  return { report, files, rootMarker };
}

const before = load(beforePath);
const after = load(afterPath);
const all = [...new Set([...before.files.keys(), ...after.files.keys()])].sort();

const pad = (s, n) => String(s).padEnd(n);
console.log(`BEFORE totals: files=${before.report.numTotalTestSuites !== undefined ? before.files.size : '?'} tests=${before.report.numTotalTests} passed=${before.report.numPassedTests} failed=${before.report.numFailedTests} failedSuites=${before.report.numFailedTestSuites}`);
console.log(`AFTER  totals: files=${after.files.size} tests=${after.report.numTotalTests} passed=${after.report.numPassedTests} failed=${after.report.numFailedTests} failedSuites=${after.report.numFailedTestSuites}`);
console.log('');
console.log(pad('file', 62) + pad('before', 14) + pad('after', 14) + 'delta');
for (const f of all) {
  const b = before.files.get(f);
  const a = after.files.get(f);
  const bc = b ? b.names.length : '-';
  const ac = a ? a.names.length : '-';
  const bp = b ? b.names.filter((n) => n.status === 'passed').length : 0;
  const ap = a ? a.names.filter((n) => n.status === 'passed').length : 0;
  const delta = (a ? a.names.length : 0) - (b ? b.names.length : 0);
  const mark = delta < 0 ? '  <-- DROPPED' : '';
  console.log(
    pad(f, 62) +
      pad(b ? `${bc} (${bp}p)` : '-', 14) +
      pad(a ? `${ac} (${ap}p)` : '-', 14) +
      (delta > 0 ? `+${delta}` : String(delta)) +
      mark,
  );
}

if (flag === '--names') {
  console.log('\n=== Test names present BEFORE but missing AFTER (by file) ===');
  for (const f of all) {
    const b = before.files.get(f);
    const a = after.files.get(f);
    if (!b) continue;
    const afterNames = new Set(a ? a.names.map((n) => n.name) : []);
    const missing = b.names.filter((n) => !afterNames.has(n.name));
    if (missing.length === 0) continue;
    console.log(`\n## ${f}  (before ${b.names.length}, after ${a ? a.names.length : 0})`);
    for (const m of missing) console.log(`  - [${m.status}] ${m.name}`);
    if (a) {
      const beforeNames = new Set(b.names.map((n) => n.name));
      const added = a.names.filter((n) => !beforeNames.has(n.name));
      for (const n of added) console.log(`  + [${n.status}] ${n.name}`);
    }
  }
}
