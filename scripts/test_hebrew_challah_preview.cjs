// Browser checks for the generated local file. No server or database access.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url");
const root=path.resolve(__dirname,"..");
process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(root,"tmp/webkit-browsers");
const {webkit}=require(path.join(root,"tmp/webkit-tests/node_modules/playwright"));
const folder=path.join(root,"tmp/shiur-import-preview/challah-hebrew-part1");
async function main(){
 const browser=await webkit.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1360,height:950}}),errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.route(/^https?:\/\//,route=>route.abort());
  await page.goto(pathToFileURL(path.join(folder,"index.html")).href);
  await page.getByRole("button",{name:"עברית",exact:true}).waitFor();
  assert.equal(await page.locator("#workspace").getAttribute("dir"),"rtl");
  assert.equal(await page.locator("details.folder").count(),5);
  assert.ok(await page.locator("#counts").innerText().then(text=>text.startsWith("32 notes")));
  const layout=await page.evaluate(()=>({aside:document.querySelector('aside').getBoundingClientRect().x,main:document.querySelector('main').getBoundingClientRect().x}));
  assert.ok(layout.aside>layout.main,"Hebrew folders should be on the right");
  await page.getByRole("button",{name:"Next",exact:true}).click();
  assert.equal(await page.locator("article.paper").getAttribute("data-chunk"),"HC1-A2");
  await page.getByRole("button",{name:"Previous",exact:true}).click();
  async function select(code){
    await page.getByRole("textbox",{name:"Search chunks"}).fill(code);
    const summary=page.locator("details.folder summary").first();
    const open=await page.locator("details.folder").first().getAttribute("open");
    if(open===null)await summary.click();
    await page.locator(`[data-code="${code}"]`).click();
  }
  await select("HC1-A4");
  assert.ok((await page.locator("article.paper").innerText()).includes('הרמב"ם'));
  assert.equal(await page.locator("article.paper .paragraph").first().getAttribute("dir"),"rtl");
  await page.screenshot({path:path.join(folder,"hebrew-notes-desktop.png")});
  await select("HC1-C9");
  assert.ok((await page.locator("article.paper").innerText()).includes("מנחת יצחק"));
  await page.getByRole("textbox",{name:"Search chunks"}).fill("");
  await page.getByRole("button",{name:"Full Document",exact:true}).click();
  assert.equal(await page.locator("article.paper").count(),32);
  assert.equal(await page.locator(".footnote[id]").count(),27);
  assert.equal(await page.locator(".fnref").count(),27);
  const badRefs=await page.locator(".fnref").evaluateAll(nodes=>nodes.filter(node=>!document.getElementById(node.hash.slice(1))).length);
  assert.equal(badRefs,0);
  await page.getByRole("button",{name:"Single Chunk",exact:true}).click();
  await page.getByRole("button",{name:"Q&A",exact:true}).click();
  await select("HC1-Q1");
  assert.ok((await page.locator("article.paper").innerText()).includes('השו"ע'));
  await page.getByRole("button",{name:"שאלות בלבד",exact:true}).click();
  assert.ok((await page.locator("article.paper").innerText()).includes("____"));
  assert.ok(!(await page.locator("article.paper").innerText()).includes('השו"ע'));
  await page.getByRole("button",{name:"עם תשובות",exact:true}).click();
  await select("HC1-Q14");
  assert.ok((await page.locator("article.paper .pending").innerText()).includes("F1"));
  await page.screenshot({path:path.join(folder,"hebrew-qa-desktop.png")});
  await page.getByRole("button",{name:"Source Sheets",exact:true}).click();
  await select("HC1-S57");
  await page.locator("article.paper img").waitFor();
  await page.waitForFunction(()=>document.querySelector('article.paper img').naturalWidth>0);
  const sourceImage=await page.locator("article.paper img").getAttribute("src");
  await page.getByRole("button",{name:"English",exact:true}).click();
  assert.equal(await page.locator("article.paper img").getAttribute("src"),sourceImage,"Source images must be shared, not translated/duplicated");
  assert.equal(await page.locator("#workspace").getAttribute("dir"),"ltr");
  await page.getByRole("button",{name:"Review Notes",exact:true}).click();
  assert.equal(await page.locator("details.folder").count(),7);
  await select("HC1-F3");
  await page.getByRole("button",{name:"עברית",exact:true}).click();
  assert.equal(await page.locator("details.folder").count(),5);
  assert.equal(await page.locator('[data-code="HC1-F3"]').count(),0,"Do not silently fall back to English notes");
  await page.setViewportSize({width:390,height:844});
  await select("HC1-A1");
  const width=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
  assert.ok(width.document<=width.viewport+1,JSON.stringify(width));
  await page.screenshot({path:path.join(folder,"hebrew-notes-mobile.png")});
  assert.deepEqual(errors,[]);
  console.log("PASS: WebKit RTL folders/document, A1/A2 navigation, A4, C9 continuation, all 32 notes and 27 linked footnotes, question-only toggle, missing F notes, 57 shared source images, English switch and mobile overflow.");
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
