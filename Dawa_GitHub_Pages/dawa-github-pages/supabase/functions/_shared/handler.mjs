import {initial,generate,change,today} from './model.mjs';
const hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
export const digest=async value=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;};
export async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:600000},key,256));}
/** @returns {never} */
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
function safeData(s,role){if(role==='patient')return {profile:{name:s.profile.name,phone:s.profile.phone},occ:s.occ,images:s.images||{},meds:s.meds.filter(m=>m.kind==='prn'&&m.status==='active').map(m=>({id:m.id,name:m.name,quantity:m.quantity,dose:m.dose})),devices:[],invites:[]};const {auth,ops,...safe}=s;return {...safe,invites:s.invites.map(({hash,...i})=>i)};}
// All database access is server-side. store.commit is a compare-and-swap in PostgreSQL.
export function createHandler({store,allowedOrigin,setupKey,setupKeyHash}){
 if(!allowedOrigin||new URL(allowedOrigin).origin!==allowedOrigin)throw Error('DAWA_ALLOWED_ORIGIN must be an origin without a path.');
 const headers={'Access-Control-Allow-Origin':allowedOrigin,'Access-Control-Allow-Headers':'content-type, apikey, x-dawa-session','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store','Content-Type':'application/json;charset=utf-8','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 return async function handle(request){try{
 if(request.headers.get('origin')!==allowedOrigin)return json({error:'Origine refusée'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(!['GET','POST'].includes(request.method))return json({error:'Méthode refusée'},405);
 let a=null;
 if(request.method==='POST'){
 if(!request.headers.get('content-type')?.startsWith('application/json'))fail('JSON requis',415);
 if(Number(request.headers.get('content-length'))>400000)fail('Requête trop volumineuse',413);
 const reader=request.body?.getReader();let size=0,raw='';const decoder=new TextDecoder();if(reader)for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>400000){await reader.cancel();fail('Requête trop volumineuse',413);}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();
 try{a=JSON.parse(raw);}catch{fail('Requête invalide');}if(!a||typeof a!=='object'||Array.isArray(a))fail('Requête invalide');
 }
 const supplied=request.headers.get('x-dawa-session')||'';const sessionHash=/^[a-f0-9]{64}$/.test(supplied)?await digest(supplied):'';
 const entering=['setup','login','accept'].includes(a?.type);
 if(entering&&!await store.allow('entry:'+a.type,40))fail('Trop de tentatives. Réessayez dans 15 minutes.',429);
 let prepared;
 if(a?.type==='setup'){
 if(!(setupKeyHash||setupKey?.length>=32)||!equal(await digest(String(a.key||'')),setupKeyHash||await digest(setupKey)))fail('Clé de configuration incorrecte.',403);
 if(typeof a.username!=='string'||!a.username.trim()||a.username.length>100||typeof a.password!=='string'||a.password.length<12||a.password.length>256)fail('Identifiant requis et mot de passe de 12 à 256 caractères.');
 const salt=random();prepared={username:a.username.trim().toLowerCase(),salt,hash:await passwordHash(a.password,salt)};
 }
 const issuedToken=entering?random():null;const issuedHash=issuedToken?await digest(issuedToken):null;const issuedId=entering?crypto.randomUUID():null;
 const invitationToken=a?.type==='invite'?random():null;const invitationHash=invitationToken?await digest(invitationToken):null;
 const acceptHash=a?.type==='accept'?await digest(String(a.token||'')):null;
 let checkedLogin=null;
 for(let attempt=0;attempt<6;attempt++){
 const row=await store.read();const s=row.data||initial();s.images||={};s.auth||={admin:null,sessions:[]};const now=Date.now();s.auth.sessions=s.auth.sessions.filter(x=>x.expires>now);
 let session=s.auth.sessions.find(x=>equal(x.hash,sessionHash));
 if(a?.type==='setup'){
 if(s.auth.admin)fail('Le compte existe déjà. Connectez-vous.',409);s.auth.admin=prepared;
 session={id:issuedId,hash:issuedHash,role:'admin',device:'',expires:now+7*864e5};s.auth.sessions.push(session);
 }else if(a?.type==='login'){
 const admin=s.auth.admin;if(!admin)return json({error:'Configuration initiale requise',configured:false},401);
 if(typeof a.username!=='string'||typeof a.password!=='string'||a.password.length>256)fail('Identifiant ou mot de passe incorrect.',401);
 if(!checkedLogin||checkedLogin.hash!==admin.hash){const actual=await passwordHash(a.password,admin.salt);checkedLogin={hash:admin.hash,valid:equal(actual,admin.hash)&&a.username.trim().toLowerCase()===admin.username};}
 if(!checkedLogin.valid)fail('Identifiant ou mot de passe incorrect.',401);
 session={id:issuedId,hash:issuedHash,role:'admin',device:'',expires:now+7*864e5};s.auth.sessions.push(session);
 }else if(a?.type==='accept'){
 if(session?.role==='admin')fail('Ouvrez ce lien sur le téléphone de votre mère.');
 if(a.consent!==true||typeof a.token!=='string'||a.token.length!==64)fail('موافقتك مطلوبة');
 const invitation=s.invites.find(i=>equal(i.hash,acceptHash)&&i.expires>now);if(!invitation)fail('انتهت مدّة الرابط أو استُعمل قبل. اطلبي رابط جديد من ابنك.',403);
 s.invites=s.invites.filter(i=>i.id!==invitation.id);const device=crypto.randomUUID();s.devices.push({id:device,name:'Téléphone de maman',lastSync:new Date().toISOString()});session={id:issuedId,hash:issuedHash,role:'patient',device,expires:now+365*864e5};s.auth.sessions.push(session);
 }
 if(!session)return json({error:'Accès privé',configured:!!s.auth.admin},401);
 const admin=session.role==='admin';const member=s.devices.find(d=>d.id===session.device);if(!admin&&!member)fail('Accès révoqué',403);
 if(a?.sessionKey&&a.sessionKey!==session.id)fail('CONFLICT',409);
 if(a?.type==='logout'){s.auth.sessions=s.auth.sessions.filter(x=>x.id!==session.id);if(!await store.commit(row.version,s))continue;return json({loggedOut:true});}
 generate(s,today());const extra={};
 // Copy because a failed CAS must not discard the uploaded image on retry.
 const action=a?structuredClone(a):null;
 if(admin&&action?.type==='med'&&typeof action.med?.photo==='string'&&action.med.photo.startsWith('data:image/')){
 if(!/^data:image\/(jpeg|png|webp);base64,/.test(action.med.photo)||action.med.photo.length>300000)fail('Photo invalide');const key='photo:'+await digest(action.med.photo);s.images[key]=action.med.photo;action.med.photo=key;
 }
 if(action?.type==='invite'){
 if(!admin)fail('FORBIDDEN',403);s.invites=s.invites.filter(i=>i.expires>now);if(s.invites.length>=20)fail('Révoquez une invitation en attente.');s.invites.push({id:crypto.randomUUID(),hash:invitationHash,expires:now+864e5});extra.invitation=invitationToken;
 }else if(action&&!['setup','login','accept','sync'].includes(action.type)){
 try{change(s,action,session.role);}catch(e){fail(e.message,e.message==='FORBIDDEN'?403:e.message==='CONFLICT'?409:400);}
 if(action.type==='revoke')s.auth.sessions=s.auth.sessions.filter(x=>x.device!==action.id);
 }
 if(member)member.lastSync=new Date().toISOString();
 if(!await store.commit(row.version,s))continue;
 return json({data:safeData(s,session.role),role:session.role,sessionKey:session.id,version:row.version+1,serverTime:new Date().toISOString(),...(issuedToken?{sessionToken:issuedToken}:{}),...extra});
 }
 return json({error:'Modifications simultanées. Réessayez.'},409);
 }catch(e){return json({error:e.status?e.message:'Le serveur est indisponible. Réessayez.'},e.status||503);}};
}
