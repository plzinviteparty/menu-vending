import type {Room} from './game';
export type SoundSettings={music:boolean,effects:boolean,musicVolume:number,effectsVolume:number};
export const defaultSound:SoundSettings={music:true,effects:true,musicVolume:.35,effectsVolume:.6};
// Original, procedurally scored miniature waltz. All voices are generated locally.
export class ArenaSound {
 private ctx:AudioContext|null=null;
 private musicBus:GainNode|null=null;
 private fxBus:GainNode|null=null;
 private timer:ReturnType<typeof setInterval>|null=null;
 private next=0;private step=0;private hidden=false;
 private previous:Room|null=null;private lastBeep=-1;
 private voices=new Set<OscillatorNode>();
 settings={...defaultSound};
 configure(s:SoundSettings){this.settings={...s};this.levels();}
 private levels(){if(!this.ctx)return;const t=this.ctx.currentTime;this.musicBus?.gain.setTargetAtTime(!this.hidden&&this.settings.music?this.settings.musicVolume*.32:0,t,.03);this.fxBus?.gain.setTargetAtTime(!this.hidden&&this.settings.effects?this.settings.effectsVolume*.46:0,t,.02);}
 unlock(){try{if(!this.ctx){this.ctx=new AudioContext();this.musicBus=this.ctx.createGain();this.fxBus=this.ctx.createGain();this.musicBus.connect(this.ctx.destination);this.fxBus.connect(this.ctx.destination);this.levels();this.next=this.ctx.currentTime+.06;this.timer=setInterval(()=>this.schedule(),60);}if(!this.hidden){void this.ctx.resume().catch(()=>{});this.schedule();}}catch{/* Audio support must never block playing. */}}
 visibility(hidden:boolean){this.hidden=hidden;this.levels();if(hidden){void this.ctx?.suspend().catch(()=>{});}else if(this.ctx){this.next=this.ctx.currentTime+.06;void this.ctx.resume().catch(()=>{});}}
 private note(midi:number,time:number,duration:number,volume:number,type:OscillatorType='triangle',fx=false,endMidi?:number){const ctx=this.ctx,bus=fx?this.fxBus:this.musicBus;if(!ctx||!bus)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(440*2**((midi-69)/12),time);if(endMidi!==undefined)o.frequency.exponentialRampToValueAtTime(440*2**((endMidi-69)/12),time+duration);g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(volume,time+.008);g.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(g);g.connect(bus);o.start(time);o.stop(time+duration+.02);this.voices.add(o);o.onended=()=>{o.disconnect();g.disconnect();this.voices.delete(o);};}
 private schedule(){const c=this.ctx;if(!c||this.hidden||c.state!=='running')return;const beat=.23;if(this.next<c.currentTime)this.next=c.currentTime+.04;const melody=[76,0,79,78,76,0,71,0,74,76,79,0,83,81,79,0,74,0,77,76,74,0,69,0,72,74,77,0,81,79,77,0,71,0,74,76,78,0,81,0,79,78,76,0,74,71,69,0,71,74,78,81,83,81,78,0,79,78,76,74,71,0,75,0];const bass=[40,40,45,45,38,38,47,47];while(this.next<c.currentTime+.22){let s=this.step%64,t=this.next;let n=melody[s];if(n)this.note(n,t,.19,.32,'triangle');const root=bass[Math.floor(s/8)];if(s%4===0)this.note(root,t,.36,.45);if(s%4===2){this.note(root+19,t,.16,.12,'sine');this.note(root+24,t,.16,.1,'sine');}this.next+=beat;this.step++;}}
 effect(kind:'pickup'|'dash'|'hit'|'start'|'end'|'count'|'join'){const c=this.ctx;if(!c||this.hidden||!this.settings.effects||c.state!=='running')return;let t=c.currentTime+.01;const n=(m:number,delay:number,d=.16,v=.35,type:OscillatorType='triangle',end?:number)=>this.note(m,t+delay,d,v,type,true,end);
 if(kind==='pickup'){n(88,0,.08,.25,'sine');n(95,.065,.16,.22,'sine');}
 if(kind==='dash'){n(48,0,.17,.3,'sawtooth',83);n(76,.025,.13,.16,'triangle',92);}
 if(kind==='hit'){n(49,0,.15,.36,'square',30);n(68,.035,.12,.16,'triangle',43);}
 if(kind==='start'){[64,67,71,76].forEach((m,i)=>n(m,i*.09,.25,.3));}
 if(kind==='end'){[76,71,79,83,88].forEach((m,i)=>n(m,i*.14,.4,.28));}
 if(kind==='count')n(83,0,.1,.2,'sine');
 if(kind==='join'){n(76,0,.12,.2);n(83,.1,.16,.2);}}
 state(r:Room,id:string){const old=this.previous,me=r.players.find(p=>p.id===id),before=old?.players.find(p=>p.id===id);if((!old||old.code!==r.code)&&r.phase==='lobby')this.effect('join');if(r.phase==='countdown'&&(old?.phase!=='countdown'||old.end!==r.end))this.lastBeep=-1;if(r.phase==='play'&&(old?.phase!=='play'||old.end!==r.end)){this.effect('start');this.lastBeep=-1;}else if(r.phase==='play'&&before&&me){if(me.immune>before.immune)this.effect('hit');else if(me.score>before.score)this.effect('pickup');if(me.cool>before.cool)this.effect('dash');}if(r.phase==='end'&&old?.phase==='play')this.effect('end');this.previous=structuredClone(r);}
 countdown(seconds:number){if(seconds>0&&seconds<=10&&seconds!==this.lastBeep){this.lastBeep=seconds;this.effect('count');}}
 reset(){this.previous=null;this.lastBeep=-1;}
 dispose(){if(this.timer)clearInterval(this.timer);this.voices.forEach(o=>{try{o.stop();}catch{}});this.voices.clear();void this.ctx?.close().catch(()=>{});this.ctx=null;}
}
