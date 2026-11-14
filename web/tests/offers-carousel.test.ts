import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';

test('offer carousel advances one card every six seconds and synchronizes position dots',()=>{
 const events=new Map<string,(event?:any)=>void>();
 let timer:(()=>void)|undefined; let delay=0; let resize=()=>{};
 const dots:any={children:[],replaceChildren(...items:any[]){this.children=items;}};
 const controls={hidden:true};
 const buttons=[-1,1].map(step=>({dataset:{offersStep:String(step)},click:()=>{},addEventListener(_name:string,fn:()=>void){this.click=fn;}}));
 const track:any={clientWidth:460,scrollWidth:940,scrollLeft:0,contains:()=>false,
  querySelector:()=>({getBoundingClientRect:()=>({width:100})}),
  addEventListener:(name:string,fn:(event?:any)=>void)=>events.set(name,fn),
  scrollTo({left}:{left:number}){this.scrollLeft=left;events.get('scroll')!();}};
 const root={querySelector:(s:string)=>s==='[data-offers-track]'?track:s==='[data-offers-controls]'?controls:dots,
  querySelectorAll:()=>buttons,addEventListener(){}};
 const document={hidden:false,activeElement:null,querySelectorAll:()=>[root],addEventListener(){},createElement:()=>({attributes:{} as Record<string,string>,click:()=>{},setAttribute(name:string,value:string){this.attributes[name]=value;},addEventListener(_name:string,fn:()=>void){this.click=fn;}})};
 const source=readFileSync(new URL('../src/scripts/site.ts',import.meta.url),'utf8').split('// Native horizontal scrolling')[1].split('\n').slice(1).join('\n');
 runInNewContext(stripTypeScriptTypes(source),{document,window:{matchMedia:()=>({matches:true,addEventListener(){}})},getComputedStyle:()=>({columnGap:'20px'}),ResizeObserver:class{constructor(fn:()=>void){resize=fn;}observe(){}},queueMicrotask:(fn:()=>void)=>fn(),setTimeout:(fn:()=>void,ms:number)=>{timer=fn;delay=ms;return 1;},clearTimeout:()=>timer=undefined});
 assert.equal(delay,6000);assert.equal(dots.children.length,5);
 timer!();assert.equal(track.scrollLeft,120);
 assert.equal(dots.children[1].attributes['aria-pressed'],'true');
 buttons[1].click();assert.equal(track.scrollLeft,240);
 dots.children[4].click();assert.equal(track.scrollLeft,480);
 timer!();assert.equal(track.scrollLeft,0);
 buttons[0].click();assert.equal(track.scrollLeft,480);
 track.clientWidth=220;resize();assert.equal(dots.children.length,7);
});
