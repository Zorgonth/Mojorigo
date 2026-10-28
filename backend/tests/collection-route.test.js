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
  if (String(path).endsWith('/data/bins.csv')) return 'id,green_sensor_id,brown_sensor_id,white_sensor_id,arena_name,city,address,lat,lng\nA,ga,ba,wa,Street A,Heilbronn,Street A,49.14,9.22\nB,gb,bb,wb,Street B,Heilbronn,Street B,49.15,9.23\n';
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
   assert.equal(request.intermediates.length,2);
   return {ok:true,json:async()=>({routes:[{duration:'3600s',distanceMeters:8500,optimizedIntermediateWaypointIndex:[1,0],legs:[]}]})};
  };
  const route = await call({origin:{latitude:49.14,longitude:9.22}});
  assert.deepEqual(route.payload.stops.map(s=>s.id),['B','A']);
  assert.equal(route.payload.route.duration,'3600s');
 } finally {
  fs.readFileSync=read;syncBuiltinESMExports();globalThis.fetch=fetch;
  if(key===undefined)delete process.env.GOOGLE_MAPS_API_KEY;else process.env.GOOGLE_MAPS_API_KEY=key;
 }
});
