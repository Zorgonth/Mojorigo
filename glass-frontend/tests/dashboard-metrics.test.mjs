import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/components/dashboard-metrics.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext}}).outputText;
const {dashboardMetrics,metricLocations}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const sensor=(color,fillPercent)=>({sensorId:color,color,fillPercent});
const bins=[{id:'a',sensors:[sensor('Brown',80),sensor('White',null),sensor('Green',0)]},{id:'b',sensors:[sensor('Brown',70),sensor('White',90),sensor('Green',null)]}];
test('pickup counts compartments above 70%, average excludes missing readings but includes zero',()=>{
 const m=dashboardMetrics(bins,'all',[]);
 assert.equal(m.total,6);assert.equal(m.reported,4);assert.equal(m.pickups,2);assert.equal(m.average,60);
});
test('colour selection has no fallback to other colours',()=>{
 const brown=dashboardMetrics(bins,'brown',[]);assert.equal(brown.total,2);assert.equal(brown.pickups,1);assert.equal(brown.average,75);
 const green=dashboardMetrics(bins,'green',[]);assert.equal(green.reported,1);assert.equal(green.average,0);assert.equal(green.pickups,0);
 assert.equal(dashboardMetrics([],'white',[]).average,null);
});
test('pickup/fullness views show relevant locations and do not mutate the input',()=>{
 assert.deepEqual(metricLocations(bins,'brown','pickup').map(b=>b.id),['a']);
 assert.deepEqual(metricLocations(bins,'white','fullness').map(b=>b.id),['b','a']);
 assert.deepEqual(bins.map(b=>b.id),['a','b']);
});
test('today means Europe/Berlin calendar day rather than UTC or all-time collections',()=>{
 const events=[{id:'1',collectedAt:'2026-10-27T23:30:00Z'},{id:'2',collectedAt:'2026-10-28T23:30:00Z'},{id:'3',collectedAt:'invalid'},{id:'4',collectedAt:'2026-10-27T10:00:00Z'}];
 assert.deepEqual(dashboardMetrics(bins,'all',events,new Date('2026-10-28T12:00:00Z')).collectionsToday.map(e=>e.id),['1']);
});
test('overview sorts every colour highest first; All uses the fullest compartment, with missing readings last',()=>{
 const input=[...bins,{id:'c',sensors:[sensor('Brown',null),sensor('White',null),sensor('Green',null)]}];
 assert.deepEqual(metricLocations(input,'all','all').map(b=>b.id),['b','a','c']);
 assert.deepEqual(metricLocations(input,'brown','all').map(b=>b.id),['a','b','c']);
 assert.deepEqual(metricLocations(input,'white','all').map(b=>b.id),['b','a','c']);
 assert.deepEqual(metricLocations(input,'green','all').map(b=>b.id),['a','b','c']);
 assert.deepEqual(input.map(b=>b.id),['a','b','c']);
});
