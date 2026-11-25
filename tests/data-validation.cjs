const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('dist/app.js', 'utf8');
const start = source.indexOf('const defaultState=');
const end = source.indexOf('let state=defaultState()');
const sandbox = {};
vm.runInNewContext(source.slice(start, end) + ';this.seed=defaultState();this.validate=validState;', sandbox);
const copy = () => JSON.parse(JSON.stringify(sandbox.seed));
assert.ok(sandbox.validate(copy()), 'Empty workspace must round-trip');
const complete = copy();
complete.profile.specialties=['Web design'];
complete.services=[{id:'service-1',name:'Site',specialty:'Web design',deliverables:'Site responsivo',deadline:'',price:'',exclusions:'',proof:'',active:true}];
complete.drafts=[{id:'draft-1',niche:'Barbearias',state:'DF',city:'São Sebastião',neighborhood:'',quantity:5,createdAt:'2026-11-25T00:00:00Z'}];
assert.ok(sandbox.validate(JSON.parse(JSON.stringify(complete))), 'Full backup must round-trip');
for(const invalid of [null,[],{}, {...copy(), version:2}, {...copy(), profile:null}, {...copy(), services:[{}]}, {...copy(), drafts:[{}]}, {...copy(), services:[...complete.services,...complete.services]}, {...copy(), profile:{...copy().profile,specialties:[{}]}}]){
  assert.ok(!sandbox.validate(invalid), 'Malformed backup must be rejected');
}
console.log('10 backup-validation scenarios passed.');
