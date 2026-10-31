export const TZ='Asia/Beirut';
export const today=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export const nextDay=(d,n=1)=>new Date(Date.parse(d+'T12:00:00Z')+n*864e5).toISOString().slice(0,10);
export function instant(day,time){
 const target=Date.parse(day+'T'+time+':00Z');let t=target;
 for(let i=0;i<4;i++){const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(t));const delta=target-Date.parse(parts.replace(' ','T')+'Z');if(!delta)return new Date(t).toISOString();t+=delta;}
 throw Error('Heure locale inexistante au changement d’heure. Choisir une autre heure.');
}
export function initial(){return {profile:{name:'ماما',phone:'',window:30},meds:[
 ['Dexilant','60 mg','كبسولة واحدة','1 fois par jour · consigne alimentaire à confirmer','regular',''],
 ['Cipralex','10 mg','حبّة واحدة','1 fois par jour, à heure fixe','regular',''],
 ['Diovenor','600 mg','','1 fois par jour · quantité à confirmer','regular','مع الأكل'],
 ['Cinitrex','1 mg','حبّة واحدة','3 fois par jour · horaires selon les repas à confirmer','regular','قبل الأكل بربع ساعة'],
 ['Normix','','حبّتين','2 comprimés matin et soir après les repas · programme à confirmer','temporary','بعد الأكل'],
 ['Flagyl','','حبّة واحدة','1 comprimé matin et soir · consigne alimentaire à confirmer','temporary',''],
 ['Motilium','','','3 fois par jour · 10 à 30 minutes avant les repas · revue professionnelle requise','temporary','قبل الأكل بـ ١٠ إلى ٣٠ دقيقة']
 ].map((x,i)=>({id:'m'+i,name:x[0],dose:x[1],quantity:x[2],note:x[3],kind:x[4],meal:x[5],form:'',photo:'',status:'draft',versions:[]})),occ:[],audit:[],devices:[],invites:[],ops:[]};}
