import * as THREE from 'three';
import { placeForBot, type SimulationBot } from '../../shared/simulation';
import { Resident } from './resident';
import { assignSpots, hashId, route, wanderSpot, type Spot } from './movement';
interface Actor { bot: SimulationBot; model: Resident; path: Spot[]; destination: Spot; key: string; wait: number; step: number; reserved: boolean; }
export class Actors {
  readonly actors = new Map<string, Actor>();
  private clock=0;
  constructor(private scene: THREE.Scene) {}
  sync(bots: SimulationBot[], still = false) {
    const ids = new Set(bots.map(b=>b.id));
    for(const [id,a] of this.actors) if(!ids.has(id)) { a.model.dispose(); this.actors.delete(id); }
    const spots=assignSpots(bots);
    for(const bot of bots) {
      let a=this.actors.get(bot.id);
      if(!a) {
        const model=new Resident(bot); model.root.position.set(4.3,.07,7);
        this.scene.add(model.root);
        a={bot,model,path:[],destination:wanderSpot(bot.id,0),key:'',wait:0,step:0,reserved:false};
        this.actors.set(bot.id,a);
      }
      a.bot=bot; a.model.sync(bot);
      const spot=spots.get(bot.id), key=`${bot.state}:${placeForBot(bot)}:${spot?.x}:${spot?.z}`;
      if(a.key!==key) {
        a.key=key; a.reserved=!!spot;
        this.travel(a,spot??wanderSpot(bot.id,a.step));
        if(still) {
          a.path=[];a.model.root.position.set(a.destination.x,a.destination.y,a.destination.z);
          a.model.root.rotation.y=a.destination.facing;
          a.model.pose(0,false,a.reserved?placeForBot(bot):'general',!!a.destination.sleep);
        }
      }
    }
  }
  private travel(a: Actor, destination: Spot) {
    const p=a.model.root.position;
    a.path=route({x:p.x,z:p.z,y:.07,facing:0},destination);
    a.destination=destination;
  }
  update(dt: number) {
    this.clock+=dt;
    for(const a of this.actors.values()) {
      const p=a.model.root.position, next=a.path[0];
      if(next) {
        const dx=next.x-p.x,dz=next.z-p.z,length=Math.hypot(dx,dz), distance=dt*1.65;
        if(length<=distance) { p.set(next.x,next.y,next.z); a.path.shift(); }
        else { p.x+=dx/length*distance; p.z+=dz/length*distance; p.y=.07; a.model.root.rotation.y=Math.atan2(dx,dz); }
        a.wait=5+hashId(a.bot.id)%8;
      } else {
        a.model.root.rotation.y=a.destination.facing;
        a.wait-=dt;
        if(!a.reserved && a.wait<=0 && a.bot.state==='unknown') this.travel(a,wanderSpot(a.bot.id,++a.step));
      }
      const walking=a.path.length>0;
      a.model.pose(this.clock+hashId(a.bot.id)%20,walking,!walking&&a.reserved?placeForBot(a.bot):'general',!walking&&!!a.destination.sleep);
    }
  }
  select(id: string | null) { for(const [key,a] of this.actors) a.model.selected(key===id); }
  position(id: string) { return this.actors.get(id)?.model.root.position; }
  pick(ray: THREE.Raycaster): string | null {
    const hit=ray.intersectObjects([...this.actors.values()].map(a=>a.model.root),true)[0];
    let o:THREE.Object3D|null=hit?.object??null;
    while(o) { if(typeof o.userData.botId==='string') return o.userData.botId; o=o.parent; }
    return null;
  }
}
