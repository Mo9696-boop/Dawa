import {test} from 'node:test';import assert from 'node:assert/strict';import {createHandler} from '../supabase/functions/_shared/handler.mjs';import {today} from '../supabase/functions/_shared/model.mjs';
const origin='https://example.github.io';const key='private-setup-key-with-at-least-32-characters';
function memoryStore(){let version=0,data=null;const limits=new Map();return {async read(){return {version,data:structuredClone(data)};},async commit(v,next){if(v!==version)return false;data=structuredClone(next);version++;return true;},async allow(k,max){const n=(limits.get(k)||0)+1;limits.set(k,n);return n<=max;},snapshot:()=>structuredClone(data),mutate:fn=>{fn(data);version++;}};}
function client(handler){return async(body,token='',overrides={})=>{const r=await handler(new Request('https://project.supabase.co/functions/v1/dawa',{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json','x-dawa-session':token,...overrides},body:body?JSON.stringify(body):undefined}));return {status:r.status,body:await r.json(),headers:r.headers};};}
test('GitHub Pages: complete admin/patient lifecycle with server-side permissions and CAS',async()=>{
 const store=memoryStore();const handler=createHandler({store,allowedOrigin:origin,setupKey:key});const call=client(handler);
 assert.equal((await call()).status,401);assert.equal((await call()).body.configured,false);
 assert.equal((await call({type:'setup',key:'bad',username:'son',password:'test-only-password-123'})).status,403);
 const account=await call({type:'setup',key,username:'son',password:'test-only-password-123'});assert.equal(account.status,200);const admin=account.body.sessionToken;assert.equal(account.body.data.meds.length,7);assert.equal(account.body.data.occ.length,0);assert(!account.body.data.auth);
 assert.equal((await call({type:'setup',key,username:'other',password:'test-only-password-123'})).status,409);
 assert.equal((await call({type:'login',username:'son',password:'wrong'})).status,401);
 const login=await call({type:'login',username:'son',password:'test-only-password-123'});assert.equal(login.body.role,'admin');assert.notEqual(login.body.sessionToken,admin);
 const inv=await call({type:'invite'},admin);const token=inv.body.invitation;assert.equal(token.length,64);assert(!inv.body.data.invites[0].hash);
 const accepting=await Promise.all([call({type:'accept',token,consent:true}),call({type:'accept',token,consent:true})]);assert.deepEqual(accepting.map(r=>r.status).sort(),[200,403]);const joined=accepting.find(r=>r.status===200);const mother=joined.body.sessionToken;
 assert.equal(joined.body.role,'patient');assert(!joined.body.data.audit);assert.equal((await call({type:'profile',op:'forbidden',name:'bad'},mother)).status,403);assert.equal((await call({type:'invite'},mother)).status,403);
 const date=today();const medicine={...account.body.data.meds[0],status:'active',start:date,times:['23:59'],days:[0,1,2,3,4,5,6],photo:'data:image/png;base64,aGVsbG8='};
 assert.equal((await call({type:'med',op:'activate',effective:date,verified:true,med:medicine},admin)).status,200);
 const patient=await call(undefined,mother);assert.equal(patient.body.data.occ.length,1);const o=patient.body.data.occ[0];const take={type:'take',id:o.id,revision:0,op:'offline-replay',sessionKey:patient.body.sessionKey,at:new Date().toISOString()};
 const double=await Promise.all([call(take,mother),call(take,mother)]);assert(double.every(r=>r.status===200));const seen=await call(undefined,admin);assert.equal(seen.body.data.occ[0].revision,1);assert.equal(seen.body.data.occ[0].actor,'patient');
 assert.equal((await call({...take,op:'stale'},mother)).status,409);assert.equal((await call({type:'undo',id:o.id,revision:1,op:'correct'},admin)).status,200);
 assert.equal((await call({...take,revision:2,op:'future',at:new Date(Date.now()+60000).toISOString()},mother)).status,400);
 const before=await call(undefined,admin);assert(before.body.data.audit.some(a=>a.type==='undo'));assert.equal((await call({type:'revoke',id:before.body.data.devices[0].id,op:'revoke'},admin)).status,200);assert.equal((await call(undefined,mother)).status,401);
 assert.equal((await call({type:'logout'},admin)).status,200);assert.equal((await call(undefined,admin)).status,401);
 const raw=JSON.stringify(store.snapshot());assert(!raw.includes('test-only-password-123'));assert(!raw.includes(admin));assert(!raw.includes(mother));
});
test('rejects wrong origins, forged headers, expired invitations and expired sessions',async()=>{
 const store=memoryStore();const handler=createHandler({store,allowedOrigin:origin,setupKey:key});const call=client(handler);
 assert.equal((await call(undefined,'',{'oai-authenticated-user-id':'owner'})).status,401);
 assert.equal((await call(undefined,'',{Origin:'https://attacker.example'})).status,403);
 const preflight=await handler(new Request('https://backend/edge',{method:'OPTIONS',headers:{Origin:origin}}));assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),origin);assert(!preflight.headers.get('access-control-allow-credentials'));
 const a=await call({type:'setup',key,username:'son',password:'test-only-password-123'});const admin=a.body.sessionToken;const invitation=await call({type:'invite'},admin);store.mutate(s=>s.invites[0].expires=0);
 assert.equal((await call({type:'accept',token:invitation.body.invitation,consent:true})).status,403);
 store.mutate(s=>s.auth.sessions.forEach(x=>x.expires=0));assert.equal((await call(undefined,admin)).status,401);
});
test('rate limit, payload cap, incomplete server configuration',async()=>{
 assert.throws(()=>createHandler({store:memoryStore(),allowedOrigin:origin+'/repo/',setupKey:key}));
 const call=client(createHandler({store:memoryStore(),allowedOrigin:origin,setupKey:key}));for(let i=0;i<40;i++)await call({type:'setup',key:'wrong'});assert.equal((await call({type:'setup',key:'wrong'})).status,429);
 assert.equal((await call({type:'x',value:'x'.repeat(400001)})).status,413);
});
