import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/components/collection-routes.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText;
const {collectionGroups,routeTotals,googleRouteLinks}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
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
test('chained Google Maps links preserve all 25 stops and depot return within mobile waypoint limits',()=>{
 const stops=Array.from({length:25},(_,i)=>({latitude:49+i/1000,longitude:9.2}));
 const links=googleRouteLinks(stops,[49.1427,9.2109],3);
 assert.equal(googleRouteLinks(stops,[49.1427,9.2109]).length,3);
 let previous='49.1427,9.2109';
 const visited=[];
 for(const link of links){
  const params=new URL(link).searchParams;
  assert.equal(params.get('origin'),previous);
  const waypoints=params.get('waypoints')?.split('|')??[];
  assert.ok(waypoints.length<=3);
  visited.push(...waypoints,params.get('destination'));
  previous=params.get('destination');
 }
 assert.deepEqual(visited,[...stops.map(s=>`${s.latitude},${s.longitude}`),'49.1427,9.2109']);
 assert.equal(new URL(links[0]).searchParams.get('travelmode'),'driving');
 assert.deepEqual(googleRouteLinks([{name:'Missing position'}],[49,9]),[]);
 assert.deepEqual(googleRouteLinks([],[49,9]),[]);
});
