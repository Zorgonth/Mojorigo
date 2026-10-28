import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/components/bin-data.ts', import.meta.url), 'utf8');
const namesSource = readFileSync(new URL('../src/components/location-names.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source.replace('import { locationNames } from "./location-names";', namesSource.replace('export const', 'const')), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText;
const { parseMapResponse, binFill, fillTone, locationTitle, locationSubtitle } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const location = { id: 'BIN-001', name: 'Collection point', latitude: '49.14', longitude: '9.22', sensors: [
  { type: 'brown', sensorId: 'b', fillPercent: 91, cm: 12, receivedAt: '2026-10-28T12:00:00Z' },
  { type: 'green', sensorId: 'g', fillPercent: 0 },
  { type: 'white', sensorId: 'w', fillPercent: null },
] };
test('one location contains three correctly matched sensors, preserving zero and missing readings', () => {
  const bins = parseMapResponse({ data: [location] });
  assert.equal(bins.length, 1);
  assert.deepEqual(bins[0].sensors.map(s => [s.color, s.fillPercent]), [['Green', 0], ['White', null], ['Brown', 91]]);
  assert.equal(bins[0].sensors[2].cm, 12);
  assert.equal(bins[0].sensors[2].receivedAt, '2026-10-28T12:00:00Z');
  assert.equal(binFill(bins[0]), 91);
  assert.equal(binFill(bins[0], 'Green'), 0);
  assert.equal(fillTone(binFill(bins[0], 'White')), 'unknown');
});
test('invalid/missing sensors never become empty compartments', () => {
  const [bin] = parseMapResponse({data: [{...location, sensors: [{type:'green', fillPercent:101}, {type:'white', fillPercent:''}]}]});
  assert.deepEqual(bin.sensors.map(s => s.fillPercent), [null, null, null]);
  assert.equal(binFill(bin), null);
});
test('invalid coordinates are excluded and duplicate IDs do not produce duplicate pins', () => {
  const bins = parseMapResponse({data: [location, location, {...location,id:'null',latitude:null}, {...location,id:'range',longitude:181}]});
  assert.equal(bins.length,1);
});
test('an empty successful response stays empty; malformed responses fail explicitly', () => {
  assert.deepEqual(parseMapResponse({data:[]}), []);
  assert.throws(() => parseMapResponse({count:0}), /Invalid map response/);
});
test('frontend accepts the actual backend map route response', async () => {
  const { osmBinsRouter } = await import('../../backend/src/routes/osmBins.js');
  const handler = osmBinsRouter.stack.find(layer => layer.route?.path === '/map').route.stack[0].handle;
  const response = await new Promise((resolve, reject) => handler({}, {json:resolve}, reject));
  const bins = parseMapResponse(response);
  assert.equal(bins.length, response.count);
  assert.ok(bins.length > 0);
  assert.ok(bins.every(bin => bin.sensors.length === 3));
  console.log(`Verified ${bins.length} real backend locations, each with three sensor slots`);
});

test('street labels and postcodes are preserved for display and postcode search', () => {
  const [bin] = parseMapResponse({data:[{...location, name:'Near Hafenstraße', address:'Near Hafenstraße', city:'Heilbronn', postcode:'74076'}]});
  assert.equal(locationTitle(bin), 'Near Hafenstraße');
  assert.match(locationSubtitle(bin), /74076 Heilbronn/);
  const [named] = parseMapResponse({data:[{...location,name:'Recyclinghof-Ost',address:'Im Wannental',city:'Heilbronn'}]});
  assert.equal(locationTitle(named),'Recyclinghof-Ost');
});
