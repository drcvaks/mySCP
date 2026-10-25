// Synthetic browser accounts backed by a local PostgreSQL runtime. No production requests.
const assert = require("node:assert/strict");
const fs = require("node:fs"); const path = require("node:path");
const { fixture, signIn, ensureServer, stopServer } = require("./test_mobile_webkit.cjs");
const { createDatabase, id } = require("./test_beis_midrash_sql.cjs");
process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve("tmp/webkit-browsers");
const { webkit, devices } = require(path.resolve("tmp/webkit-tests/node_modules/playwright"));
const base = process.env.MYSCP_TEST_URL || "http://localhost:8081";
const out = path.resolve("tmp/beis-midrash-webkit");
const title = "\u05e9\u05d0\u05dc\u05d4 \u05dc\u05d1\u05d3\u05d9\u05e7\u05d4";
const body = "\u05d3\u05d9\u05d5\u05df \u05dc\u05d1\u05d3\u05d9\u05e7\u05d4.\n\nEnglish reference HC1-B3 stays readable.";
async function main() {
  console.log("Starting isolated Expo and database...");
  await ensureServer(); fs.mkdirSync(out,{recursive:true});
  console.log("Expo ready; initializing local PostgreSQL...");
  const db = await createDatabase();
  await db.exec(`reset role; update public.content_chunks set workbook_title='Hafrasha Challah Part 1' where program_id='winter-5787';
    insert into public.profiles values ('${id(10)}','WebKit Test User','local_rabbi','private-browser@example.invalid');
    insert into public.chaburah_members values ('${id(10)}','active','rabbi'); set role authenticated;`);
  console.log("Database ready; launching WebKit...");
  const browser = await webkit.launch({headless:true}); let page, failSave = false;
  const trace=[];
  let queue = Promise.resolve();
  const sqlAs = (uid, work) => {
    const task = queue.then(async()=>{ await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(uid)]); return work(); });
    queue = task.catch(()=>{}); return task;
  };
  async function setup(context, role="local_rabbi", uid=10, extra={}) {
    const fixturePrograms=[
      {id:'summer-5786',name:'Summer 5786',topic:'Nat Bar Nat',default_week:12,archived:false},
      {id:'winter-5787',name:'Winter 5787',topic:'Challah & Terumos/Maasros',default_week:1,archived:false},
      {id:'summer-5787',name:'Summer 5787',topic:'Hilchos Tefillin',default_week:1,archived:false,early_access:true}
    ];
    await fixture(context,role,{ learning_programs:role==='global_admin'?fixturePrograms:fixturePrograms.slice(0,2), content_chunks:[{id:id(20),chunk_code:"HC1-B3",chunk_title:"Notes B3",program_id:"winter-5787",source_type:"notes",
      content_markdown:"Original controlled Notes content.",content_document:null}],...extra });
    await context.route('https://resources.example.invalid/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Synthetic resource</h1>'}));
    await context.route("**/rest/v1/content_chunks*",async route=>{
      if(route.request().method()==="OPTIONS") return route.fallback();
      const question=new URL(route.request().url()).searchParams.get("id")===`eq.${id(23)}`;
      const single = (route.request().headers().accept || "").includes("vnd.pgrst.object");
      await route.fulfill({status:200,headers:{"access-control-allow-origin":"*","content-type":"application/json"},body:JSON.stringify(single ? {
        content_markdown:question?"Original official question and answer.":"Original controlled Notes content.",content_document:null
      } : [])});
    });
    await context.route("**/rest/v1/rpc/bm_*",async route=>{
      if(route.request().method()==="OPTIONS")return route.fallback();
      const name=new URL(route.request().url()).pathname.split("/").pop();
      const p=route.request().postDataJSON()||{};
      trace.push({name,p,at:new Date().toISOString()});
      try {
        if(failSave && name==="bm_mutate" && p.action==="create_thread")throw new Error("Synthetic save failure; please retry");
        const value=await sqlAs(uid,async()=>{
          let query,args;
          if(name==="bm_list_threads"){query="select public.bm_list_threads($1::jsonb) as v";args=[JSON.stringify(p.filters||{})];}
          else if(name==="bm_get_thread"){query="select public.bm_get_thread($1::uuid,$2::integer) as v";args=[p.target_thread_id,p.reply_offset||0];}
          else if(name==="bm_mutate"){query="select public.bm_mutate($1,$2::uuid,$3::jsonb) as v";args=[p.action,p.target_id,JSON.stringify(p.payload||{})];}
          else if(name==="bm_find_chunks"){query="select public.bm_find_chunks($1,$2) as v";args=[p.search_text||"",p.target_program||null];}
          else if(name==="bm_find_material"){query="select public.bm_find_material($1,$2,$3) as v";args=[p.search_text||"",p.target_program||null,p.material_type||"notes"];}
          else if(name==="bm_list_reports"){query="select public.bm_list_reports() as v";args=[];}
          else if(name==="bm_prepare_resource"){query="select public.bm_prepare_resource($1,$2,$3) as v";args=[p.file_name,p.mime_type,p.byte_size];}
          else if(name==="bm_discard_resource"){query="select public.bm_discard_resource($1) as v";args=[p.resource_id];}
          else throw new Error("Unknown test RPC");
          return (await db.query(query,args)).rows[0].v;
        });
        await route.fulfill({status:200,headers:{"access-control-allow-origin":"*","content-type":"application/json"},body:JSON.stringify(value)});
      }catch(e){await route.fulfill({status:400,headers:{"access-control-allow-origin":"*","content-type":"application/json"},body:JSON.stringify({code:"P0001",message:e.message})});}
    });
    await context.route("**/storage/v1/**",async route=>{
      const request=route.request();
      if(request.method()==="OPTIONS")return route.fallback();
      try {
        const pathname=new URL(request.url()).pathname;
        const prefix='/storage/v1/object/bm-resources/';
        if(request.method()==='POST'&&pathname.startsWith(prefix)) {
          const name=decodeURIComponent(pathname.slice(prefix.length));
          await sqlAs(uid,()=>db.query("insert into storage.objects(bucket_id,name,metadata) values('bm-resources',$1,$2)",[
            name,JSON.stringify({size:request.postDataBuffer().length,mimetype:request.headers()['content-type']})]));
          return route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},json:{Key:'bm-resources/'+name}});
        }
        if(request.method()==='DELETE') {
          const p=request.postDataJSON();
          await sqlAs(uid,()=>db.query("delete from storage.objects where bucket_id='bm-resources' and name=any($1::text[])",[p.prefixes]));
          return route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},json:[]});
        }
        if(pathname.startsWith('/storage/v1/object/sign/bm-resources/')) {
          const name=decodeURIComponent(pathname.split('/bm-resources/')[1]);
          const rows=await sqlAs(uid,()=>db.query("select * from storage.objects where bucket_id='bm-resources' and name=$1",[name]));
          assert.equal(rows.rows.length,1,'Signed URL requires readable object');
          return route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},json:{signedURL:'/object/sign/bm-resources/'+name+'?token=synthetic'}});
        }
        return route.fulfill({status:200,body:'Synthetic private file'});
      }catch(e){return route.fulfill({status:403,headers:{'access-control-allow-origin':'*'},json:{message:e.message}});}
    });
  }
  try {
    const context=await browser.newContext({...devices["iPhone 13"],viewport:{width:390,height:844},serviceWorkers:"block"});
    await setup(context); page=await context.newPage(); const errors=[];page.on("pageerror",e=>{errors.push(e.message);console.error("Browser error:",e.message);});
    // Cold Metro builds can outlast WebKit's script-resource timeout.
    const markup=await (await fetch(base,{signal:AbortSignal.timeout(180000)})).text();
    const scripts=await page.evaluate(html=>[...new DOMParser().parseFromString(html,"text/html").scripts].map(script=>script.getAttribute("src")).filter(Boolean),markup);
    console.log("Warming local web bundle...");
    for (const src of scripts) {
      const url=new URL(src,base);assert.equal(url.origin,new URL(base).origin);
      const response=await fetch(url,{signal:AbortSignal.timeout(240000)});assert.ok(response.ok);await response.arrayBuffer();
    }
    console.log("Checking Notes editor and topic switching...");
    await signIn(page); await page.getByRole("tab",{name:/Rabbi Hub/}).click();
    for (const [width,height] of [[1440,1000],[1200,900],[844,390],[320,740]]) {
      await page.setViewportSize({width,height});
      for (const tool of ["Ask Rav Inbox","Shiur Builder","Quick Review Questions","Beis Midrash"]) {
        await page.getByRole("tab",{name:tool,exact:true}).click();
        await page.getByRole("tab",{name:tool,exact:true,selected:true}).waitFor();
        const tabs=page.getByRole("tablist",{name:"Rabbi tools",exact:true}).getByRole("tab");
        assert.equal(await tabs.count(),4);
        const boxes=await tabs.evaluateAll(items=>items.map(item=>item.getBoundingClientRect().toJSON()));
        assert.ok(boxes.every(box=>box.x>=0&&box.right<=width+1&&Math.abs(box.y-boxes[0].y)<1),`Four visible tools in one row: ${tool} / ${width}`);
        const program=await page.getByRole("button",{name:"Winter 5787",exact:true}).boundingBox();
        assert.ok(program&&program.y+program.height<=boxes[0].y+1,"Zeman stays in the header above the tool row");
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        await page.screenshot({path:path.join(out,`tools-${tool.replaceAll(" ","-")}-${width}.png`),scale:"css"});
      }
    }
    await page.setViewportSize({width:1440,height:1000});
    const filterButton=page.getByRole('button',{name:'Discussion filters',exact:true});
    await filterButton.hover();
    const help=page.getByRole('tooltip');
    await help.waitFor();assert.match(await help.textContent(),/Show filters for zeman, status, section, author/);
    const helpBox=await help.boundingBox();assert.ok(helpBox.x>=8&&helpBox.x+helpBox.width<=1440-7,'Right-edge filter tooltip remains on screen');
    await page.screenshot({path:path.join(out,'filters-hover.png'),scale:'css'});
    await page.mouse.move(0,0);await help.waitFor({state:'hidden'});
    await filterButton.focus();await help.waitFor();
    assert.equal(await filterButton.getAttribute('aria-describedby'),await help.getAttribute('id'));
    await page.keyboard.press('Escape');await help.waitFor({state:'hidden'});
    await filterButton.click();
    await page.getByText('Search scope',{exact:true}).waitFor();
    await filterButton.click();
    await page.setViewportSize({width:390,height:844});
    await page.getByRole("button",{name:"Start Discussion",exact:true}).waitFor();
    await page.getByRole("button",{name:"Start Discussion",exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'Summer 5786',exact:true}).count(),0,'Test zeman stays hidden in header and composer');
    await page.getByRole("textbox",{name:"Title",exact:true}).fill(title);
    await page.getByRole("textbox",{name:"Question, sources, or discussion",exact:true}).fill(body);
    assert.equal(await page.getByRole("button",{name:"Post",exact:true}).isDisabled(),true,"Official Notes require a link");
    assert.equal(await page.getByRole('textbox',{name:'Official Notes (required)',exact:true}).count(),0,'Official selection is not a typing field');
    const workbook=page.getByRole('button',{name:'Hafrasha Challah Part 1',exact:true});
    await workbook.waitFor();
    assert.equal(await workbook.count(),1,'Workbook title is shown once, above its sections');
    await workbook.click();
    assert.equal(await page.getByRole('button',{name:'Section B - The Obligation of Challah',exact:true}).count(),0);
    await workbook.click();
    await page.getByRole("button",{name:"Section B - The Obligation of Challah",exact:true}).click();
    await page.screenshot({path:path.join(out,'official-picker-workbook.png'),scale:'css'});
    await page.getByRole("button",{name:"View Notes B3",exact:true}).click();
    await page.getByText("Original controlled Notes content.",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Link to Discussion",exact:true}).click();
    await page.getByRole("button",{name:"Close",exact:true}).click();
    assert.equal(await page.getByRole("checkbox",{name:"Link B3",exact:true}).isChecked(),true);
    await page.getByRole("button",{name:"Section B - The Obligation of Challah",exact:true}).click();
    assert.equal(await page.getByRole("checkbox",{name:"Link B3",exact:true}).count(),0,"Folder can collapse while linked");
    await page.getByRole("button",{name:"Official Questions",exact:true}).click();
    assert.equal(await page.getByRole("button",{name:"Post",exact:true}).isDisabled(),true,"Official Questions require their own link");
    await page.getByRole("button",{name:"Section Q - Review Questions",exact:true}).click();
    await page.getByRole("checkbox",{name:"Link Q1",exact:true}).waitFor();
    assert.equal(await page.getByRole("checkbox",{name:"Link B3",exact:true}).count(),0);
    assert.equal(await page.getByRole("button",{name:"B3 - Remove",exact:true}).count(),0);
    await page.getByRole("checkbox",{name:"Link Q1",exact:true}).click();
    await page.getByRole("button",{name:"Official Notes",exact:true}).click();
    await page.getByRole("button",{name:"Section B - The Obligation of Challah",exact:true}).click();
    await page.getByRole("checkbox",{name:"Link B3",exact:true}).waitFor();
    assert.equal(await page.getByRole("button",{name:"Q1 - Remove",exact:true}).count(),0);
    assert.equal(await page.getByRole("textbox",{name:"Question, sources, or discussion",exact:true}).inputValue(),body);
    await page.getByRole("checkbox",{name:"Link B3",exact:true}).click();
    failSave=true; await page.getByRole("button",{name:"Post",exact:true}).click();
    await page.getByText(/Synthetic save failure/).waitFor();
    assert.equal(await page.getByRole("textbox",{name:"Title",exact:true}).inputValue(),title,"Failed save preserves text");
    failSave=false; await page.getByRole("button",{name:"Post",exact:true}).click();
    await page.getByRole("textbox",{name:"Title",exact:true}).waitFor({state:"hidden"});
    await page.getByRole("button",{name:"View Notes B3",exact:true}).waitFor();
    const tid=new URL(page.url()).searchParams.get("thread"); assert.ok(tid);
    const backButton=page.getByRole('button',{name:'Back to Discussions',exact:true});
    assert.equal(await backButton.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(37, 99, 235)','Back navigation is highlighted');
    const followingButton=page.getByRole('button',{name:'Unfollow discussion',exact:true});
    await followingButton.focus();await page.getByRole('tooltip').waitFor();
    assert.match(await page.getByRole('tooltip').textContent(),/Stop tracking new replies in Following and Unread/);
    await page.keyboard.press('Escape');await page.getByRole('tooltip').waitFor({state:'hidden'});
    await page.screenshot({path:path.join(out,'discussion-actions-phone.png'),scale:'css'});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Labeled actions fit phone width');
    await page.getByText(title,{exact:true}).waitFor();
    assert.equal(await page.getByText(title,{exact:true}).evaluate(el=>getComputedStyle(el).direction),"rtl");
    await page.getByRole("button",{name:"View Notes B3",exact:true}).click();
    await page.getByText("Original controlled Notes content.",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Close",exact:true}).click();
    await page.getByRole("button",{name:"Bookmark discussion",exact:true}).click();
    await page.getByRole("button",{name:"Remove bookmark",exact:true}).waitFor();
    await page.getByRole('button',{name:'Remove bookmark',exact:true}).focus();await page.getByRole('tooltip').waitFor();
    assert.match(await page.getByRole('tooltip').textContent(),/Remove this discussion from Bookmarked/);
    await page.keyboard.press('Escape');
    await page.getByRole("button",{name:"Reply",exact:true}).click();
    await page.getByRole("textbox",{name:"Reply",exact:true}).fill("My first sourced response.");
    await page.getByRole("button",{name:"Post",exact:true}).click();
    await page.getByRole("textbox",{name:"Reply",exact:true}).waitFor({state:"hidden"});
    await page.getByText("My first sourced response.",{exact:true}).waitFor();
    await sqlAs(2,()=>db.query("select public.bm_mutate('reply',$1::uuid,$2::jsonb)",[tid,JSON.stringify({body:"A peer explanation with unique-search-term."})]));
    await page.getByRole("button",{name:"Back to Discussions",exact:true}).click();
    await page.getByRole("button",{name:"Open discussion: "+title,exact:true}).waitFor();
    await page.getByRole("button",{name:"Unread",exact:true}).click();
    await page.getByText("Page 1 - 1 discussions",{exact:true}).waitFor();
    const wholeCard=page.getByRole("button",{name:`Open discussion: ${title}`,exact:true});
    await wholeCard.scrollIntoViewIfNeeded();
    const cardBox=await wholeCard.boundingBox();
    await wholeCard.click({position:{x:8,y:cardBox.height-8}});
    await page.getByText("A peer explanation with unique-search-term.",{exact:true}).waitFor();
    await page.getByRole('button',{name:'Back to Discussions',exact:true}).click();
    await page.getByRole('button',{name:'All',exact:true}).click();
    await wholeCard.focus();await page.keyboard.press('Enter');
    await page.getByText("A peer explanation with unique-search-term.",{exact:true}).waitFor();
    await page.getByRole('button',{name:'Back to Discussions',exact:true}).click();
    await wholeCard.getByText(/English reference/).click();
    await page.getByText("A peer explanation with unique-search-term.",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Reply to Rav One",exact:true}).click();
    await page.getByRole("textbox",{name:"Reply",exact:true}).fill("Thanks for the reference.");
    await page.getByRole("button",{name:"Post",exact:true}).click();
    await page.getByRole("textbox",{name:"Reply",exact:true}).waitFor({state:"hidden"});
    await page.getByText(/replying to Rav One/).waitFor();
    const statusLoaded=page.waitForResponse(response=>response.url().includes("/rpc/bm_get_thread"));
    await page.getByRole("button",{name:"Answered",exact:true}).click();await statusLoaded;
    await page.getByText("Answered",{exact:true}).first().waitFor();
    await page.getByRole("button",{name:"Edit discussion",exact:true}).click();
    await page.getByRole("textbox",{name:"Title",exact:true}).fill("Revised discussion title");
    await page.getByRole("button",{name:"Section B - The Obligation of Challah",exact:true}).waitFor();
    await page.getByText("Loading material...",{exact:true}).waitFor({state:"hidden"});
    await page.getByRole("button",{name:"Save Changes",exact:true}).click();
    await page.getByText("Revised discussion title",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Back to Discussions",exact:true}).click();
    await page.getByRole("button",{name:"All",exact:true}).click();
    const searched = page.waitForResponse(response => response.url().includes("/rpc/bm_list_threads") &&
      response.request().postDataJSON()?.filters?.search === "unique-search-term");
    await page.getByPlaceholder("Search discussions and replies").fill("unique-search-term");
    await searched;
    await page.getByText("Loading discussions...",{exact:true}).waitFor({state:"hidden"});
    await page.getByRole("button",{name:"Open discussion: Revised discussion title",exact:true}).waitFor();
    for(const [width,height] of [[320,740],[844,390],[1440,1000]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.getByText("Private discussion for Rabbonim. Community replies are not official SCP rulings.",{exact:true}).scrollIntoViewIfNeeded();
      const areaButtons=page.getByRole('button',{name:/^(Message Board|Resources & Materials)$/});
      const areaBoxes=await areaButtons.evaluateAll(items=>items.map(item=>item.getBoundingClientRect().toJSON()));
      assert.equal(areaBoxes.length,2);
      assert.ok(Math.abs(areaBoxes[0].y-areaBoxes[1].y)<1&&Math.abs(areaBoxes[0].width-areaBoxes[1].width)<1,'Two equal-width primary areas share one row');
      assert.ok(areaBoxes.every(box=>box.x>=0&&box.right<=width+1),'Illustrated area buttons fit the viewport');
      await page.screenshot({path:path.join(out,`list-top-${width}.png`),scale:"css"});
      await page.getByRole("button",{name:"Open discussion: Revised discussion title",exact:true}).scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No page overflow ${width}`);
      await page.screenshot({path:path.join(out,`list-${width}.png`),scale:"css"});
    }
    console.log("Checking Official Questions and optional resource links...");
    const cleared = page.waitForResponse(response => response.url().includes("/rpc/bm_list_threads") && response.request().postDataJSON()?.filters?.search === "");
    await page.getByPlaceholder("Search discussions and replies").fill("");await cleared;
    await page.getByRole("button",{name:"Message Board",exact:true}).click();
    await page.getByRole("button",{name:"Official Questions",exact:true}).click();
    await page.getByText("Page 1 - 0 discussions",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Start Discussion",exact:true}).click();
    await page.getByRole("textbox",{name:"Title",exact:true}).fill("Official question discussion");
    await page.getByRole("textbox",{name:"Question, sources, or discussion",exact:true}).fill("Discuss this official Q&A.");
    await page.getByRole("button",{name:"Section Q - Review Questions",exact:true}).click();
    await page.getByRole("button",{name:"View Question Q1",exact:true}).click();
    await page.getByText("Original official question and answer.",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Close",exact:true}).click();
    await page.getByRole("checkbox",{name:"Link Q1",exact:true}).click();
    await page.getByRole("button",{name:"Post",exact:true}).click();
    await page.getByRole("textbox",{name:"Title",exact:true}).waitFor({state:"hidden"});
    await page.getByRole("button",{name:"View Question Q1",exact:true}).click();
    await page.getByText("Original official question and answer.",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Close",exact:true}).click();
    await page.getByRole("button",{name:"Back to Discussions",exact:true}).click();
    await page.getByRole("button",{name:"Resources & Materials",exact:true}).click();
    await page.setViewportSize({width:390,height:844});
    await page.getByRole("button",{name:"Start Discussion",exact:true}).click();
    assert.equal(await page.getByRole("checkbox",{name:"Link B3",exact:true}).count(),0);
    await page.getByRole("checkbox",{name:"Link official material (optional)",exact:true}).click();
    await page.getByRole("button",{name:"Official Notes - Section B - The Obligation of Challah",exact:true}).click();
    await page.getByRole("button",{name:"Official Questions - Section Q - Review Questions",exact:true}).click();
    await page.getByRole("checkbox",{name:"Link B3",exact:true}).waitFor();
    await page.getByRole("checkbox",{name:"Link Q1",exact:true}).waitFor();
    await page.getByRole("checkbox",{name:"Link official material (optional)",exact:true}).click();
    await page.getByRole("textbox",{name:"Title",exact:true}).fill("Useful resource discussion");
    await page.getByRole("textbox",{name:"Question, sources, or discussion",exact:true}).fill("A useful text resource without linked material.");
    await page.getByRole('textbox',{name:'Resource Link (optional)',exact:true}).fill('javascript:alert(1)');
    assert.equal(await page.getByRole('button',{name:'Post',exact:true}).isDisabled(),true,'Unsafe link cannot be posted');
    await page.getByRole('textbox',{name:'Resource Link (optional)',exact:true}).fill('https://resources.example.invalid/worksheet');
    await page.getByRole('textbox',{name:'Link Display Name (optional)',exact:true}).fill('Worksheet on the web');
    const chooser=page.waitForEvent('filechooser');
    assert.equal(await page.getByRole('button',{name:'Attach File',exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(37, 99, 235)','Attach File is highlighted blue');
    await page.getByRole('button',{name:'Attach File',exact:true}).click();
    await (await chooser).setFiles({name:'Rabbi worksheet.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic private worksheet')});
    await page.getByRole('button',{name:'Remove attachment Rabbi worksheet.txt',exact:true}).waitFor();
    await page.getByRole('button',{name:'Attach File',exact:true}).waitFor({state:'visible'});
    failSave=true;
    await page.getByRole('button',{name:'Post',exact:true}).click();
    await page.getByText(/Synthetic save failure/).waitFor();
    assert.equal(await page.getByRole('textbox',{name:'Resource Link (optional)',exact:true}).inputValue(),'https://resources.example.invalid/worksheet','Retry retains the web address');
    await page.getByRole('button',{name:'Remove attachment Rabbi worksheet.txt',exact:true}).waitFor();
    failSave=false;
    await page.getByRole("button",{name:"Post",exact:true}).click();
    await page.getByText("Useful resource discussion",{exact:true}).waitFor();
    await page.getByRole('button',{name:'Download Rabbi worksheet.txt',exact:true}).waitFor();
    await page.getByText('Worksheet on the web',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Open Resource',exact:true}).scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Resource link fits phone width');
    await page.screenshot({path:path.join(out,'private-resource.png'),scale:'css'});
    const popupPromise=page.waitForEvent('popup');
    await page.getByRole('button',{name:'Open Resource',exact:true}).click();
    const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');
    assert.equal(popup.url(),'https://resources.example.invalid/worksheet');
    assert.equal(await popup.evaluate(()=>window.opener===null&&document.referrer===''),true,'External links do not receive opener or private discussion URL');
    await popup.close();
    await page.getByRole('button',{name:'Edit discussion',exact:true}).click();
    assert.equal(await page.getByRole('textbox',{name:'Link Display Name (optional)',exact:true}).inputValue(),'Worksheet on the web');
    await page.getByRole('textbox',{name:'Resource Link (optional)',exact:true}).fill('http://resources.example.invalid/revised');
    await page.getByRole('button',{name:'Remove attachment Rabbi worksheet.txt',exact:true}).click();
    await page.getByRole('button',{name:'Save Changes',exact:true}).click();
    await page.getByText('Useful resource discussion',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Download Rabbi worksheet.txt',exact:true}).count(),0);
    await page.getByRole('button',{name:'Open Resource',exact:true}).waitFor();
    const resourceThread=new URL(page.url()).searchParams.get('thread');
    assert.equal((await sqlAs(10,()=>db.query('select resource_url from public.bm_threads where id=$1',[resourceThread]))).rows[0].resource_url,'http://resources.example.invalid/revised');
    await page.getByRole('button',{name:'Edit discussion',exact:true}).click();
    await page.getByRole('button',{name:'Remove Resource Link',exact:true}).click();
    await page.getByRole('button',{name:'Save Changes',exact:true}).click();
    await page.getByText('Useful resource discussion',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Open Resource',exact:true}).count(),0);
    await page.getByRole("button",{name:"Back to Discussions",exact:true}).click();
    await page.getByRole("button",{name:"Open discussion: Useful resource discussion",exact:true}).waitFor();
    assert.equal(await page.getByRole("button",{name:"Open discussion: Official question discussion",exact:true}).count(),0);
    await page.getByRole("button",{name:"Message Board",exact:true}).click();
    await page.getByRole("button",{name:"Open discussion: Official question discussion",exact:true}).waitFor();
    assert.equal(await page.getByRole("button",{name:"Open discussion: Useful resource discussion",exact:true}).count(),0);
    assert.equal(errors.length,0,errors.join("\n")); await context.close();
    // Private deep links survive signing in; no thread content is shown before auth.
    console.log("Checking private links and moderation...");
    const linked=await browser.newContext({...devices["iPhone 13"],serviceWorkers:"block"});await setup(linked);
    page=await linked.newPage();await page.goto(`${base}/beis-midrash?thread=${tid}`);
    await page.getByPlaceholder("Email",{exact:true}).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("bmThread"),tid,"Sign-in retains the requested private discussion");
    assert.equal(await page.getByText("Revised discussion title",{exact:true}).count(),0);
    await page.getByPlaceholder("Email",{exact:true}).fill("webkit-test@example.invalid");
    await page.getByPlaceholder("Password",{exact:true}).fill("synthetic-test-password");
    await page.getByRole("button",{name:"Sign In",exact:true}).click();
    await page.getByText("Revised discussion title",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Report discussion",exact:true}).click();
    await page.getByRole("textbox",{name:"Reason for report",exact:true}).fill("Synthetic moderation review request.");
    await page.getByRole("button",{name:"Submit Report",exact:true}).click();
    await page.getByRole("textbox",{name:"Reason for report",exact:true}).waitFor({state:"hidden"});
    await linked.close();
    const moderation=await browser.newContext({...devices["iPhone 13"],serviceWorkers:"block"});await setup(moderation,"global_admin",1);
    page=await moderation.newPage();await signIn(page);await page.goto(`${base}/beis-midrash`);
    await page.getByRole("button",{name:"Review reports",exact:true}).click();
    await page.getByText("Synthetic moderation review request.",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Open Discussion",exact:true}).click();
    await page.getByRole("button",{name:"Hide reply",exact:true}).first().click();
    await page.getByRole("button",{name:"Restore reply",exact:true}).waitFor();
    await page.getByRole("button",{name:"Restore reply",exact:true}).click();
    await page.getByRole("button",{name:"Restore reply",exact:true}).waitFor({state:"hidden"});
    await page.getByRole("button",{name:"Back to Discussions",exact:true}).click();
    await page.getByRole("button",{name:"Review reports",exact:true}).click();
    await page.getByRole("button",{name:"Mark Reviewed",exact:true}).click();
    await page.getByText("No open reports.",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Back to Discussions",exact:true}).click();
    const summer = page.waitForResponse(response=>response.url().includes("/rpc/bm_list_threads")&&response.request().postDataJSON()?.filters?.program==="summer-5787");
    await page.getByRole("button",{name:"Summer 5787",exact:true}).click();await summer;
    await page.getByText("Hilchos Tefillin",{exact:true}).waitFor();
    const winter = page.waitForResponse(response=>response.url().includes("/rpc/bm_list_threads")&&response.request().postDataJSON()?.filters?.program==="winter-5787");
    await page.getByRole("button",{name:"Winter 5787",exact:true}).click();await winter;
    await page.getByRole("button",{name:"Start Discussion",exact:true}).click();
    await page.getByRole("textbox",{name:"Title",exact:true}).fill("Cross-zeman post");
    assert.equal(await page.getByRole('button',{name:'Summer 5786',exact:true}).count(),0,'Global Admin also does not see the test zeman');
    await page.getByRole("textbox",{name:"Question, sources, or discussion",exact:true}).fill("This belongs to Summer while the header remains Winter.");
    await page.getByRole("button",{name:"Summer 5787",exact:true}).last().click();
    await page.getByRole("button",{name:"Other Learning Questions",exact:true}).click();
    await page.getByRole("button",{name:"Post",exact:true}).click();
    await page.getByText("Cross-zeman post",{exact:true}).waitFor();
    const crossId=new URL(page.url()).searchParams.get("thread");
    assert.equal((await sqlAs(1,()=>db.query("select program_id from public.bm_threads where id=$1",[crossId]))).rows[0].program_id,"summer-5787");
    assert.equal(await page.getByRole("button",{name:"Winter 5787",exact:true}).count(),1,"Composer does not replace the shared header selector");
    await page.getByRole("button",{name:"Summer 5787",exact:true}).click();
    await page.getByRole("button",{name:"Open discussion: Cross-zeman post",exact:true}).waitFor();
    assert.ok(!new URL(page.url()).searchParams.get("thread"),"Changing header zeman returns to its discussion list");
    await moderation.close();
    // Visiting another chaburah keeps the worldwide space, not the local tools.
    const visitor=await browser.newContext({...devices["iPhone 13"],serviceWorkers:"block"});
    await setup(visitor,"local_rabbi",10,{chaburah_members:[
      {id:"own",user_id:id(10),chaburah_id:id(99),member_role:"rabbi",status:"active"},
      {id:"visiting",user_id:id(10),chaburah_id:id(20),member_role:"participant",status:"active"}
    ]});
    page=await visitor.newPage();await signIn(page);await page.getByRole("tab",{name:/Rabbi Hub/}).click();
    await page.getByRole("button",{name:"Start Discussion",exact:true}).waitFor();
    assert.equal(await page.getByRole("tab",{name:"Shiur Builder",exact:true}).count(),0);
    assert.equal(await page.getByRole("tab",{name:"Quick Review Questions",exact:true}).count(),0);await visitor.close();
    const participant=await browser.newContext({...devices["iPhone 13"],serviceWorkers:"block"});await setup(participant,"participant",4);
    page=await participant.newPage();await signIn(page);await page.goto(`${base}/beis-midrash?thread=${tid}`);
    await page.getByRole("heading",{name:"This Week in SCP",exact:true}).waitFor();
    assert.equal(await page.getByText("Revised discussion title",{exact:true}).count(),0);
    const blocked=await page.evaluate(async()=>{const r=await fetch("https://synthetic.invalid/rest/v1/rpc/bm_list_threads",{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filters:{}})});return {status:r.status,text:await r.text()};});
    assert.equal(blocked.status,400);assert.ok(!blocked.text.includes("Revised discussion title"));await participant.close();
    console.log("PASS: browser + local SQL/Storage, mandatory Notes/Q&A links, named sections and previews, private resource upload/retry/removal, organized boards, post/edit, replies, following/unread/bookmark, search/moderation, RTL/responsive layout, private sign-in links and participant denial.");
  }catch(e){fs.writeFileSync(path.join(out,"trace.json"),JSON.stringify(trace,null,2));
    const debug=await sqlAs(10,()=>db.query("select r.author_id,r.created_at,f.last_read_at from public.bm_replies r join public.bm_follows f on f.thread_id=r.thread_id where f.user_id=$1",[id(10)]));
    fs.writeFileSync(path.join(out,"unread-debug.json"),JSON.stringify(debug.rows,null,2));
    if(page&&!page.isClosed())await page.screenshot({path:path.join(out,"failure.png"),fullPage:true}).catch(()=>{});throw e;}
  finally{await browser.close();await db.close();stopServer();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
