// Safari-engine regression checks with synthetic accounts and intercepted Supabase APIs.
// No credentials, accounts, or data from the live project are used.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {spawn} = require("node:child_process");
const root = path.resolve(__dirname,"..");
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root,"tmp/webkit-browsers");
const {webkit, devices} = require(path.join(root,"tmp/webkit-tests/node_modules/playwright"));
const output = path.join(root,"tmp/mobile-webkit-results");
fs.mkdirSync(output,{recursive:true});
const base = "http://localhost:8081";
const userId = "00000000-0000-4000-8000-000000000010";
const chaburahId = "00000000-0000-4000-8000-000000000020";
const programs = [
  {id:"winter-5787",name:"Winter 5787",topic:"Challah & Terumos/Maasros",default_week:1,archived:false,early_access:false},
  {id:"summer-5787",name:"Summer 5787",topic:"Hilchos Tefillin",default_week:1,archived:false,early_access:true}
];
let server;
async function ensureServer() {
  try {const response=await fetch(base,{signal:AbortSignal.timeout(2000)});if(response.ok)return;} catch {}
  server=spawn(process.execPath,["node_modules/expo/bin/cli","start","--offline","--port","8081"],{
    cwd:root,windowsHide:true,stdio:["ignore",fs.openSync(path.join(output,"expo.stdout.log"),"w"),fs.openSync(path.join(output,"expo.stderr.log"),"w")]
  });
  const deadline=Date.now()+240000;
  while(Date.now()<deadline) {
    if(server.exitCode!==null)throw new Error(`Expo stopped: ${server.exitCode}. See ${output}`);
    try {const response=await fetch(base,{signal:AbortSignal.timeout(2000)});if(response.ok)return;} catch {}
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  throw new Error("Local Expo server did not become ready within four minutes.");
}
async function fixture(context, role) {
  const now=Math.floor(Date.now()/1000);
  const jwtPart=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
  const user={id:userId,aud:"authenticated",role:"authenticated",email:"webkit-test@example.invalid",app_metadata:{provider:"email",providers:["email"]},user_metadata:{},created_at:new Date().toISOString()};
  const token=`${jwtPart({alg:"HS256",typ:"JWT"})}.${jwtPart({sub:userId,aud:"authenticated",role:"authenticated",exp:now+3600,iat:now})}.synthetic-signature`;
  const profile={id:userId,email:user.email,full_name:"WebKit Test User",phone:null,city:"Test City",state:null,country:"United States",role,current_chaburah_id:chaburahId};
  const tables={
    profiles:[profile],
    chaburos:[{id:chaburahId,name:"Preview Chaburah",slug:"webkit-preview",city:"Test City",country:"United States",status:"active",rabbi_name:"Preview Rav",schedule_text:"Sunday 8:00 PM",member_count:1,discussion_enabled:false,join_requires_approval:false,ask_rav_enabled:true,default_program_id:"winter-5787"}],
    chaburah_members:[{id:"test-membership",user_id:userId,chaburah_id:chaburahId,member_role:role==="local_rabbi"?"rabbi":"participant",status:"active",joined_at:new Date().toISOString(),updated_at:new Date().toISOString()}],
    learning_programs:role==="global_admin"?programs:programs.slice(0,1),
    chaburah_programs:[{chaburah_id:chaburahId,program_id:"winter-5787",current_week:1},{chaburah_id:chaburahId,program_id:"summer-5787",current_week:3}],
    learning_program_chaburos:[],app_settings:[{id:true,current_review_week:1}]
  };
  let intercepted=0;
  await context.route("**/*",async route=>{
    const request=route.request(), url=new URL(request.url());
    if(url.hostname==="localhost"||url.hostname==="127.0.0.1")return route.continue();
    intercepted++;
    const headers={"access-control-allow-origin":"*","access-control-allow-headers":"*","access-control-allow-methods":"*"};
    if(request.method()==="OPTIONS")return route.fulfill({status:204,headers});
    let result;
    if(url.pathname.includes("/auth/v1/token"))result={access_token:token,refresh_token:"synthetic-refresh-token",expires_in:3600,expires_at:now+3600,token_type:"bearer",user};
    else if(url.pathname.includes("/auth/v1/user"))result=user;
    else if(url.pathname.includes("/rest/v1/rpc/"))result=url.pathname.endsWith("count_unread_discussion_messages")?0:[];
    else if(url.pathname.includes("/rest/v1/")) {
      result=tables[url.pathname.split("/").pop()]??[];
      if((request.headers().accept??"").includes("vnd.pgrst.object+json"))result=result[0]??null;
    } else return route.abort("blockedbyclient");
    return route.fulfill({status:200,headers:{...headers,"content-type":"application/json"},body:JSON.stringify(result)});
  });
  return ()=>intercepted;
}
async function geometry(page) {
  return page.evaluate(()=>{
    const heading=document.querySelector('[role="heading"],h1,h2');
    const rect=heading?.getBoundingClientRect();
    const range=heading?document.createRange():null;
    range?.selectNodeContents(heading);
    const lines=range?[...range.getClientRects()].filter(r=>r.width>0).length:0;
    const outside=[...document.querySelectorAll('[role="button"],a,input')].filter(element=>{
      const box=element.getBoundingClientRect();
      return box.width>0&&box.height>0&&box.top>=0&&box.top<innerHeight&&(box.right>innerWidth+1||box.left< -1);
    }).map(element=>element.getAttribute("aria-label")||element.textContent);
    const tabs=[...document.querySelectorAll('[role="tab"]')].map(tab=>({text:tab.textContent,box:tab.getBoundingClientRect().toJSON(),
      children:[...tab.querySelectorAll('*')].filter(e=>e.childNodes.length===1&&e.firstChild.nodeType===Node.TEXT_NODE).map(e=>({text:e.textContent,box:e.getBoundingClientRect().toJSON(),overflow:getComputedStyle(e).overflow}))}));
    return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,headingWidth:rect?.width,headingHeight:rect?.height,headingLines:lines,outside,tabs};
  });
}
async function signIn(page) {
  await page.goto(`${base}/auth`,{waitUntil:"domcontentloaded",timeout:180000});
  await page.getByPlaceholder("Email",{exact:true}).waitFor({timeout:180000});
  await page.getByPlaceholder("Email",{exact:true}).fill("webkit-test@example.invalid");
  await page.getByPlaceholder("Password",{exact:true}).fill("synthetic-test-password");
  await page.getByRole("button",{name:"Sign In",exact:true}).click();
  await page.getByRole("heading",{name:"This Week in SCP",exact:true}).waitFor({timeout:60000});
  await page.getByText("Winter 5787 - Week 1",{exact:true}).waitFor();
}
async function main() {
  let browser;
  let activePage;
  const results=[];
  try {
    await ensureServer();
    browser=await webkit.launch({headless:true});
    console.log(`WebKit launched: ${browser.version()}`);
    for(const role of ["participant","local_rabbi","global_admin"]) {
      const context=await browser.newContext({...devices["iPhone 13"],viewport:{width:390,height:844},serviceWorkers:"block"});
      const requests=await fixture(context,role);
      const page=await context.newPage();
      activePage=page;
      const errors=[];page.on("pageerror",error=>errors.push(error.message));
      await signIn(page);
      for(const width of role==="participant"?[320,375,390,430]:[390]) {
        console.log(`Checking ${role} at ${width}px`);
        await page.setViewportSize({width,height:844});
        await page.getByRole("button",{name:"Open navigation menu",exact:true}).waitFor();
        const dimensions=await geometry(page);
        assert.equal(dimensions.viewport,width);
        assert.ok(dimensions.documentWidth<=width+1,JSON.stringify(dimensions));
        assert.ok(dimensions.headingWidth>=100,JSON.stringify(dimensions));
        assert.ok(dimensions.headingLines<=3,JSON.stringify(dimensions));
        assert.deepEqual(dimensions.outside,[],JSON.stringify(dimensions));
        for(const tab of dimensions.tabs) {
          const label=tab.children.find(child=>/[A-Za-z]/.test(child.text));
          assert.ok(label&&label.box.height>=15,`Bottom-tab label is clipped: ${JSON.stringify(tab)}`);
        }
        assert.equal(await page.getByText("Learning",{exact:true}).count(),0,"Desktop sidebar must not render at phone widths");
        const tabs=page.getByRole("tab");
        assert.equal(await tabs.count(),4,"Only four phone tabs");
        const tabNames=await tabs.allTextContents();
        assert.ok(tabNames.some(label=>label.includes(role==="participant"?"Review":"Rabbi Hub")));
        await page.screenshot({path:path.join(output,`${role}-${width}.png`),scale:"css"});
        await page.getByRole("button",{name:"Open navigation menu",exact:true}).click();
        await page.getByRole("button",{name:"Close navigation menu",exact:true}).waitFor();
        // Wait for RN Web's modal to enter its fixed-position animation container
        // before scrolling it; its first render is an invisible static portal.
        await page.waitForFunction(()=>{
          let parent=document.querySelector('[aria-label="Close navigation menu"]');
          while(parent) {
            const style=getComputedStyle(parent);
            if(style.position==="fixed"&&style.zIndex==="9999")return true;
            parent=parent.parentElement;
          }
          return false;
        });
        await page.getByRole("button",{name:"Close navigation menu",exact:true}).evaluate(async element=>{
          for(let parent=element;parent;parent=parent.parentElement) {
            await Promise.all(parent.getAnimations().map(animation=>animation.finished.catch(()=>{})));
          }
        });
        assert.equal(await page.getByText("Admin",{exact:true}).isVisible(),role!=="participant");
        for(const group of ["Support"]) {
          assert.ok(await page.getByText(group,{exact:true}).isVisible(),`Grouped mobile menu: ${group}`);
        }
        assert.equal(await page.getByText("Management",{exact:true}).isVisible(),role!=="participant");
        const menu=page.locator('[aria-label="Main navigation"]');
        for(const label of ["Dashboard","My Chaburah","Files","Rabbi Hub"]){
          assert.equal(await menu.getByRole("button",{name:label,exact:true}).count(),0,`${label} must not duplicate a bottom tab`);
        }
        assert.equal(await menu.getByRole("button",{name:"Review",exact:true}).count(),role==="participant"?0:1);
        await page.screenshot({path:path.join(output,`${role}-${width}-menu.png`),scale:"css"});
        const settings=page.getByRole("button",{name:"Settings",exact:true});
        await settings.evaluate(element=>element.scrollIntoView({block:"center",behavior:"instant"}));
        let settingsBox=await settings.boundingBox();
        const visibleHeight=await page.evaluate(()=>innerHeight);
        if(settingsBox.y+settingsBox.height>visibleHeight) {
          // Mobile WebKit does not reliably synthesize desktop wheel events.
          // Exercise its native scroll-into-view API, then use a normal click.
          await page.getByRole("button",{name:"Settings",exact:true}).evaluate(element=>element.scrollIntoView({block:"center"}));
          settingsBox=await page.getByRole("button",{name:"Settings",exact:true}).boundingBox();
          assert.ok(settingsBox.y+settingsBox.height<=visibleHeight,"Menu must scroll Settings into the visible phone viewport");
        }
        // Use a real touch event without desktop click's additional auto-scroll.
        const point={x:settingsBox.x+settingsBox.width/2,y:settingsBox.y+settingsBox.height/2};
        await page.waitForFunction(({x,y})=>document.elementFromPoint(x,y)?.closest('[aria-label="Settings"]'),point);
        await page.touchscreen.tap(point.x,point.y);
        await page.getByRole("heading",{name:"Settings",exact:true}).waitFor();
        await page.getByRole("tab",{name:/Dashboard/}).click();
        await page.getByRole("heading",{name:"This Week in SCP",exact:true}).waitFor();
        results.push({role,width,...dimensions});
      }
      // Shared screen chrome must stay compact on the primary phone pages too.
      for(const [tab,heading] of [["My Chaburah","My Chaburah"],["Files","Files"],
        role==="participant"?["Review","Review Questions"]:["Rabbi Hub","Rabbi Hub"]]) {
        await page.getByRole("tab",{name:new RegExp(tab)}).click();
        await page.getByRole("heading",{name:heading,exact:true}).waitFor();
        console.log(`Checking ${role}: ${heading}`);
        const dimensions=await geometry(page);
        assert.ok(dimensions.documentWidth<=dimensions.viewport+1,`${heading}: ${JSON.stringify(dimensions)}`);
        assert.deepEqual(dimensions.outside,[],`${heading}: ${JSON.stringify(dimensions)}`);
        await page.screenshot({path:path.join(output,`${role}-${tab.replace(/ /g,"-").toLowerCase()}.png`),scale:"css"});
      }
      await page.getByRole("tab",{name:/Dashboard/}).click();
      if(role==="global_admin") {
        await page.getByRole("button",{name:"Summer 5787",exact:true}).click();
        await page.getByText("Summer 5787 - Week 3",{exact:true}).waitFor();
        assert.ok(await page.getByText("Hilchos Tefillin",{exact:true}).count()>0);
        await page.getByRole("button",{name:"Winter 5787",exact:true}).click();
        await page.getByText("Winter 5787 - Week 1",{exact:true}).waitFor();
      }
      // A wide browser still gets the existing sidebar.
      await page.setViewportSize({width:1280,height:900});
      await page.getByText("Learning",{exact:true}).waitFor();
      assert.equal(await page.getByRole("button",{name:"Open navigation menu",exact:true}).count(),0);
      await page.screenshot({path:path.join(output,`${role}-desktop.png`),scale:"css"});
      assert.deepEqual(errors,[],`Browser runtime errors: ${errors.join("; ")}`);
      assert.ok(requests()>0,"Supabase requests must be intercepted");
      await context.close();
      activePage=null;
    }
    fs.writeFileSync(path.join(output,"results.json"),JSON.stringify({engine:"Playwright WebKit (not an actual iPhone)",version:browser.version(),results},null,2));
    console.log(`PASS: WebKit phone layouts, four bottom tabs, hamburger navigation, permissions, program switching and desktop sidebar. Screenshots: ${output}`);
  } catch(error) {
    if(activePage&&!activePage.isClosed()) {
      await activePage.screenshot({path:path.join(output,"failure.png"),scale:"css"}).catch(()=>{});
      fs.writeFileSync(path.join(output,"failure.txt"),`${error.stack}\n\n${await activePage.locator("body").innerText().catch(()=>"")}`);
      fs.writeFileSync(path.join(output,"failure-geometry.json"),JSON.stringify(await geometry(activePage),null,2));
    }
    throw error;
  } finally {
    await browser?.close();
    if(server&&!server.killed)server.kill();
  }
}
module.exports={fixture,geometry,ensureServer,signIn};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
