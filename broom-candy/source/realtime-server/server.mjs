import http from 'node:http';
import {WebSocketServer,WebSocket} from 'ws';
import {advance,input,player,start} from './shared/game.ts';
import {randomBytes,randomUUID} from 'node:crypto';
export function createArenaServer({port=Number(process.env.PORT)||3000,host='0.0.0.0'}={}){
 const rooms=new Map(),clients=new Set();
 const server=http.createServer((req,res)=>{res.writeHead(req.url==='/health'?200:404,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true,service:'broom-candy-realtime'}));});
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
 const origins=new Set((process.env.ALLOWED_ORIGINS||'https://plzinviteparty.github.io').split(',').map(s=>s.trim()));
 server.on('upgrade',(req,socket,head)=>{if(req.headers.origin&&!origins.has(req.headers.origin)){socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
 const send=(ws,m)=>{if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<65536)ws.send(JSON.stringify(m));};
 const view=(r)=>({room:r,serverNow:Date.now()});
 const broadcast=(r)=>{for(const c of clients)if(c.code===r.code)send(c.ws,{type:'state',...view(r)});};
 const leave=(c)=>{const r=rooms.get(c.code);c.code='';if(!r)return;r.players=r.players.filter(p=>p.id!==c.id);if(r.host===c.id)r.host=r.players[0]?.id||'';if(!r.players.length)rooms.delete(r.code);else broadcast(r);};
 wss.on('connection',ws=>{const c={ws,id:randomUUID(),code:'',last:Date.now(),window:Date.now(),count:0};clients.add(c);ws.on('pong',()=>c.last=Date.now());ws.on('close',()=>{leave(c);clients.delete(c)});ws.on('error',()=>{});
 ws.on('message',data=>{let b;try{b=JSON.parse(data.toString());if(Date.now()-c.window>1000){c.window=Date.now();c.count=0;}if(++c.count>100)throw Error('요청이 너무 많아요.');const now=Date.now();c.last=now;let r=rooms.get(c.code);
 if(b.action==='create'){if(rooms.size>=500)throw Error('방이 가득 찼어요. 잠시 후 다시 시도해 주세요.');leave(c);let code;do{code=[...randomBytes(6)].map(v=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[v%32]).join('')}while(rooms.has(code));r={code,host:c.id,phase:'lobby',players:[player(c.id,String(b.name||''),0,now)],candies:[],tick:now,end:0,spawn:0};rooms.set(code,r);c.code=code;}
 else if(b.action==='join'){const target=rooms.get(String(b.code||'').toUpperCase());if(!target)throw Error('없거나 종료된 방이에요.');if(target.phase!=='lobby')throw Error('이미 시작된 방이에요.');if(target.code===c.code)throw Error('이미 이 방에 참여하고 있어요.');if(target.players.length>=4)throw Error('방이 가득 찼어요.');leave(c);r=target;c.code=r.code;r.players.push(player(c.id,String(b.name||''),r.players.length,now));}
 else if(b.action==='ping'){send(ws,{type:'pong',sent:b.sent,serverNow:now});return;}
 else{if(!r)throw Error('방에 다시 입장해 주세요.');if(b.action==='leave'){leave(c);send(ws,{requestId:b.requestId,ok:true});return;}if(b.action==='start'){if(c.id!==r.host)throw Error('방장만 시작할 수 있어요.');if(r.phase==='play'||r.phase==='countdown')throw Error('이미 진행 중이에요.');if(r.players.length<2)throw Error('두 명 이상 모이면 시작할 수 있어요.');start(r,now);}else if(b.action==='input'){const p=r.players.find(p=>p.id===c.id);if(p&&r.phase==='play'&&Number.isFinite(b.dx)&&Number.isFinite(b.dy)&&Number.isSafeInteger(b.seq))input(p,b,now);return;}else throw Error('지원하지 않는 요청이에요.');}
 send(ws,{requestId:b.requestId,id:c.id,...view(r)});broadcast(r);
 }catch(e){send(ws,{requestId:b?.requestId,error:e.message||'요청 처리에 실패했어요.'});}});});
 let lastBroadcast=0;const timer=setInterval(()=>{const now=Date.now();for(const r of rooms.values())advance(r,now);if(now-lastBroadcast>=50){for(const r of rooms.values())broadcast(r);lastBroadcast=now;}},1000/60);
 const heartbeat=setInterval(()=>{for(const c of clients){if(Date.now()-c.last>45000)c.ws.terminate();else c.ws.ping();}},15000);
 server.listen(port,host);return{server,rooms,wss,close:async()=>{clearInterval(timer);clearInterval(heartbeat);for(const c of clients)c.ws.terminate();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve));}};
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href){const service=createArenaServer();service.server.on('listening',()=>console.log(`Arena listening on ${service.server.address().port}`));for(const s of ['SIGTERM','SIGINT'])process.on(s,()=>void service.close().then(()=>process.exit(0)));}
