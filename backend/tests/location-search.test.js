import { test } from 'node:test';
import assert from 'node:assert/strict';
import { locationSearchRouter } from '../src/routes/locationSearch.js';
const handler = locationSearchRouter.stack[0].route.stack[0].handle;
async function call(q) {
  let status = 200, payload;
  await handler({query:{q}}, {status(value) {status=value;return this;}, json(value) {payload=value;}});
  return {status,payload};
}
test('address lookup validates, restricts results to Heilbronn, preserves coordinate order, caches and throttles', async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async url => {
    requests++;
    assert.equal(new URL(url).searchParams.get('bbox'), '9.05,49.07,9.35,49.25');
    return {ok:true,json:async()=>({features:[
      {properties:{city:'Heilbronn',postcode:'74072',street:'Allee',housenumber:'1',osm_type:'W',osm_id:1},geometry:{coordinates:[9.22,49.14]}},
      {properties:{city:'Neckarsulm',postcode:'74172'},geometry:{coordinates:[9.2,49.19]}}
    ]})};
  };
  try {
    assert.equal((await call('a')).status,400);
    const result = await call('Allee 1');
    assert.equal(result.payload.length,1);
    assert.deepEqual(result.payload[0].coordinates,[49.14,9.22]);
    assert.equal(result.payload[0].label,'Allee 1, 74072, Heilbronn');
    assert.deepEqual(await call('allee 1'),result);
    assert.equal(requests,1);
    assert.equal((await call('Andere Straße')).status,429);
  } finally { globalThis.fetch=originalFetch; }
});
