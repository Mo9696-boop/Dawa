import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const html=readFileSync('dist/index.html','utf8');
const assets=[...html.matchAll(/(?:src|href)="([^" ]*assets\/[^" ]+)"/g)].map(m=>m[1]);
assert(assets.length>=2,'Missing compiled JS/CSS');
for(const path of assets){const local='dist/assets/'+path.split('/assets/').at(-1);assert(existsSync(local),'Missing asset: '+local);}
const manifest=JSON.parse(readFileSync('dist/manifest.webmanifest','utf8'));
assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
assert(!html.includes('/api/state'));
for(const asset of assets.filter(x=>x.endsWith('.js'))){const text=readFileSync('dist/assets/'+asset.split('/assets/').at(-1),'utf8');assert(!text.includes('SUPABASE_SERVICE_ROLE_KEY'),'Server secret name leaked into browser build');assert(!text.includes('signin-with-chatgpt'),'Old authentication route found');}
console.log('Pages asset paths, manifest scope and server/client separation verified.');
