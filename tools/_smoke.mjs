import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: true,
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const errors=[];
page.on('console', m=>{ if(m.type()==='error') errors.push(m.text()); });
page.on('pageerror', e=>errors.push('PAGEERROR: '+e.message));
await page.goto('http://localhost:8740/index.html',{waitUntil:'networkidle2',timeout:60000});
await page.waitForFunction(()=>window.__FLEET&&window.__FLEET.boats,{timeout:20000});
await new Promise(r=>setTimeout(r,3000));
const st = await page.evaluate(()=>{
  const A=window.__VendeeApp; let err=null;
  try{ for(let k=0;k<=30;k++){A.setProgress(k/30);A.update();A.renderLabels();} }catch(e){err=String(e&&e.stack||e);}
  return {
    err,
    gpsLoaded: document.body.classList.contains('gps-loaded'),
    gpsFailed: document.body.classList.contains('gps-failed'),
    welcomeShown: (()=>{const el=document.getElementById('gps-welcome'); if(!el) return 'no-el'; return getComputedStyle(el).display;})(),
    coverStartView: !!(typeof Globe!=='undefined'&&Globe.coverStartView),
  };
});
console.log('Erreur runtime    :', st.err||'aucune ✓');
console.log('gps-loaded        :', st.gpsLoaded, '| gps-failed:', st.gpsFailed, '(attendu true/false)');
console.log('overlay GPX display:', st.welcomeShown, '(attendu none → plus de flash)');
console.log('coverStartView    :', st.coverStartView);
console.log('Erreurs console   :', errors.filter(e=>!/ERR_CONNECTION_RESET|Failed to load resource|weserv|unpkg|eox|tiles.maps/.test(e)).slice(0,5));
await browser.close();
