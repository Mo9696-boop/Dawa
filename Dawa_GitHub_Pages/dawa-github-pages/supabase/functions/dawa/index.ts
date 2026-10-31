import {createHandler} from '../_shared/handler.mjs';
const url=Deno.env.get('SUPABASE_URL');
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if(!url||!serviceKey)throw Error('Supabase server configuration missing');
async function rest(path:string,body?:unknown){
 const response=await fetch(url+'/rest/v1/'+path,{method:body===undefined?'GET':'POST',headers:{apikey:serviceKey!,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 if(!response.ok)throw Error('Database operation failed');return await response.json();
}
const store={
 async read(){const rows=await rest('dawa_store?id=eq.1&select=version,data');if(!rows[0])throw Error('Run migrations first');return rows[0];},
 async commit(version:number,data:unknown){return await rest('rpc/dawa_commit',{expected_version:version,next_data:data});},
 async allow(key:string,maximum:number){return await rest('rpc/dawa_allow',{limit_key:key,maximum});}
};
const settings=await rest('dawa_settings?id=eq.1&select=allowed_origin,setup_key_hash');
Deno.serve(createHandler({store,allowedOrigin:settings[0]?.allowed_origin||Deno.env.get('DAWA_ALLOWED_ORIGIN'),setupKeyHash:settings[0]?.setup_key_hash,setupKey:Deno.env.get('DAWA_SETUP_KEY')}));
