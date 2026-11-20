const fs=require('fs'), path=require('path'), crypto=require('crypto');
const dir=path.resolve('out');
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(d,x.name)):[path.join(d,x.name)])}
let files=walk(dir).map(f=>'/'+path.relative(dir,f).split(path.sep).join('/')).filter(s=>!s.endsWith('/sw.js')&&!s.endsWith('/sitemap.xml'));
const urls=[...new Set(files.flatMap(s=>s.endsWith('/index.html')?[s.slice(0,-10),s]:[s]))];
const hash=crypto.createHash('sha256').update(files.sort().map(f=>f+crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,f))).digest('hex')).join('\n')).digest('hex').slice(0,12);
const sw=`const CACHE=${JSON.stringify('ppicola-'+hash)};\nconst ASSETS=${JSON.stringify(urls)};\nself.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));\nself.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('ppicola-')&&x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));\nself.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url); if(r.method!=='GET'||u.origin!==location.origin)return; if(r.mode==='navigate'){e.respondWith(fetch(r).catch(()=>caches.match(r).then(x=>x||caches.match(u.pathname.endsWith('/')?u.pathname:u.pathname+'/'))));return;} e.respondWith(caches.match(r).then(x=>x||fetch(r)));});\n`;
fs.writeFileSync(path.join(dir,'sw.js'),sw);
const base=(process.env.NEXT_PUBLIC_APP_URL||'https://ppicola.pages.dev').replace(/\/$/,'');const routes=['/','/images-to-pdf/','/pdf-to-images/','/merge-pdfs/','/merge-images/','/pdf-reader/','/about/','/privacy/','/terms/','/contact/'];
fs.writeFileSync(path.join(dir,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+routes.map(r=>'<url><loc>'+base+r+'</loc></url>').join('')+'</urlset>');
console.log(`PWA cached ${urls.length} assets including PDF reader; sitemap created.`);
