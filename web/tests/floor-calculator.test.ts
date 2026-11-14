import {test} from 'node:test';
import assert from 'node:assert/strict';
import {estimateFloor,isFloorByBox} from '../src/domain/floor-calculator.ts';
import {productPricing} from '../src/domain/pricing.ts';
test('floor simulation adds waste once and rounds up to complete boxes exactly',()=>{
 assert.deepEqual(estimateFloor('20',10,22400,10000000),{areaScaled:200000,waste:10,boxes:10,requiredScaled:220000,coveredScaled:224000,totalCents:100000000});
 assert.equal(estimateFloor('2,24',0,22400,100).boxes,1);
 assert.equal(estimateFloor('0.3',0,3000,100).boxes,1);
 assert.equal(estimateFloor('0.3001',0,3000,100).boxes,2);
 const boundary=estimateFloor('0.0001',1,101,null);
 assert.equal(boundary.boxes,1);assert.equal(boundary.totalCents,null);
 const priced=productPricing({price_cents:10000000,discount_price_cents:8000000});
 assert.equal(estimateFloor('20',10,22400,priced.final).totalCents,80000000);
 assert.equal(estimateFloor('20',20,22400,priced.final).boxes,11);
 assert.equal(estimateFloor('20',0,22400,Number.MAX_SAFE_INTEGER).totalCents,null);
});
test('floor simulation rejects invalid or out-of-range values',()=>{
 for(const area of ['','0','-1','Infinity','NaN','1e3','1.000,5','1.23456','100000.0001'])assert.throws(()=>estimateFloor(area,10,22400,100));
 for(const waste of [NaN,-1,31,1.5])assert.throws(()=>estimateFloor('20',waste,22400,100));
 for(const coverage of [0,-1,NaN,1.1,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>estimateFloor('20',10,coverage,100));
 assert.equal(estimateFloor('100000',30,1,100).boxes,1300000000);
});
test('calculator is strictly restricted to the Pisos category sold by box',()=>{
 assert.ok(isFloorByBox({category_code:'pisos',presentation_code:'CAJA'}));
 for(const category_code of ['porcelanatos','ceramicas','zocalos','adhesivos',''])assert.equal(isFloorByBox({category_code,presentation_code:'CAJA'}),false);
 for(const presentation_code of ['PIEZA','SACO','BOLSA',''])assert.equal(isFloorByBox({category_code:'pisos',presentation_code}),false);
});
