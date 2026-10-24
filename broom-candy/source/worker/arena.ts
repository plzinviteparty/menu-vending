import {advance,input,player,start,type Room} from '../lib/game';
async function handleArena(req:Request,db:D1Database){
try{if(req.method!=='POST')return Response.json({error:'잘못된 요청입니다.'},{status:405});let b=await req.json() as any;let now=Date.now();let code=String(b.code||'').toUpperCase();
if(b.action==='create'){let id=crypto.randomUUID();for(let i=0;i<6;i++){code=Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[v%32]).join('');let r:Room={code,host:id,phase:'lobby',players:[player(id,String(b.name||''),0,now)],candies:[],tick:now,end:0,spawn:0};try{await db.prepare('INSERT INTO arena_rooms(code,state,revision,updated) VALUES(?,?,0,?)').bind(code,JSON.stringify(r),now).run();await db.prepare('DELETE FROM arena_rooms WHERE updated < ?').bind(now-1800000).run();return Response.json({room:r,id,serverNow:now});}catch(e){if(i===5)throw e;}}}
if(!/^[A-Z2-9]{6}$/.test(code))throw Error('초대코드 6자리를 확인해 주세요.');
const joinedId=crypto.randomUUID();for(let attempt=0;attempt<10;attempt++){let row=await db.prepare('SELECT state,revision,updated FROM arena_rooms WHERE code=?').bind(code).first<any>();if(!row||now-row.updated>1800000)throw Error('종료되었거나 없는 방입니다.');let r=JSON.parse(row.state) as Room;r.players=r.players.filter(p=>now-p.seen<20000);if(!r.players.some(p=>p.id===r.host))r.host=r.players[0]?.id||'';advance(r,now);let id=b.id;
if(b.action==='join'){if(r.phase!=='lobby')throw Error('이미 시작된 방입니다.');if(r.players.length>=4)throw Error('방이 가득 찼습니다.');id=joinedId;r.players.push(player(id,String(b.name||''),r.players.length,now));if(!r.host)r.host=id;}
let p=r.players.find(p=>p.id===id);if(!p)throw Error('방 연결이 종료되었습니다. 다시 입장해 주세요.');p.seen=now;
if(b.action==='tick'&&r.phase==='play')input(p,b,now);
if(b.action==='start'){if(id!==r.host)throw Error('방장만 시작할 수 있습니다.');if(r.phase==='play'||r.phase==='countdown')throw Error('게임이 진행 중입니다.');if(r.players.length<2)throw Error('두 명 이상 모이면 시작할 수 있습니다.');start(r,now);}
if(b.action==='leave'){r.players=r.players.filter(p=>p.id!==id);if(r.host===id)r.host=r.players[0]?.id||'';}
let result=r.players.length?await db.prepare('UPDATE arena_rooms SET state=?,revision=revision+1,updated=? WHERE code=? AND revision=?').bind(JSON.stringify(r),now,code,row.revision).run():await db.prepare('DELETE FROM arena_rooms WHERE code=? AND revision=?').bind(code,row.revision).run();if(result.meta.changes)return Response.json({room:r,id,serverNow:now});}
return Response.json({error:'잠시 연결이 붐빕니다. 다시 시도해 주세요.'},{status:409});
}catch(e){return Response.json({error:e instanceof Error?e.message:'연결에 실패했습니다.'},{status:400});}}

const GAME_ORIGIN='https://plzinviteparty.github.io';
export async function arena(req:Request,db:D1Database){
const origin=req.headers.get('Origin');
if(origin&&origin!==new URL(req.url).origin&&origin!==GAME_ORIGIN)return new Response(null,{status:403});
const headers=new Headers({'Cache-Control':'no-store','Vary':'Origin'});
if(origin===GAME_ORIGIN){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Methods','POST, OPTIONS');headers.set('Access-Control-Allow-Headers','Content-Type');headers.set('Access-Control-Max-Age','3600');}
if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
const res=await handleArena(req,db);for(const [k,v] of headers)res.headers.set(k,v);return res;
}
