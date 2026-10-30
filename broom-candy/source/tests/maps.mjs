import assert from 'node:assert/strict';
import {maps,spot,player,start,advance,input,obstacles} from '../lib/game.ts';
for(const id of Object.keys(maps)){
 const reachable=new Set(),queue=[[120,100]];reachable.add('120,100');
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[10,0],[-10,0],[0,10],[0,-10]]){const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;if(!reachable.has(key)&&spot(nx,ny,id)){reachable.add(key);queue.push([nx,ny]);}}}
 for(let i=0;i<4;i++){const p=player(String(i),'test',i,0);assert(spot(p.x,p.y,id));assert(reachable.has(`${p.x},${p.y}`),'All spawn points must connect');}
 for(let y=40;y<570;y+=10)for(let x=30;x<780;x+=10)if(spot(x,y,id))assert(reachable.has(`${x},${y}`),`${id}: isolated walkable pocket at ${x},${y}`);
 let center=0,total=0;
 for(let n=0;n<20;n++){const r={map:id,code:id,host:'a',phase:'lobby',players:[player('a','a',0,0)],candies:[],tick:0,end:0,spawn:0};start(r,0);assert.equal(r.map,id);assert.equal(r.candies.length,45);for(const c of r.candies){assert(spot(c.x,c.y,id));total++;if(c.x>=300&&c.x<=500&&c.y>=235&&c.y<=365)center++;}advance(r,10000);const b=obstacles(id)[0];Object.assign(r.players[0],{x:b.x-17,y:b.y+b.h/2,immune:0});input(r.players[0],{dx:1,dy:0,dash:true,seq:1},10000);advance(r,10100);assert(r.players[0].x<b.x-16,`${id}: dash crossed obstacle`);}
 if(id==='glass')assert(center/total>.45,'Greenhouse concentrates candy in centre');console.log(`PASS ${id}: connected paths, safe spawns, candy placement, dash collision`);
}
