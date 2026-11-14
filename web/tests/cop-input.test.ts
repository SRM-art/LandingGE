import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatCopInput,plainCopInput} from '../src/domain/cop-input.ts';
test('COP input groups thousands and keeps the API value unambiguous',()=>{
 for(const [input,display,plain] of [['123','$ 123','123'],['1234','$ 1.234','1234'],['1234567','$ 1.234.567','1234567'],['1234567,50','$ 1.234.567,50','1234567.50'],['0','$ 0','0'],['','$ ','']]) {
  assert.equal(formatCopInput(input),display);
  assert.equal(formatCopInput(display),display);
  assert.equal(plainCopInput(display),plain);
 }
 assert.equal(formatCopInput('$ 0001234,567'),'$ 1.234,56');
 assert.equal(formatCopInput('1200,'),'$ 1.200,');
});
