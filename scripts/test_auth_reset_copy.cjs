const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const source = fs.readFileSync("app/auth.tsx","utf8");
const ast = ts.createSourceFile("auth.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let reset;
function visit(node) {
  if(ts.isFunctionDeclaration(node)&&node.name?.text==="sendPasswordReset") reset=node.getText(ast);
  ts.forEachChild(node,visit);
}
visit(ast);
async function run(email,result=null) {
  const calls=[],messages=[],busy=[];
  const context={email,setMessage:value=>messages.push(value),setSubmitting:value=>busy.push(value),
    Linking:{createURL:route=>`myscp://${route}`},
    resetPassword:async (...args)=>{calls.push(args);return result;}};
  vm.runInNewContext(ts.transpileModule(reset+"\nglobalThis.run=sendPasswordReset;",{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,context);
  await context.run();return{calls,messages,busy};
}
async function main() {
  const success=await run("  tester@example.invalid  ");
  assert.equal(success.calls.length,1);
  assert.equal(success.calls[0][0],"tester@example.invalid");
  assert.equal(success.calls[0][1],"myscp:///auth");
  assert.ok(success.messages.at(-1).startsWith("Password reset email sent"));
  assert.ok(success.messages.at(-1).includes("Supabase, mySCP's sign-in provider"));
  assert.ok(success.messages.at(-1).includes("spam/junk"));
  assert.deepEqual(success.busy,[true,false]);
  const invalid=await run("");
  assert.equal(invalid.calls.length,0);
  assert.equal(invalid.messages.at(-1),"Enter your email address first.");
  const failure=await run("tester@example.invalid","Unable to send reset email.");
  assert.equal(failure.messages.at(-1),"Unable to send reset email.");
  assert.ok(!failure.messages.at(-1).includes("sent."));
  assert.ok(!fs.readFileSync("app/(tabs)/profile.tsx","utf8").includes("Email changes are managed through Supabase Auth."));
  assert.ok(source.includes("Sign in with your mySCP email and password."));
  console.log("PASS: profile technical copy removed; reset success explains sender and spam folder; invalid email and API errors preserved; sign-in uses mySCP branding.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
