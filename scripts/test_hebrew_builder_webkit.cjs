// Synthetic app accounts/storage only; no live Supabase requests.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fixture,signIn,ensureServer,stopServer}=require('./test_mobile_webkit.cjs');
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve('tmp/webkit-browsers');
const {webkit,devices}=require(path.resolve('tmp/webkit-tests/node_modules/playwright'));
const base=process.env.MYSCP_TEST_URL||'http://localhost:8088';
const out=path.resolve('tmp/hebrew-builder-tests');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const english=JSON.parse(fs.readFileSync('tmp/shiur-import-preview/challah-part1/import/payload.json','utf8'));
const chunks=english.chunks.map((c,i)=>({...c,id:id(i+1),language:'en'}));
const translations=JSON.parse(fs.readFileSync('tmp/shiur-import-preview/challah-hebrew-part1/import/payload.json','utf8')).map(t=>({...t,chunk_id:chunks.find(c=>c.chunk_code===t.chunk_code).id}));
const now=new Date().toISOString();
const customTitle='חזרה לשיעור - חיוב הפרשת חלה';
let packets=[{id:id(500),chaburah_id:id(20),created_by:id(10),program_id:'winter-5787',week:1,title:'Original English packet',siman:'Challah',status:'published',language:'en',created_at:now,updated_at:now,chunk_heading_options:{}}];
let items=[{id:id(700),packet_id:id(500),chunk_id:chunks[0].id,sort_order:0}];
let files=[{id:id(600),chaburah_id:id(20),uploaded_by:id(10),program_id:'winter-5787',week:1,coverage:'week',title:'English archive file',topic:'Challah',visibility:'chaburah',file_type:'custom_review_packet',review_packet_id:id(500),language:'en',created_at:now}];
const links=english.links.map((l,i)=>({id:id(2000+i),parent_chunk_id:chunks.find(c=>c.chunk_code===l.parent).id,related_chunk_id:chunks.find(c=>c.chunk_code===l.related).id,relation_type:l.relation_type}));
const mutations=[];let next=800;
async function main(){
  fs.mkdirSync(out,{recursive:true});await ensureServer();const browser=await webkit.launch({headless:true});let page;
  try{
    const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844},serviceWorkers:'block'});
    await fixture(context,'local_rabbi',{content_chunks:chunks,content_chunk_links:links});
    await context.route('**/rest/v1/**',async route=>{
      const request=route.request(),url=new URL(request.url()),table=url.pathname.split('/').pop();
      if(!['content_chunks','content_chunk_translations','content_chunk_links','review_packets','review_packet_items','review_packet_content_coverage','learning_files','publish_review_packet'].includes(table))return route.fallback();
      const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','content-type':'application/json'};
      if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
      function matches(row){return [...url.searchParams].every(([key,value])=>{
        if(value.startsWith('eq.'))return String(row[key])===value.slice(3);
        if(value.startsWith('in.('))return value.slice(4,-1).split(',').includes(String(row[key]));
        return true;
      });}
      let result=[];
      if(request.method()!=='GET'&&request.method()!=='HEAD')mutations.push({table,method:request.method(),body:request.postDataJSON()});
      if(table==='publish_review_packet'){
        const packet=packets.find(p=>p.id===request.postDataJSON().target_packet_id);packet.status='published';
        const file={...files[0],id:id(next++),title:packet.title,review_packet_id:packet.id,language:packet.language};files.push(file);result=file;
      }else{
        const rows=table==='content_chunks'?chunks:table==='content_chunk_translations'?translations:table==='content_chunk_links'?links:table==='review_packets'?packets:table==='review_packet_items'?items:table==='learning_files'?files:[];
        if(request.method()==='POST'){
          assert.ok(['review_packets','review_packet_items'].includes(table),'App must never write English material or translations');
          const body=request.postDataJSON();const added=(Array.isArray(body)?body:[body]).map(row=>({id:id(next++),created_at:now,updated_at:now,...row}));rows.push(...added);result=added;
        }else if(request.method()==='PATCH'){
          const body=request.postDataJSON();for(const row of rows.filter(matches)){assert.ok(!body.language||body.language===row.language);Object.assign(row,body);}result=rows.filter(matches);
        }else if(request.method()==='DELETE'){
          if(table==='review_packet_items')items=items.filter(row=>!matches(row));
          if(table==='review_packets')packets=packets.filter(row=>!matches(row));
        }else result=rows.filter(matches).map(row=>table==='review_packet_items'?{...row,content_chunks:chunks.find(c=>c.id===row.chunk_id)}:row);
        if(request.headers().accept?.includes('vnd.pgrst.object'))result=result[0]??null;
      }
      if(request.method()==='HEAD')return route.fulfill({status:200,headers:{...headers,'content-range':`0-0/${items.filter(matches).length}`}});
      await route.fulfill({status:200,headers,body:JSON.stringify(result)});
    });
    await context.addInitScript(()=>{
      new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
        if(node instanceof HTMLIFrameElement&&node.contentWindow)node.contentWindow.print=()=>{window.__printed=node.contentWindow.document.documentElement.outerHTML;};
      }))).observe(document,{childList:true,subtree:true});
    });
    page=await context.newPage();page.on('dialog',dialog=>dialog.accept());const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const markup=await (await fetch(base)).text();
    const scripts=await page.evaluate(html=>[...new DOMParser().parseFromString(html,'text/html').scripts].map(s=>s.getAttribute('src')).filter(Boolean),markup);
    for(const src of scripts){const url=new URL(src,base);assert.equal(url.origin,new URL(base).origin);await(await fetch(url,{signal:AbortSignal.timeout(240000)})).arrayBuffer();}
    await signIn(page);await page.getByRole('tab',{name:/Rabbi Hub/}).click();await page.getByRole('tab',{name:'Shiur Builder',exact:true}).click();
    const official=page.getByTestId('builder-official-pane'),packet=page.getByTestId('builder-packet-pane');
    await official.getByRole('button',{name:/Expand Section A -/}).waitFor();
    await page.getByRole('button',{name:'עברית',exact:true}).click();
    await official.getByRole('button',{name:'Expand סעיף א',exact:true}).waitFor();
    assert.equal(await official.getByRole('button',{name:/סעיף [וז]/}).count(),0,'Unavailable Hebrew F-G notes are not replaced by English');
    await official.getByRole('button',{name:'Add Section ->',exact:true}).first().click();
    await page.getByRole('tab',{name:'My Packet',exact:true}).click();
    const titleField=packet.getByPlaceholder('Packet title',{exact:true});
    assert.equal(await titleField.inputValue(),'Preview Chaburah - שבוע 1 - סיכום השיעור');
    assert.equal(await titleField.evaluate(el=>getComputedStyle(el).direction),'rtl');
    assert.equal(await titleField.evaluate(el=>getComputedStyle(el).textAlign),'right');
    await page.getByRole('tab',{name:/Q&A/}).click();
    await page.waitForFunction(()=>document.querySelector('[placeholder="Packet title"]').value==='Preview Chaburah - שבוע 1 - שאלות ותשובות');
    await page.getByRole('tab',{name:/Source Sheets/}).click();
    await page.waitForFunction(()=>document.querySelector('[placeholder="Packet title"]').value==='Preview Chaburah - שבוע 1 - דפי מקורות');
    await page.getByRole('tab',{name:/Review Notes/}).click();
    await titleField.fill(customTitle);
    await page.getByRole('button',{name:'Week 2',exact:true}).click();assert.equal(await titleField.inputValue(),customTitle);
    await page.getByRole('button',{name:'Week 1',exact:true}).click();
    await packet.getByRole('button',{name:'Preview Review Notes',exact:true}).click();
    await page.locator('.rich-document[lang="he"]').first().waitFor();
    await page.getByRole('button',{name:'Print',exact:true}).waitFor();
    await page.evaluate(()=>Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
    assert.equal(await page.getByText(customTitle+' - סיכום השיעור',{exact:true}).last().evaluate(el=>getComputedStyle(el).direction),'rtl');
    assert.equal(await page.locator('.rich-document[lang="en"]').count(),0);
    assert.equal(await page.locator('.rich-document').first().getAttribute('dir'),'rtl');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(out,'hebrew-preview-phone.png'),scale:'css'});
    await page.getByRole('button',{name:'Print',exact:true}).click();await page.waitForFunction(()=>!!window.__printed);
    assert.ok((await page.evaluate(()=>window.__printed)).includes('lang="he" dir="rtl"'));
    assert.equal(await page.evaluate(()=>{const frame=document.querySelector('iframe');return frame.contentWindow.getComputedStyle(frame.contentDocument.querySelector('h1')).textAlign;}),'right');
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await packet.getByRole('button',{name:'Save Draft',exact:true}).click();
    await page.getByText('Draft packet saved.',{exact:true}).waitFor();
    assert.equal(packets.find(p=>p.title===customTitle).language,'he');
    await page.getByRole('button',{name:'English',exact:true}).click();await official.getByRole('button',{name:/Expand Section A -/}).waitFor();
    assert.equal(packets.find(p=>p.id===id(500)).language,'en','English packet stays English');
    await official.getByRole('button',{name:'Add Section ->',exact:true}).first().click();
    await page.getByRole('tab',{name:'My Packet',exact:true}).click();await packet.getByRole('button',{name:'Preview Review Notes',exact:true}).click();
    await page.locator('.rich-document[lang="en"]').first().waitFor();assert.equal(await page.locator('.rich-document[lang="he"]').count(),0);
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.getByRole('button',{name:'עברית',exact:true}).click();await official.getByRole('button',{name:'Expand סעיף א',exact:true}).waitFor();
    await page.getByRole('button',{name:'Show existing packets',exact:true}).click();await page.getByRole('button',{name:'Open',exact:true}).click();
    await page.getByText('Draft loaded.',{exact:true}).waitFor();
    assert.equal(await titleField.inputValue(),customTitle,'Loading a saved Hebrew title does not regenerate it');
    await packet.getByRole('button',{name:'Publish Review Notes',exact:true}).click();
    await page.getByText('Review Notes published to Files and removed from the draft. Other draft categories are unchanged.',{exact:true}).waitFor();
    const published=packets.find(p=>p.language==='he'&&p.status==='published');assert.ok(published);
    assert.equal(files.find(f=>f.review_packet_id===published.id).language,'he');
    await page.getByRole('tab',{name:/Files/}).click();
    await page.waitForURL('**/files');
    await page.getByRole('heading',{name:'Files',exact:true}).waitFor();
    const fileTitle=page.getByTestId('file-title-'+files.find(file=>file.review_packet_id===published.id).id);
    await fileTitle.waitFor();
    assert.equal(await fileTitle.evaluate(el=>getComputedStyle(el).direction),'rtl');
    await page.getByRole('button',{name:'Open',exact:true}).last().click();
    await page.locator('.rich-document[lang="he"]').first().waitFor();
    await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Open',exact:true}).first().click();
    await page.locator('.rich-document[lang="en"]').first().waitFor();assert.equal(await page.locator('.rich-document[lang="he"]').count(),0,'Files uses packet language, not last builder selection');
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.goto(`${base}/shiur-packet?id=${published.id}`);await page.locator('.rich-document[lang="he"]').first().waitFor();
    assert.equal(errors.length,0,errors.join('\n'));
    assert.ok(mutations.filter(m=>m.table==='review_packets'&&m.method==='POST').every(m=>m.body.language==='he'));
    fs.writeFileSync(path.join(out,'mutations.json'),JSON.stringify(mutations,null,2));
    console.log('PASS: actual builder English/Hebrew switch, RTL folders/text, missing F-G, selectable Hebrew, phone layout, Hebrew print, saved draft language, publishing, Files/legacy viewers and English preservation.');
  }catch(error){if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
  finally{await browser.close();stopServer();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
