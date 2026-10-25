import { emptySimulation, parseSimulation, type SimulationSnapshot } from '../../shared/simulation';
/** An incomplete/failed poll cannot mean that a Bot was deleted. */
export function reconcile(previous: SimulationSnapshot, next: SimulationSnapshot): SimulationSnapshot {
  if(next.connection==='connected') return next;
  const bots=previous.bots.length?previous.bots:next.bots;
  return {...next,bots:bots.map(b=>({...b,state:'unknown',activity:undefined,task:undefined}))};
}
export function pollRoster(onChange: (snapshot: SimulationSnapshot)=>void) {
  let current=emptySimulation(),stopped=false;
  async function poll() {
    if(stopped)return;
    try {
      const response=await fetch('/api/simulation',{cache:'no-store',signal:AbortSignal.timeout(7000)});
      if(response.status===401) { stopped=true; location.assign('/login.html'); return; }
      if(!response.ok) throw new Error('Roster unavailable');
      current=reconcile(current,parseSimulation(await response.json()));
    } catch {
      current=reconcile(current,{...emptySimulation(),connection:'error'});
    }
    if(!stopped) { onChange(current); setTimeout(()=>void poll(),3000); }
  }
  void poll();
  return ()=>{stopped=true;};
}
