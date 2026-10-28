import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/components/postcode-search.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText;
const {postcodeCentres,rankByDistance,distanceMetres}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('all six supported Heilbronn postcodes have valid local reference points',()=>{
 assert.deepEqual(Object.keys(postcodeCentres).sort(),['74072','74074','74076','74078','74080','74081']);
 for(const [lat,lng] of Object.values(postcodeCentres)){assert.ok(lat>49&&lat<49.3);assert.ok(lng>9&&lng<9.4);}
});
test('ranks geographically, including containers in neighbouring postcodes, without mutating the input',()=>{
 const centre=postcodeCentres['74072'];
 const input=[{id:'far',latitude:49.19,longitude:9.15,postcode:'74072'},{id:'near',latitude:centre[0],longitude:centre[1],postcode:'74076'}];
 const result=rankByDistance(input,centre);
 assert.deepEqual(result.map(b=>b.id),['near','far']);
 assert.equal(result[0].distanceMetres,0);
 assert.equal(input[0].id,'far');
 assert.equal('distanceMetres' in input[0],false);
});
test('distance calculation is symmetric and yields metres; empty lists work',()=>{
 const a=[49.14,9.22],b=[49.15,9.22];
 assert.ok(Math.abs(distanceMetres(a,b)-1112)<2);
 assert.ok(Math.abs(distanceMetres(a,b)-distanceMetres(b,a))<.001);
 assert.deepEqual(rankByDistance([],a),[]);
});
