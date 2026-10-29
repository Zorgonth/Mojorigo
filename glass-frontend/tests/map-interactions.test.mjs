import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
function compile(source, dependencies) {
 const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2023,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 new Function('require','module','exports',code)(name=>dependencies[name] ?? {},module,module.exports);
 return module.exports;
}
test('address search fits geographic bounds without calling getBounds on an unattached circle', () => {
 const source=readFileSync(new URL('../src/components/GlassBinsMap.tsx',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('function FitMapToBins('),source.indexOf('const searchLocationIcon ='));
 const calls=[];
 const map={getContainer:()=>({closest:()=>null}),fitBounds:(bounds,options)=>calls.push({bounds,options})};
 const previousWindow=globalThis.window;
 globalThis.window={innerWidth:1200};
 try {
  const code=ts.transpileModule(body,{compilerOptions:{target:ts.ScriptTarget.ES2023}}).outputText;
  const run=new Function('useTranslation','useMap','useEffect','rankByDistance','L',`${code}; return FitMapToBins;`)(
   ()=>{},()=>map,fn=>fn(),()=>[{distanceMetres:700}],{
    circle:()=>{throw new Error('Circle must be added to a map before getBounds');},
    latLng:location=>({toBounds:diameter=>({location,diameter})}),
   });
  run({bins:[],location:[49.14,9.22],animate:true});
  assert.deepEqual(calls[0].bounds,{location:[49.14,9.22],diameter:1400});
  assert.equal(calls[0].options.maxZoom,16);
 } finally {globalThis.window=previousWindow;}
});
test('card selection reveals a clustered marker after movement and cancels stale popups', () => {
 const source=readFileSync(new URL('../src/components/ClusteredBins.tsx',import.meta.url),'utf8');
 const effects=[],frames=new Map(),events=new Map(),calls=[];
 let frame=0;
 const popup={setContent(){return this;},update(){},on(){},off(){},remove(){calls.push('remove');}};
 const marker={on(){},setIcon(){},getLatLng:()=>({lat:49.14,lng:9.22}),bindPopup(){calls.push('bind');return this;},openPopup(){calls.push('open');return this;},unbindPopup(){calls.push('unbind');}};
 const group={addLayers(){},getLayers:()=>[],on(){},off(){},getVisibleParent:()=>null,clearLayers(){},zoomToShowLayer(_marker,callback){calls.push('reveal');callback();}};
 const map={addLayer(){},removeLayer(){},on(){},off(name){events.delete(name);},once(name,fn){events.set(name,fn);},stop(){},getZoom:()=>12,getCenter:()=>({equals:()=>false}),getContainer:()=>({closest:()=>null}),setView(_point,zoom){assert.equal(zoom,17);events.get('moveend')?.();}};
 const previous={window:globalThis.window,document:globalThis.document,raf:globalThis.requestAnimationFrame,caf:globalThis.cancelAnimationFrame};
 globalThis.window={innerWidth:1200,matchMedia:()=>({matches:true})};
 globalThis.document={createElement:()=>({})};
 globalThis.requestAnimationFrame=fn=>{frames.set(++frame,fn);return frame;};
 globalThis.cancelAnimationFrame=id=>frames.delete(id);
 try {
  const component=compile(source,{
   'react':{useEffect:fn=>effects.push(fn),useMemo:fn=>fn(),useRef:value=>({current:value})},
   'react-dom':{createPortal:()=>null},'react-i18next':{useTranslation:()=>({i18n:{resolvedLanguage:'en'}})},
   'react-leaflet':{useMap:()=>map},'../i18n':{locationLabel:s=>s,t:s=>s},'./bin-data':{locationTitle:()=> 'Allee'},
   'leaflet':{divIcon:()=>({}),marker:()=>marker,markerClusterGroup:()=>group,MarkerCluster:class {},popup:()=>popup,point:()=>({})},
  }).default;
  component({bins:[{id:'A',latitude:49.14,longitude:9.22}],selected:'A',color:'All',onSelect:()=>{},popupContent:null});
  const cleanups=effects.map(fn=>fn());
  assert.equal(calls.includes('open'),false);
  for(const fn of [...frames.values()]) fn();
  assert.deepEqual(calls.slice(0,3),['reveal','bind','open']);
  cleanups[2]();
  assert.deepEqual(calls.slice(-2),['remove','unbind']);
  const before=calls.length;
  for(const fn of [...frames.values()]) fn();
  assert.equal(calls.length,before);
 } finally {
  globalThis.window=previous.window;globalThis.document=previous.document;
  globalThis.requestAnimationFrame=previous.raf;globalThis.cancelAnimationFrame=previous.caf;
 }
});
