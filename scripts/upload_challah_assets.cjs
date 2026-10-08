// Upload official images once. This script never inserts content or publishes packets.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const readline = require("node:readline/promises");
const { createClient } = require("@supabase/supabase-js");

function passwordPrompt() {
  if (!process.stdin.isTTY) throw new Error("Run this script interactively in CMD or PowerShell.");
  return new Promise((resolve, reject) => {
    let password = "";
    process.stdout.write("Global Admin password (hidden): ");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    function finish(error) {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      error ? reject(error) : resolve(password);
    }
    function onData(buffer) {
      const text = buffer.toString();
      if (text.includes("\u0003")) { finish(new Error("Cancelled")); return; }
      for (const char of text) {
        if (char === "\r" || char === "\n") { finish(); return; }
        if (char === "\u007f" || char === "\b") password = Array.from(password).slice(0, -1).join("");
        else if (char >= " ") password += char;
      }
    }
    process.stdin.on("data", onData);
  });
}

async function main() {
  const root = path.resolve(__dirname, "..");
  if (process.loadEnvFile && fs.existsSync(path.join(root, ".env"))) process.loadEnvFile(path.join(root, ".env"));
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing the app's public Supabase configuration.");
  const directory = path.join(root, "tmp/shiur-import-preview/challah-part1/import");
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8"));
  if (manifest.program !== "winter-5787" || manifest.bucket !== "official-learning-materials") throw new Error("Unexpected asset manifest.");
  for (const asset of manifest.assets) {
    const file = path.resolve(directory, asset.file);
    if (!file.startsWith(directory + path.sep)) throw new Error("Invalid local asset path.");
    const hash = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    if (hash !== asset.sha256 || asset.storagePath !== "sha256/" + path.basename(file)) throw new Error("Asset checksum mismatch.");
  }
  console.log("Target:", url);
  console.log("Winter 5787 official assets:", manifest.assets.length, "Total bytes:", manifest.bytes);
  let rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const email = (await rl.question("Global Admin email: ")).trim();
  rl.close();
  const password = await passwordPrompt();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: true },
    global: { headers: { "x-myscp-learning-programs": "1", "x-myscp-rich-content": "1" } }
  });
  try {
    const login = await client.auth.signInWithPassword({ email, password });
    if (login.error || !login.data.user) throw new Error(login.error?.message ?? "Sign-in failed.");
    const profile = await client.from("profiles").select("role").eq("id", login.data.user.id).single();
    if (profile.error || profile.data?.role !== "global_admin") throw new Error("A Global Admin account is required.");
    const program = await client.from("learning_programs").select("id").eq("id", "winter-5787").single();
    if (program.error) throw new Error("Apply the learning-program migration first.");
    const schema = await client.from("content_chunks").select("content_document").limit(1);
    if (schema.error) throw new Error("Apply the rich-content migration first.");
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const confirmation = await rl.question("Type UPLOAD to upload to the target shown above (no content import): ");
    rl.close();
    if (confirmation !== "UPLOAD") { console.log("Cancelled. No images uploaded."); return; }
    const bucket = client.storage.from(manifest.bucket);
    let uploaded = 0, reused = 0;
    for (const asset of manifest.assets) {
      const existing = await bucket.download(asset.storagePath);
      if (!existing.error && existing.data) {
        const hash = crypto.createHash("sha256").update(Buffer.from(await existing.data.arrayBuffer())).digest("hex");
        if (hash !== asset.sha256) throw new Error("An existing official object has the wrong checksum: " + asset.storagePath);
        reused++;
      } else {
        const raw = fs.readFileSync(path.join(directory, asset.file));
        const result = await bucket.upload(asset.storagePath, raw, { contentType: asset.contentType, upsert: false, cacheControl: "3600" });
        if (result.error) throw new Error("Image upload failed: " + result.error.message + ". Rerunning safely reuses completed uploads.");
        uploaded++;
      }
      console.log((uploaded + reused) + "/" + manifest.assets.length);
    }
    const report = { target: url, bucket: manifest.bucket, uploaded, reused, checkedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(directory, "upload-report.json"), JSON.stringify(report, null, 2));
    console.log("Complete:", uploaded, "uploaded;", reused, "reused. Now run the prepared SQL import.");
  } finally {
    await client.auth.signOut({ scope: "local" });
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
