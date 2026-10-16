const assert=require("node:assert/strict"),fs=require("node:fs");
const {bank}=require("./test_public_review_csv.cjs");
const {createLegacyDatabase,USER,PARTICIPANT,RABBI}=require("./test_learning_programs.cjs");
async function main(){
  const db=await createLegacyDatabase();
  try{
    await db.exec(`create type public.review_question_kind as enum ('true_false','multiple_choice');
      alter table public.review_questions add column topic text not null default 'Old',add column prompt text not null default 'Old',
        add column kind public.review_question_kind not null default 'true_false',add column created_by uuid references public.profiles(id),
        add column created_at timestamptz default now(),add column updated_at timestamptz default now();
      alter table public.review_question_answers add constraint answer_question foreign key(question_id) references public.review_questions(id);`);
    await db.exec(fs.readFileSync("supabase/migrations/202607120001_add_model_review_questions.sql","utf8"));
    await db.exec(fs.readFileSync("supabase/migrations/202610070001_learning_programs.sql","utf8"));
    await db.exec(fs.readFileSync("supabase/migrations/202610140002_import_public_review_csv.sql","utf8"));
    const query=async(sql,params=[]) => (await db.query(sql,params)).rows;
    const count=async()=> (await query("select count(*)::int n from public.review_questions"))[0].n;
    const request=async(rows,commit=false,program="winter-5787") => (await query("select public.import_public_review_library($1,$2::jsonb,$3) result",[program,JSON.stringify(rows),commit]))[0].result;
    const snapshot=await query("select * from public.review_questions order by id");
    const scores=await query("select * from public.review_sessions");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[USER]);
    await db.exec("set role authenticated");
    let result=await request(bank);
    assert.equal(result.new_count,49);assert.deepEqual(result.errors,[]);assert.equal(result.committed,false);
    await db.exec("reset role");assert.equal(await count(),2,"Preview writes nothing");
    await db.exec("set role authenticated");
    result=await request(bank,true);assert.equal(result.new_count,49);assert.equal(result.committed,true);
    result=await request(bank,true);assert.equal(result.new_count,0);assert.equal(result.skipped_count,49);
    await db.exec("reset role");assert.equal(await count(),51);
    const imported=await query("select q.*,a.correct_choice_index,a.explanation from public.review_questions q join public.review_question_answers a on a.question_id=q.id where q.program_id='winter-5787'");
    assert.equal(imported.filter(q=>q.is_model_question).length,36);
    for(const expected of bank){
      const row=imported.find(q=>q.prompt===expected.prompt);
      assert.equal(row.created_by,USER);assert.equal(row.chaburah_id,null);assert.equal(row.visibility,"everyone");
      assert.equal(row.publication_status,"published");assert.equal(row.is_library_question,true);assert.equal(row.source_question_id,null);
      assert.equal(row.correct_choice_index,expected.correct_choice_index);assert.deepEqual(row.choices,Array.from(expected.choices));
      assert.equal(row.explanation,expected.explanation);
    }
    const newRow={...bank[0],prompt:"A brand new question"};
    for(const invalid of [{...newRow,week:53},{...newRow,week:1.5},{...newRow,correct_choice_index:7},
      {...newRow,is_model_question:"TRUE"},{...newRow,choices:["True","True"]},{...newRow,chaburah_id:"forbidden"}]){
      assert.ok((await request([newRow,invalid])).errors.length);
      await assert.rejects(request([newRow,invalid],true),/Import blocked/);
      assert.equal(await count(),51,"Invalid batch rolls back all questions");
    }
    const conflict={...bank[0],explanation:"A different explanation"};
    assert.ok((await request([conflict])).errors[0].message.includes("different"));
    await assert.rejects(request([newRow,conflict],true),/Import blocked/);assert.equal(await count(),51);
    await assert.rejects(request([newRow,newRow],true),/Duplicate prompt/);
    await request([bank[0]],true,"summer-5786");
    assert.equal(await count(),52,"Same prompt in a different program remains independent");
    await db.exec("update public.learning_programs set archived=true where id='winter-5787'");
    await assert.rejects(request([newRow]),/non-archived/);
    await db.exec("update public.learning_programs set archived=false where id='winter-5787'");
    await assert.rejects(request([newRow],true,"not-a-program"),/non-archived/);
    for(const user of [PARTICIPANT,RABBI,""]){
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
      await assert.rejects(request([newRow]),/Only a Global Admin/);
      await assert.rejects(request([newRow],true),/Only a Global Admin/);
    }
    assert.deepEqual(await query("select * from public.review_questions where id=any($1::uuid[]) order by id",[snapshot.map(q=>q.id)]),snapshot);
    assert.deepEqual(await query("select * from public.review_sessions"),scores);
    console.log("PASS: Global Admin-only dry run and atomic import; exact answers/model/program/public scope; repeat-safe skips; conflicts, duplicate/invalid rows, archived programs and unauthorized requests rejected; existing questions and scores untouched.");
  }finally{await db.close();}
}
main().catch(error=>{console.error(error.message,error.where??"");process.exitCode=1;});
