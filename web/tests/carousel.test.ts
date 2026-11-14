import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';

test('carousel waits nine seconds, wraps arrows, swipes horizontally and preserves vertical scrolling',()=>{
 const events=new Map<string, (event?: any)=>void>();
 const buttons=[-1,1].map(step=>({dataset:{carouselStep:String(step)},click:()=>{},addEventListener(_type:string,fn:()=>void){this.click=fn;}}));
 const slides=[0,1,2].map(i=>({hidden:i!==0}));
 const dots=slides.map(()=>({classList:{toggle(){}}}));
 const counter={textContent:'01'};
 let timer: (()=>void)|undefined; let delay:number|undefined; let focused=false;
 const root={clientWidth:390,contains:()=>false,querySelector:(s:string)=>s==='[data-counter]'?counter:focused?{}:null,
  querySelectorAll:(s:string)=>s==='[data-slide]'?slides:s==='[data-dot]'?dots:buttons,
  addEventListener:(name:string,fn:(event?:any)=>void)=>events.set(name,fn)};
 const document={hidden:false,querySelector:()=>null,querySelectorAll:()=>[root],addEventListener(){}};
 const source=readFileSync(new URL('../src/scripts/site.ts',import.meta.url),'utf8').split("document.querySelectorAll('[data-gallery]')")[0];
 runInNewContext(stripTypeScriptTypes(source),{document,queueMicrotask:(fn:()=>void)=>fn(),setTimeout:(fn:()=>void,ms:number)=>{timer=fn;delay=ms;return 1;},clearTimeout:()=>timer=undefined});
 assert.equal(delay,9000);
 timer!();assert.equal(counter.textContent,'02');
 buttons[0].click();assert.equal(counter.textContent,'01');
 buttons[0].click();assert.equal(counter.textContent,'03');
 buttons[1].click();assert.equal(counter.textContent,'01');assert.equal(delay,9000);
 const swipe=(x:number,y:number)=>{
  events.get('pointerdown')!({isPrimary:true,pointerType:'touch',pointerId:1,clientX:200,clientY:100});
  assert.equal(timer,undefined);
  events.get('pointerup')!({pointerId:1,clientX:x,clientY:y});
 };
 swipe(80,110);assert.equal(counter.textContent,'02');
 let suppressed=false;events.get('click')!({preventDefault(){suppressed=true;},stopPropagation(){}});assert.ok(suppressed);
 swipe(320,110);assert.equal(counter.textContent,'01');
 swipe(210,300);assert.equal(counter.textContent,'01');assert.equal(delay,9000);
 events.get('pointerdown')!({isPrimary:true,pointerType:'touch',pointerId:2,clientX:200,clientY:100});
 events.get('pointercancel')!();assert.equal(delay,9000);assert.equal(typeof timer,'function');
 events.get('pointerdown')!({isPrimary:true,pointerType:'mouse',pointerId:3,clientX:200,clientY:100});
 events.get('pointerup')!({pointerId:3,clientX:30,clientY:100});assert.equal(counter.textContent,'01');
 focused=true;events.get('focusin')!();assert.equal(timer,undefined);
 focused=false;events.get('focusout')!();assert.equal(delay,9000);
});
