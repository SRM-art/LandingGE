import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectHomeOffers} from '../src/domain/home-offers.ts';
const item=(id:string, price:number|null, discount=0)=>({id,name:id,price_cents:price,discount_price_cents:discount});
test('home selects the eight largest percentage offers then fills with lowest normal prices',()=>{
 const normal=Array.from({length:10},(_,i)=>item('normal-'+i,(i+1)*100));
 const catalog=[...normal.reverse(),item('sale-large-saving',1000000,900000),item('sale-largest-percent',10000,5000),item('sale-second',10000,7000),item('no-price',null)];
 const result=selectHomeOffers(catalog);
 assert.deepEqual(result.map(p=>p.id),['sale-largest-percent','sale-second','sale-large-saving', 'normal-0','normal-1','normal-2','normal-3','normal-4']);
 assert.equal(new Set(result.map(p=>p.id)).size,8);
 assert.equal(catalog[0].id,'normal-9');
 // Price edits immediately change selection; the showcase is not a stored list.
 catalog.find(p=>p.id==='normal-9')!.discount_price_cents=100;
 assert.equal(selectHomeOffers(catalog)[0].id,'normal-9');
});
test('home handles no offers, more than eight offers, and a small catalog',()=>{
 assert.deepEqual(selectHomeOffers([item('unknown',null),item('b',200),item('a',100)]).map(p=>p.id),['a','b']);
 assert.deepEqual(selectHomeOffers([]),[]);
 const offers=Array.from({length:12},(_,i)=>item(String(i),10000,(i+1)*100));
 assert.deepEqual(selectHomeOffers([item('cheap-regular',1),...offers.reverse()]).map(p=>p.id),['0','1','2','3','4','5','6','7']);
 const close=[item('lower',100000,50001),item('higher',100000,50000)];
 assert.equal(selectHomeOffers(close)[0].id,'higher');
});
