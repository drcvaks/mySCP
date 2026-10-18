const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const source = fs.readFileSync("app/(tabs)/beta-feedback.tsx", "utf8");
const ast = ts.createSourceFile("beta-feedback.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const methods = {};
function visit(node) {
  if (ts.isFunctionDeclaration(node) && ["loadFeedback", "emailTester"].includes(node.name?.text)) methods[node.name.text] = node.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
const compile = text => ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2020}}).outputText;
async function run(role) {
  const selections = [], links = [], messages = [];
  let feedback;
  const context = {
    profile: role ? {id: "viewer", role} : null,
    canContact: role === "global_admin",
    setLoading: () => {}, setMessage: value => messages.push(value), setFeedback: value => {feedback = value;},
    formatSupabaseError: () => "error",
    Linking: {openURL: async url => links.push(url)},
    supabase: {from: table => ({select: columns => {
      selections.push([table, columns]);
      if (table === "profiles") return Promise.resolve({error: null, data: [{id: "author", full_name: "", ...(columns.includes("email") ? {email: "tester@example.com"} : {})}]});
      return {order: () => ({limit: async () => ({error: null, data: [{id: "note",user_id: "author",role: "participant",category: "confusing",body: "Feedback",platform: "web",admin_response: "Thanks for reporting this.",created_at: "2026-10-16"}]})})};
    }})}
  };
  vm.runInNewContext(compile(`${methods.loadFeedback}\n${methods.emailTester}\nglobalThis.load = loadFeedback; globalThis.contact = emailTester;`), context);
  await context.load();
  await context.contact({userEmail: "tester@example.com"});
  return {feedback, selections, links, messages, context};
}
async function main() {
  for (const role of ["participant", "local_rabbi", "local_admin", "global_admin"]) {
    const result = await run(role);
    const global = role === "global_admin";
    assert.equal(result.selections.find(([table]) => table === "profiles")[1].includes("email"), global);
    assert.equal(result.feedback[0].userEmail, global ? "tester@example.com" : undefined);
    assert.equal(result.feedback[0].userName, "Tester", "Missing names must not reveal email as fallback");
    assert.equal(result.feedback[0].adminResponse, "Thanks for reporting this.", "Replies remain visible to participants");
    assert.equal(result.links.length, global ? 1 : 0);
    if (global) {
      assert.equal(result.links[0], "mailto:tester%40example.com?subject=Your%20mySCP%20beta%20feedback");
      result.context.Linking.openURL = async () => {throw new Error("No mail app");};
      await result.context.contact({userEmail: "tester@example.com"});
      assert.ok(result.messages.at(-1).includes("Copy the email address"));
    }
  }
  const signedOut = await run(null);
  assert.equal(signedOut.selections.length, 0);
  assert.equal(signedOut.feedback.length, 0);
  assert.ok(source.includes("{canContact && item.userEmail ? ("));
  assert.ok(source.includes("const canContact = profile ? isGlobalAdmin(profile) : false;"));
  console.log("PASS: Global Admin-only email fetch/display/contact; no email name fallback; participant reply visibility; mail-client failure; signed-out guard.");
}
main().catch(error => {console.error(error); process.exitCode = 1;});
