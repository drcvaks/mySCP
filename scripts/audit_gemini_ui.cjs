const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ts = require('typescript');
const branch = process.argv[2] || 'origin/Gemini-UI-Fix';
const git = (...args) => cp.execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 });
const files = git('diff', '--name-only', 'HEAD', branch).trim().split('\n');
const printer = ts.createPrinter({ removeComments: true });
function calls(source, filename) {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = [];
  function visit(node) {
    if (ts.isCallExpression(node) && /^supabase\./.test(node.getText(file))) {
      if (!ts.isPropertyAccessExpression(node.parent) || node.parent.expression !== node) {
        found.push(printer.printNode(ts.EmitHint.Unspecified, node, file));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return found.sort();
}
function functions(source, filename) {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = {};
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name && /^[a-z]/.test(node.name.text)) {
      found[node.name.text] = printer.printNode(ts.EmitHint.Unspecified, node, file);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return found;
}
const report = { branch, files: [], backendCallChanges: [], workingTreeBackendCallChanges: [], functionChanges: [], localSourceDifferences: [] };
for (const filename of files) {
  const next = git('show', `${branch}:${filename}`);
  let before = '';
  try { before = git('show', `HEAD:${filename}`); } catch {}
  report.files.push(filename);
  if (/\.tsx?$/.test(filename)) {
    const a = calls(before, filename), b = calls(next, filename);
    if (JSON.stringify(a) !== JSON.stringify(b)) report.backendCallChanges.push({ filename, before: a, after: b });
    if (fs.existsSync(filename) && JSON.stringify(a) !== JSON.stringify(calls(fs.readFileSync(filename, 'utf8'), filename))) report.workingTreeBackendCallChanges.push(filename);
    const oldFunctions = functions(before, filename), newFunctions = functions(next, filename);
    for (const [name, source] of Object.entries(oldFunctions)) {
      if (newFunctions[name] && newFunctions[name] !== source) report.functionChanges.push({ filename, name, before: source, after: newFunctions[name] });
    }
  }
  const local = path.join('C:/Users/Family/ws/mySCPAntigravity/mySCP', filename);
  if (fs.existsSync(local) && fs.readFileSync(local, 'utf8').replace(/\r\n/g, '\n') !== next.replace(/\r\n/g, '\n')) report.localSourceDifferences.push(filename);
}
fs.mkdirSync('tmp/gemini-ui-review', { recursive: true });
fs.writeFileSync('tmp/gemini-ui-review/backend-call-audit.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ changedFiles: files.length, backendCallChanges: report.backendCallChanges, workingTreeBackendCallChanges: report.workingTreeBackendCallChanges, functionChanges: report.functionChanges.map(({filename,name})=>({filename,name})), localSourceDifferences: report.localSourceDifferences }, null, 2));
