// Regenerate PNG/PWA icons from the canonical SVG using a local headless Chromium.
// Requires puppeteer (only needed when deliberately regenerating the checked-in images).
const fs=require('fs'); const puppeteer=require('puppeteer');
(async()=>{
 const svg=fs.readFileSync('public/icons/icon.svg','utf8');
 const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 async function render(w,h,html,file){ await page.setViewport({width:w,height:h,deviceScaleFactor:1}); await page.setContent('<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}</style>'+html); await page.screenshot({path:file,omitBackground:true}); }
 for(const size of [192,512,180]) await render(size,size,`<div style="width:${size}px;height:${size}px">${svg}</div>`,`public/icons/${size===180?'apple-touch-icon':`icon-${size}`}.png`);
 // Maskable icon: full-bleed gradient with the same mark scaled into the safe circle.
 await render(512,512,`<div style="width:512px;height:512px;background:linear-gradient(135deg,#6366f1,#4acaa4);display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 512 512" width="330" height="330"><path d="M195 367V145h78c52 0 81 28 81 72s-29 72-81 72h-78" fill="none" stroke="#fff" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`,'public/icons/icon-maskable-512.png');
 await render(1200,630,`<div style="width:1200px;height:630px;background:#faf8f4;display:flex;align-items:center;justify-content:center"><div style="width:400px;height:400px">${svg}</div></div>`,'public/icons/og-image.png');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
