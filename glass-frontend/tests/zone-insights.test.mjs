import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/components/zone-insights.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext}}).outputText;
const {zoneInsights}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const sensor=(color,fillPercent,sensorId=color)=>({color,fillPercent,sensorId});
const bins=[
 {postcode:'74072',sensors:[sensor('Brown',100),sensor('Green',80)]},
 {postcode:'74072',sensors:[sensor('Brown',null),sensor('Green',60)]},
 {postcode:'74074',sensors:[sensor('Brown',0),sensor('Green',20)]},
 {postcode:'74076',sensors:[sensor('Brown',null),sensor('Green',99,'')]},
];
test('zones aggregate sensor readings, include zero, count pickups and place unknown zones last',()=>{
 const zones=zoneInsights(bins,'all');
 assert.deepEqual(zones.map(z=>z.postcode),['74072','74074','74076']);
 assert.deepEqual(zones[0],{postcode:'74072',locations:2,reported:3,pickups:2,average:80});
 assert.equal(zones[1].average,10);
 assert.equal(zones[2].average,null);
});
test('zone colour selection uses only that colour and preserves missing data',()=>{
 const zones=zoneInsights(bins,'brown');
 assert.equal(zones[0].average,100); assert.equal(zones[0].reported,1);
 assert.equal(zones[1].average,0); assert.equal(zones[2].average,null);
 assert.deepEqual(zoneInsights([],'all'),[]);
});
