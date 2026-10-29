import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/components/collection-routes.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText;
const {collectionGroups,routeTotals}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('multiple groups remain visible even when the legacy route field is null',()=>{
 const groups=Array.from({length:3},(_,i)=>({group:i+1,stops:Array.from({length:i===2?1:25},()=>({})),route:{distanceMeters:1000,duration:'100s'}}));
 const parsed=collectionGroups({route:null,groups});assert.equal(parsed.length,3);
 assert.deepEqual(routeTotals(parsed),{stops:51,distance:3000,seconds:300});
});
test('supports a single legacy route and a successful empty response without inventing routes',()=>{
 assert.equal(collectionGroups({route:{duration:'60s'},stops:[{id:'1'}]}).length,1);
 assert.deepEqual(collectionGroups({groups:[],route:null,stops:[]}),[]);
 assert.equal(routeTotals([{group:1,stops:[],route:{}}]).seconds,null);
});
