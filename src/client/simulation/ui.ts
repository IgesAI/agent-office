import { placeForBot, type SimulationBot, type SimulationSnapshot } from '../../shared/simulation';
import { PLACES, placeById } from './places';
export const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stateLabel: Record<SimulationBot['state'],string>={unknown:'Activity unavailable',working:'Working',idle:'Resting',waiting:'Needs attention',error:'Task error',offline:'Offline'};
function node<K extends keyof HTMLElementTagNameMap>(tag:K,text:string,className='') {
  const el=document.createElement(tag); el.textContent=text; el.className=className; return el;
}
export class HouseUI {
  private selected:string|null=null;
  private snapshot:SimulationSnapshot|null=null;
  private signature='';
  constructor(private choose:(id:string|null)=>void,focus:(x:number,z:number)=>void) {
    const dialog=element<HTMLDialogElement>('connect-dialog');
    document.querySelectorAll('.connect').forEach(b=>b.addEventListener('click',()=>dialog.showModal()));
    dialog.querySelectorAll('.dialog-close,.dialog-done').forEach(b=>b.addEventListener('click',()=>dialog.close()));
    dialog.addEventListener('close',()=>element('house').focus({preventScroll:true}));
    for(const p of PLACES) {
      const button=node('button','','place');button.title=p.detail;
      button.style.setProperty('--place-color',p.color);
      button.append(node('span',p.icon,'place-icon'));
      const label=node('span','');label.append(node('strong',p.name),node('small',p.detail));
      button.append(label,node('span','↗','arrow'));button.onclick=()=>focus(p.x,p.z);
      element('places').append(button);
    }
  }
  select(id:string|null) { this.selected=id;this.signature='';if(this.snapshot)this.render(this.snapshot); }
  render(snapshot:SimulationSnapshot) {
    this.snapshot=snapshot;
    const signature=JSON.stringify([snapshot.connection,snapshot.bots.map(({observedAt,...b})=>b),this.selected]);
    if(signature===this.signature)return;
    this.signature=signature;
    const connected=snapshot.connection==='connected';
    const status=element('connection');status.dataset.live=String(connected);
    status.textContent=connected?'Roster connected':snapshot.connection==='stale'?'Connection stale':snapshot.connection==='error'?'Connection lost':'Not connected';
    element('bot-count').textContent=String(snapshot.bots.length);
    const roster=element('roster');roster.replaceChildren();
    if(!snapshot.bots.length) {
      const empty=node('div','','empty-roster');
      empty.append(node('div','⌂','empty-icon'),node('h3',connected?'Room for your first Bot':'A house waiting for its team'),
        node('p',connected?'Create a Bot in Grok Bot. It will arrive here after the next roster update.':'Connect Grok Bot and the Bots you create will find their way here.'));
      if(!connected){const button=node('button','Connect Grok Bot');button.onclick=()=>element<HTMLDialogElement>('connect-dialog').showModal();empty.append(button);}
      roster.append(empty);
    } else {
      for(const bot of snapshot.bots) {
        const button=node('button','','bot-row');button.setAttribute('aria-pressed',String(bot.id===this.selected));
        button.dataset.botId=bot.id;button.style.setProperty('--bot-color',bot.color);
        button.append(node('span','••','bot-avatar'));
        const label=node('span','');label.append(node('strong',bot.name),node('small',stateLabel[bot.state]));button.append(label);
        button.onclick=()=>this.choose(bot.id);roster.append(button);
      }
      roster.append(node('p',connected?'Names come from Grok Bot. Wandering is ambient animation, not a report of task activity.':'Showing the last known household. Task activity is unavailable until the connection returns.','roster-note'));
    }
    const detail=element('selection'),bot=snapshot.bots.find(b=>b.id===this.selected);
    detail.hidden=!bot;detail.replaceChildren();
    if(bot) {
      detail.append(node('h3',bot.name),node('strong',stateLabel[bot.state]));
      const place=placeById(placeForBot(bot));
      detail.append(node('p',bot.task??(place?`${place.name} · ${place.detail}`:'This source has not reported a current activity.')));
    } else if(this.selected) {this.selected=null;this.choose(null);}
  }
}
