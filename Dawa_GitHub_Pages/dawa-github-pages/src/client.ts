import {backend} from './backend-config';
export const base=new URL(import.meta.env.BASE_URL,location.href).pathname;
const url=String(import.meta.env.VITE_SUPABASE_URL||backend.url).replace(/\/$/,'');
const publicKey=String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||backend.publishableKey);
export const configuredBackend=!!url&&!!publicKey;
// A service-role key must NEVER be a browser build variable.
function keyIsPublic(key:string){if(key.startsWith('sb_publishable_'))return true;try{const payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return payload.role==='anon';}catch{return false;}}
const prefix='dawa:'+base+':';
export const storage={getItem:(key:string)=>localStorage.getItem(prefix+key),setItem:(key:string,value:string)=>localStorage.setItem(prefix+key,value),removeItem:(key:string)=>localStorage.removeItem(prefix+key)};
export const home=()=>new URL(base,location.origin).href;
export const adminURL=()=>home()+'#admin';
export async function api(body?:any){
 if(!configuredBackend||!keyIsPublic(publicKey))throw Object.assign(Error('Configurez VITE_SUPABASE_URL et la clé publique Supabase dans les variables GitHub, puis redéployez.'),{status:503,configuration:true});
 const session=storage.getItem('session');
 const response=await fetch(url+'/functions/v1/dawa',{method:body?'POST':'GET',headers:{'Content-Type':'application/json',apikey:publicKey,...(session?{'x-dawa-session':session}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'omit'});
 let result:any;try{result=await response.json();}catch{throw Object.assign(Error('Réponse du serveur invalide.'),{status:response.status||503});}
 if(!response.ok)throw Object.assign(Error(result.error||'Connexion au serveur impossible.'),{status:response.status,configured:result.configured});
 if(result.sessionToken){storage.setItem('session',result.sessionToken);delete result.sessionToken;}
 if(body?.type==='logout')storage.removeItem('session');
 return result;
}
