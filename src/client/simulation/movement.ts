import { placeForBot, type SimulationBot, type TaskPlace } from '../../shared/simulation';
export interface Spot { x: number; z: number; y: number; facing: number; sleep?: boolean; }
const at = (x: number, z: number, facing = Math.PI, y = .07, sleep = false): Spot => ({x,z,y,facing,sleep});
export const STATIONS: Partial<Record<TaskPlace, Spot[]>> = {
  coding:[at(-8.5,-4.2,Math.PI,.35),at(-5.6,-4.2,Math.PI,.35)],
  cooking:[at(1.15,-5.25),at(-1.6,-5.25),at(2.25,-5.25)],
  rest:[at(5.9,-5.0,0,.70,true),at(8.6,-5.0,0,.70,true)],
  writing:[at(-6.7,4.6,Math.PI,.25)],
  travel:[at(7.8,2.35,0)],
  analysis:[at(2.55,3.1,Math.PI-Math.PI/7)],
  meeting:[at(-.8,1.5,0,.35),at(-2.6,3.3,Math.PI/2,.35),at(1,3.3,-Math.PI/2,.35),at(-.8,5.1,Math.PI,.35)],
};
export function hashId(id: string) { let n=0; for(const c of id) n=(Math.imul(n,31)+c.charCodeAt(0))>>>0; return n; }
export function wanderSpot(id: string, step: number): Spot {
  const n = hashId(id + ':' + step);
  return at(-9 + n%180 / 10, -.25 + (Math.floor(n/180)%3-1)*.23, 0);
}
/** Reserve finite seats by stable identity, so extra Bots wait in the aisle instead of overlapping. */
export function assignSpots(bots: SimulationBot[]) {
  const counts = new Map<TaskPlace,number>();
  return new Map([...bots].sort((a,b)=>a.id.localeCompare(b.id)).map(bot=>{
    const place=placeForBot(bot), slot=counts.get(place)??0;
    counts.set(place,slot+1);
    return [bot.id,STATIONS[place]?.[slot]] as const;
  }));
}
/** Enter and leave rooms along the same approach. The center aisle stays clear of furniture. */
export function route(from: Spot, to: Spot): Spot[] {
  const points: Spot[] = [];
  // Library and common-room seats behind tables use the outer aisle.
  const approach = (p: Spot) => p.z > 3 ? (p.x < -3 ? -4.3 : p.x < 2 ? 2 : p.x < 4 ? 4.6 : p.x) : p.x;
  if(from.z>3) points.push(at(approach(from),from.z));
  points.push(at(approach(from),-.25),at(approach(to),-.25));
  if(to.z>3) points.push(at(approach(to),to.z));
  points.push(to);
  return points;
}
