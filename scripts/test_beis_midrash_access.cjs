const assert = require("node:assert/strict");
const fs = require("node:fs"); const vm = require("node:vm"); const ts = require("typescript");
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/shared/permissions.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText, { exports: api });
const user = { id: "rabbi", role: "local_rabbi" };
const own = { userId: "rabbi", chaburahId: "own", memberRole: "rabbi", status: "active" };
const visiting = { userId: "rabbi", chaburahId: "visiting", memberRole: "participant", status: "active" };
assert.equal(api.canAccessBeisMidrash(user, [own, visiting]), true);
assert.equal(api.chaburahToolAccess(user, [own, visiting], "visiting").rabbiHub, false);
assert.equal(api.chaburahToolAccess(user, [own, visiting], "own").rabbiHub, true);
for (const role of ["participant", "local_admin"]) assert.equal(api.canAccessBeisMidrash({ ...user, role }, [own]), false);
for (const status of ["pending", "suspended", "left"]) assert.equal(api.canAccessBeisMidrash(user, [{ ...own, status }]), false);
assert.equal(api.canAccessBeisMidrash(user, [visiting]), false);
assert.equal(api.canAccessBeisMidrash(null, [own]), false);
assert.equal(api.canAccessBeisMidrash({ id: "global", role: "global_admin" }, []), true);
console.log("PASS: worldwide Rabbi approval, revoked/participant/admin denial, and unchanged local chaburah permissions.");
