const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync("app/(tabs)/shiur-builder.tsx", "utf8");
const ast = ts.createSourceFile("builder.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let publish;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "publishConfirmedCategoryPacket") publish = node.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(publish);
assert.ok(source.includes("publishConfirmedCategoryPacket(packetId)"), "Use the saved ID, not potentially stale React state");
const code = ts.transpileModule(publish, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;

function setup(failure = "") {
  const packets = new Map([["draft", { status: "draft" }], ["other-draft", { status: "draft" }]]);
  let items = ["notes", "qa", "source"].map((chunk_id) => ({ packet_id: "draft", chunk_id }));
  items.push({ packet_id: "other-draft", chunk_id: "notes" });
  let selected = ["notes", "qa", "source"], activeId = "draft", message = "", saving = false, nextId = 0;
  const error = { message: "Test failure" };
  const supabase = {
    from(table) {
      let operation, payload, counting = false;
      const filters = [];
      const query = {
        insert(value) { operation = "insert"; payload = value; return query; },
        delete() { operation = "delete"; return query; },
        select(_columns, options) { operation ??= "select"; counting = options?.count === "exact"; return query; },
        eq(key, value) { filters.push((row) => row[key] === value); return query; },
        in(key, values) { filters.push((row) => values.includes(row[key])); return query; },
        single() { return query; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            const matches = (row) => filters.every((filter) => filter(row));
            if (table === "review_packets" && operation === "insert") {
              const id = "published-" + ++nextId;
              packets.set(id, payload);
              return { data: { id }, error: null };
            }
            if (table === "review_packet_items" && operation === "insert") {
              if (failure === "insert") return { error };
              items.push(...payload);
              return { error: null };
            }
            if (table === "review_packet_items" && operation === "delete") {
              if (failure === "cleanup") return { error };
              items = items.filter((row) => !matches(row));
              return { error: null };
            }
            if (table === "review_packet_items" && counting) return { count: items.filter(matches).length, error: null };
            if (table === "review_packets" && operation === "delete") {
              for (const [id, row] of packets) if (matches({ ...row, id })) packets.delete(id);
              return { error: null };
            }
            throw new Error("Unexpected query");
          }).then(resolve, reject);
        }
      };
      return query;
    },
    async rpc(name, args) {
      if (name === "notify_learning_file") return { error: null };
      assert.equal(name, "publish_review_packet");
      if (failure === "publish") return { error };
      packets.get(args.target_packet_id).status = "published";
      return { data: { id: "file" }, error: null };
    }
  };
  const context = {
    supabase, profile: { id: "rabbi" }, managedChaburahId: "chaburah", programsReady: true,
    selectedProgramId: "winter-5787", selectedProgram: { topic: "Challah" }, week: 1, title: "Packet",
    buildPublishedCategoryTitle: (title, label) => `${title} - ${label}`,
    setSaving: (value) => { saving = value; }, setMessage: (value) => { message = value; },
    setActivePacketId: (value) => { activeId = value; }, setActivePacketStatus: () => {},
    setSelectedIds: (update) => { selected = update(selected); }, clearPreview: () => {},
    loadBuilderData: async () => { message = ""; }, refresh: async () => {}
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return {
    async publish(category) {
      context.selectedCategoryChunks = [{ id: category, workbookTitle: "Challah" }];
      context.activeCategoryConfig = { label: category };
      await context.publishConfirmedCategoryPacket("draft");
      assert.equal(saving, false);
    },
    draftItems: () => items.filter((row) => row.packet_id === "draft").map((row) => row.chunk_id),
    selected: () => selected, packets, activeId: () => activeId, message: () => message,
    otherItems: () => items.filter((row) => row.packet_id === "other-draft").map((row) => row.chunk_id)
  };
}

async function main() {
  const flow = setup();
  await flow.publish("notes");
  assert.deepEqual(flow.draftItems(), ["qa", "source"]);
  assert.deepEqual(flow.selected(), ["qa", "source"]);
  assert.equal(flow.activeId(), "draft");
  await flow.publish("qa");
  assert.deepEqual(flow.draftItems(), ["source"]);
  await flow.publish("source");
  assert.equal(flow.packets.has("draft"), false);
  assert.equal(flow.activeId(), null);
  assert.deepEqual(flow.selected(), []);
  assert.deepEqual(flow.otherItems(), ["notes"]);
  assert.equal([...flow.packets.values()].filter((row) => row.status === "published").length, 3);
  for (const failure of ["insert", "publish"]) {
    const failed = setup(failure);
    await failed.publish("notes");
    assert.deepEqual(failed.draftItems(), ["notes", "qa", "source"]);
    assert.deepEqual(failed.selected(), ["notes", "qa", "source"]);
  }
  const failedCleanup = setup("cleanup");
  await failedCleanup.publish("notes");
  assert.deepEqual(failedCleanup.draftItems(), ["notes", "qa", "source"]);
  assert.ok(failedCleanup.message().includes("could not be fully cleaned up"));
  console.log("PASS: category-by-category draft cleanup, final deletion, unrelated drafts, and failure handling.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