export function generate(s,until=today()){
 for(const m of s.meds)for(const v of m.versions){if(v.kind==='prn'||v.status!=='active')continue;
 const end=[v.end||until,v.until?nextDay(v.until,-1):until,until].sort()[0];
 for(let d=v.start;d<=end;d=nextDay(d)){if(!v.days.includes(new Date(d+'T12:00Z').getUTCDay()))continue;
 for(const time of v.times){const id=m.id+'_'+v.id+'_'+d+'_'+time;if(s.occ.some(o=>o.id===id))continue;
 let scheduled;try{scheduled=instant(d,time);}catch{if(!s.occ.some(o=>o.id===id))s.occ.push({id,medId:m.id,day:d,time,name:v.name||m.name,dose:v.dose||'',quantity:v.quantity,meal:v.meal,status:'cancelled',reason:'Heure locale inexistante au changement d’heure. Programme à revoir.',scheduled:null,revision:0});continue;} if(v.notBefore&&scheduled<v.notBefore)continue;
 s.occ.push({id,medId:m.id,day:d,time,scheduled,name:v.name||m.name,dose:v.dose??m.dose,quantity:v.quantity,meal:v.meal,photo:v.photo??m.photo,status:'pending',revision:0,takenAt:null,recordedAt:null,actor:null});}}
 }
}
const fail=m=>{throw Error(m)};
export function change(s,a,role,now=new Date().toISOString()){
 if(!a.op||typeof a.op!=='string'||a.op.length>100)fail('Identifiant requis');
 if(s.ops.includes(a.op))return;
 if(a.type==='take'||a.type==='undo'||a.type==='miss'){
 const o=s.occ.find(o=>o.id===a.id);if(!o)fail('Prise introuvable');
 if(o.revision!==a.revision)fail('CONFLICT');if(o.status==='cancelled')fail('Programme annulé');
 if(a.type==='take'&&(!a.at||!Number.isFinite(Date.parse(a.at))||Date.parse(a.at)>Date.parse(now)))fail('Heure future ou invalide');
 if(a.type==='take'&&today(new Date(a.at))<nextDay(o.day,-1))fail('Heure trop éloignée de cette prise');
 s.audit.push({at:now,actor:role,type:a.type,id:o.id,before:{...o}});
 Object.assign(o,{status:a.type==='take'?'taken':a.type==='miss'?'missed':'pending',takenAt:a.type==='take'?a.at:null,recordedAt:now,actor:role,revision:o.revision+1});
 }else{
 if(role!=='admin'&&a.type!=='prn')fail('FORBIDDEN');
 if(a.type==='med'){
 const x=a.med; if(!x||!x.name?.trim()||x.name.length>100)fail('Nom requis');
 if(/dulox|loxyt/i.test(x.name)&&x.status==='active')fail('Médicament exclu de ce programme');
 if(!['draft','active','paused','archived'].includes(x.status)||!['regular','temporary','prn'].includes(x.kind))fail('État invalide');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(a.effective)||a.effective<today(new Date(now)))fail('Date d’effet : aujourd’hui ou plus tard');
 if(x.status==='active'){
 if(!a.verified)fail('Vérification explicite requise');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(x.start||'')||(x.end&&!/^\d{4}-\d{2}-\d{2}$/.test(x.end)))fail('Dates invalides');
 if(!x.quantity?.trim()||!x.start||x.start<a.effective||(!x.times?.length&&x.kind!=='prn')||(!x.days?.length&&x.kind!=='prn'))fail('Quantité, début et programme requis');
 if(x.kind==='temporary'&&!x.end)fail('Date de fin requise');
 if(x.end&&x.end<x.start)fail('Fin antérieure au début');
 if(x.name.toLowerCase().includes('motilium')&&!a.professional)fail('Revue professionnelle requise');
 if((x.times||[]).some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))||new Set(x.times).size!==x.times.length)fail('Horaires invalides ou répétés');
 if(x.days.some(d=>!Number.isInteger(d)||d<0||d>6))fail('Jours invalides');
 for(const t of x.times||[])instant(x.start,t);
 }
 let m=s.meds.find(m=>m.id===x.id);if(!m){m={id:crypto.randomUUID(),versions:[]};s.meds.push(m);}
 s.audit.push({at:now,actor:role,type:'programme',id:m.id,before:JSON.parse(JSON.stringify(m))});
 generate(s,today(new Date(now)));
 for(const v of m.versions)if(!v.until||v.until>a.effective)v.until=a.effective;
 for(const o of s.occ)if(o.medId===m.id&&o.day>=a.effective&&o.status==='pending'&&o.scheduled>=now){o.status='cancelled';o.revision++;}
 for(const key of ['name','dose','quantity','meal','photo','form','kind','status','note'])m[key]=String(x[key]||'').slice(0,key==='photo'?300000:1000);
 if(m.photo&&!(m.photo.startsWith('photo:')&&s.images?.[m.photo]))fail('Format de photo invalide');
 m.versions.push({id:crypto.randomUUID(),name:m.name,dose:m.dose,photo:m.photo,status:x.status,kind:x.kind,start:x.start||a.effective,end:x.end||'',times:x.times||[],days:x.days||[],quantity:x.quantity,meal:x.meal,effective:a.effective,notBefore:now});
 generate(s,today(new Date(now)));
 // Newly configured times already elapsed today are retained as unconfirmed, never marked missed.
 }else if(a.type==='profile'){
 s.profile={name:String(a.name||'ماما').slice(0,80),phone:String(a.phone||'').replace(/[^+\d]/g,''),window:Math.max(0,Math.min(180,Number(a.window)||0))};
 }else if(a.type==='revoke'){s.devices=s.devices.filter(d=>d.id!==a.id);s.invites=s.invites.filter(d=>d.id!==a.id);}
 else if(a.type==='prn'){
 const m=s.meds.find(m=>m.id===a.id&&m.status==='active'&&m.kind==='prn');if(!m)fail('Médicament si besoin inactif');if(!a.at||Date.parse(a.at)>Date.parse(now)||!Number.isFinite(Date.parse(a.at)))fail('Heure invalide');
 s.occ.push({id:crypto.randomUUID(),medId:m.id,day:today(new Date(a.at)),time:'Si besoin',scheduled:null,name:m.name,dose:m.dose,quantity:m.quantity,meal:m.meal,photo:m.photo,status:'taken',revision:0,takenAt:a.at,recordedAt:now,actor:role});
 }else fail('Action inconnue');
 }
 s.ops.push(a.op);
}
