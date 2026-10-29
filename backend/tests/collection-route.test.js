import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { osmBinsRouter } from '../src/routes/osmBins.js';
const handler = osmBinsRouter.stack.find(l => l.route?.path === '/collection-route').route.stack[0].handle;
const call = body => new Promise((resolve, reject) => {
  let status = 200;
  handler({body}, {status(value) {status=value;return this;}, json(payload) {resolve({status,payload});}}, reject);
});
test('collection routing validates origin, handles no pickups without a key, and preserves optimized stop order', async () => {
 const read = fs.readFileSync, fetch = globalThis.fetch, key = process.env.GOOGLE_MAPS_API_KEY;
 let readings = 'receivedAt,sensorId,fillPercent,cm\n';
 fs.readFileSync = (path, ...args) => {
  if (String(path).endsWith('/data/bins.csv')) return 'id,green_sensor_id,brown_sensor_id,white_sensor_id,arena_name,city,address,lat,lng\nA,GA,BA,WA,Street A,Heilbronn,Street A,49.14,9.22\nB,GB,BB,WB,Street B,Heilbronn,Street B,49.15,9.23\n';
  if (String(path).endsWith('/database/readings.csv')) return readings;
  return read(path,...args);
 };
 syncBuiltinESMExports();
 try {
  delete process.env.GOOGLE_MAPS_API_KEY;
  assert.equal((await call({origin:{latitude:999,longitude:9}})).status,400);
  const empty = await call({origin:{latitude:49.14,longitude:9.22}});
  assert.equal(empty.payload.count,0);
  assert.equal(empty.payload.route,null);
  readings += '2026-10-28T12:00:00Z,ga,80,26\n2026-10-28T12:00:00Z,gb,90,13\n';
  process.env.GOOGLE_MAPS_API_KEY = 'test-only';
  globalThis.fetch = async (_url,options) => {
   const request=JSON.parse(options.body);
   assert.equal(Object.hasOwn(request, "departureTime"), false);
   assert.equal(request.intermediates.length,2);
   return {ok:true,json:async()=>({routes:[{duration:'3600s',distanceMeters:8500,optimizedIntermediateWaypointIndex:[1,0],legs:[]}]})};
  };
  const route = await call({origin:{latitude:49.14,longitude:9.22}});
  assert.deepEqual(route.payload.stops.map(s=>s.id),['B','A']);
  assert.equal(route.payload.route.duration,'3600s');
  const mapHandler = osmBinsRouter.stack.find(l => l.route?.path === '/map').route.stack[0].handle;
  const map = await new Promise((resolve,reject) => mapHandler({}, {json:resolve}, reject));
  assert.equal(map.data[0].sensors.find(s=>s.type==='green').fillPercent,80);
  assert.equal(map.data[0].sensors.find(s=>s.type==='green').sensorId,'GA');
  assert.equal(map.data[0].sensors.find(s=>s.type==='white').fillPercent,null);
 } finally {
  fs.readFileSync=read;syncBuiltinESMExports();globalThis.fetch=fetch;
  if(key===undefined)delete process.env.GOOGLE_MAPS_API_KEY;else process.env.GOOGLE_MAPS_API_KEY=key;
 }
});

test('51 collection locations produce 25/25/1 optimized groups with no lost or duplicated stops', async () => {
 const read = fs.readFileSync, fetch = globalThis.fetch, key = process.env.GOOGLE_MAPS_API_KEY;
 const bins = Array.from({length:51},(_,i)=>`BIN-${i},GREEN-${i},BROWN-${i},WHITE-${i},Street ${i},Heilbronn,Street ${i},${49.14+i*.0001},9.22`).join('\n');
 const readings = Array.from({length:51},(_,i)=>`2026-10-28T12:00:00Z,green-${i},80,26`).join('\n');
 fs.readFileSync = (path,...args)=>{
  if(String(path).endsWith('/data/bins.csv'))return `id,green_sensor_id,brown_sensor_id,white_sensor_id,arena_name,city,address,lat,lng\n${bins}\n`;
  if(String(path).endsWith('/database/readings.csv'))return `receivedAt,sensorId,fillPercent,cm\n${readings}\n`;
  return read(path,...args);
 };
 syncBuiltinESMExports();
 const sizes=[];
 try {
  process.env.GOOGLE_MAPS_API_KEY='test-only';
  globalThis.fetch=async(_url,options)=>{
   const request=JSON.parse(options.body);
   assert.equal(Object.hasOwn(request, "departureTime"), false);sizes.push(request.intermediates.length);
   assert.equal(request.languageCode,'de');
   return {ok:true,json:async()=>({routes:[{duration:'100s',distanceMeters:1000,optimizedIntermediateWaypointIndex:request.intermediates.map((_,i)=>i).reverse(),legs:[]}]})};
  };
  const {payload,status}=await call({origin:{latitude:49.14,longitude:9.22},returnToOrigin:true,language:'de'});
  assert.equal(status,200);assert.equal(payload.groupCount,3);assert.equal(payload.route,null);
  assert.deepEqual(sizes,[25,25,1]);assert.deepEqual(payload.groups.map(g=>g.count),[25,25,1]);
  assert.equal(payload.stops.length,51);assert.equal(new Set(payload.stops.map(s=>s.id)).size,51);
  assert.equal(payload.groups[0].stops[0].id,'BIN-24');
  assert.equal(payload.groups[1].stops[0].id,'BIN-49');
  assert.ok(payload.groups.every(g=>g.stops.every((s,i)=>s.sequence===i+1 && s.group===g.group)));
 } finally {
  fs.readFileSync=read;syncBuiltinESMExports();globalThis.fetch=fetch;
  if(key===undefined)delete process.env.GOOGLE_MAPS_API_KEY;else process.env.GOOGLE_MAPS_API_KEY=key;
 }
});
