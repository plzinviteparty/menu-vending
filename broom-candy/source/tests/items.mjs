import assert from 'node:assert/strict';
import {player,start,advance,input,moveSpeed,spot,clearPath} from '../lib/game.ts';
function room(mode='items'){const r={mode,code:'ITEMS',host:'a',phase:'lobby',players:[player('a','a',0,0),player('b','b',1,0)],candies:[],tick:0,end:0,spawn:0};start(r,0);return r;}
assert.equal(clearPath(240,150,280,150,'maze'),false);
let r=room();assert.equal(r.items.length,3);advance(r,9999);assert(!r.players[0].boost);advance(r,10000);
r.items=[{x:120,y:100,kind:'boost',expires:30000}];r.candies=[];advance(r,10025);let p=r.players[0];assert(p.boost>=15000);assert.equal(r.items.length,0);assert.equal(moveSpeed(p,10025),210);input(p,{dx:1,dy:0,seq:1},10025);const x=p.x;advance(r,10125);assert(Math.abs(p.x-x-21)<.01);input(p,{dx:1,dy:0,dash:true,seq:2},10125);assert.equal(moveSpeed(p,10125),520);assert.equal(moveSpeed({...p,dash:0},p.boost),155);
r=room();advance(r,10000);r.items=[];r.candies=[{x:180,y:100}];r.players[0].magnet=15000;advance(r,10400);assert.equal(r.players[0].score,1);assert.equal(r.players[1].score,0);
r=room();advance(r,10000);r.items=[];r.candies=[];Object.assign(r.players[0],{x:100,y:100,immune:0});Object.assign(r.players[1],{x:145,y:100,score:10,immune:0,shield:20000});input(r.players[0],{dx:1,dy:0,dash:true,seq:1},10000);advance(r,10100);assert.equal(r.players[1].score,10);assert.equal(r.players[1].shield,0);assert(r.players[1].immune>11000);
for(const map of ['garden','maze','glass']){r=room();r.map=map;start(r,0);assert(r.items.every(i=>spot(i.x,i.y,map)));advance(r,10000);for(let t=10500;t<30000;t+=500)advance(r,t);assert(r.items.length<=3);start(r,40000);assert(r.players.every(p=>!p.boost&&!p.magnet&&!p.shield));}
r=room('classic');assert.equal(r.items.length,0);advance(r,20000);assert.equal(r.items.length,0);
console.log('PASS: pickup, 210 acceleration, 520 dash cap, expiry, magnet single ownership, shield single hit, all maps, reset, classic isolation');
