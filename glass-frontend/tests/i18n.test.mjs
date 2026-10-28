import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createInstance } from 'i18next';
import ts from 'typescript';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const en = JSON.parse(read('../src/locales/en.json'));
const de = JSON.parse(read('../src/locales/de.json'));
const instance = createInstance();
await instance.init({resources:{en:{translation:en},de:{translation:de}},lng:'en',fallbackLng:'en',supportedLngs:['en','de'],keySeparator:false,nsSeparator:false,interpolation:{escapeValue:false}});
test('English and German catalogues cover the same keys and interpolation values', () => {
 assert.deepEqual(Object.keys(en).sort(), Object.keys(de).sort());
 for(const key of Object.keys(en)) {
  assert.ok(de[key].trim(),key);
  const placeholders=value=>[...value.matchAll(/{{(.*?)}}/g)].map(m=>m[1]).sort();
  assert.deepEqual(placeholders(en[key]),placeholders(de[key]),key);
 }
});
test('language switching translates labels, validations, dynamic counts and colours in both directions', async () => {
 await instance.changeLanguage('de');
 assert.equal(instance.t('About'),'Über uns');
 assert.equal(instance.t('{{count}} results',{count:1}),'1 Ergebnis');
 assert.equal(instance.t('{{count}} results',{count:3}),'3 Ergebnisse');
 assert.equal(instance.t('{{colour}} glass',{colour:instance.t('Brown')}),'Braunglas');
 assert.match(instance.t('Enter a Heilbronn postcode: 74072, 74074, 74076, 74078, 74080 or 74081.'),/Postleitzahl/);
 assert.equal(instance.t('About G.L.A.S.S'),'Über G.L.A.S.S');
 await instance.changeLanguage('en');
 assert.equal(instance.t('About'),'About');
 assert.equal(instance.t('{{count}} results',{count:1}),'1 result');
});
test('only EN and DE appear in the shared language selector',()=>{
 const selector=read('../src/components/LanguageSelect.tsx');
 assert.deepEqual([...selector.matchAll(/<option value="(.*?)" lang=".*?">(.*?)<\/option>/g)].map(m=>[m[1],m[2]]),[['en','EN'],['de','DE']]);
});
test('every literal translation key used by UI components has both translations',()=>{
 const root=new URL('../src/',import.meta.url);
 const files=['App.tsx','i18n.ts',...readdirSync(new URL('components/',root)).filter(f=>f.endsWith('.tsx')).map(f=>'components/'+f)];
 for(const file of files){
  const source=readFileSync(new URL(file,root),'utf8');
  const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function visit(node){
   if(ts.isCallExpression(node) && ((ts.isIdentifier(node.expression)&&['t','translate'].includes(node.expression.text))) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])){
    const key=node.arguments[0].text;
    assert.ok(Object.hasOwn(en,key),`${file}: missing English key ${key}`);
    assert.ok(Object.hasOwn(de,key),`${file}: missing German key ${key}`);
   }
   ts.forEachChild(node,visit);
  }
  visit(ast);
 }
});
