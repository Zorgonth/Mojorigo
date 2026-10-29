import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/components/route-polyline.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText;
const {decodeRoutePolyline}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('decodes route geometry in Leaflet latitude/longitude order',()=>{
 assert.deepEqual(decodeRoutePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@'),[[38.5,-120.2],[40.7,-120.95],[43.252,-126.453]]);
});
test('empty, invalid and truncated geometry never crashes the map or invents a partial route',()=>{
 for(const value of ['', '_', '_p~iF', 'invalid geometry', '~~~~~~~~~~~~~~~~~~~~']) assert.deepEqual(decodeRoutePolyline(value),[]);
});
