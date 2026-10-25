import { placeForBot, type SimulationBot, type SimulationSnapshot, type TaskPlace } from '../../shared/simulation';
import { PLACES, placeById } from './places';
import { ActivityLog, ago } from './log';
export const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stateLabel: Record<SimulationBot['state'],string>={unknown:'Activity unavailable',working:'Working',idle:'Resting',waiting:'Needs attention',error:'Task error',offline:'Offline'};
function node<K extends keyof HTMLElementTagNameMap>(tag:K,text:string,className='') {
  const el=document.createElement(tag); el.textContent=text; el.className=className; return el;
}
function timeNode(at:number|undefined,prefix:string) {
  const el=node('span','','since');if(!at)return el;
  el.dataset.since=String(at);el.dataset.prefix=prefix;el.textContent=`${prefix}${ago(at)}`;return el;
}
/** Where a Bot is shown and why, in the household's words. */
function activityChip(bot:SimulationBot) {
  const place=placeById(placeForBot(bot));
  const chip=node('span','','activity-chip');chip.dataset.state=bot.state;
  if(place&&bot.state!=='unknown'){chip.style.setProperty('--place-color',place.color);chip.append(node('i',place.icon),document.createTextNode(bot.state==='idle'?'Resting':place.name));}
  else chip.textContent=stateLabel[bot.state];
  return chip;
}
export class HouseUI {
  private selected:string|null=null;
  private snapshot:SimulationSnapshot|null=null;
  private signature='';
  private log=new ActivityLog();
  private placeCounts=new Map<TaskPlace,HTMLElement>();
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
      const count=node('span','','place-count');count.hidden=true;this.placeCounts.set(p.id,count);
      button.append(label,count,node('span','↗','arrow'));button.onclick=()=>focus(p.x,p.z);
      element('places').append(button);
    }
    setInterval(()=>{const now=Date.now();document.querySelectorAll<HTMLElement>('[data-since]').forEach(el=>{el.textContent=`${el.dataset.prefix??''}${ago(Number(el.dataset.since),now)}`;});},15000);
  }
  select(id:string|null) { this.selected=id;this.signature='';if(this.snapshot)this.render(this.snapshot); }
  render(snapshot:SimulationSnapshot) {
    this.snapshot=snapshot;
    const logged=this.log.update(snapshot.bots);
    const signature=JSON.stringify([snapshot.connection,snapshot.bots.map(({observedAt,...b})=>b),this.selected]);
    if(signature===this.signature&&!logged)return;
    this.signature=signature;
    const connected=snapshot.connection==='connected',tracked=snapshot.bots.some(b=>b.state!=='unknown');
    const status=element('connection');status.dataset.live=String(connected);
    status.textContent=connected?(tracked?'Live activity':'Roster connected'):snapshot.connection==='stale'?'Connection stale':snapshot.connection==='error'?'Connection lost':'Not connected';
    element('bot-count').textContent=String(snapshot.bots.length);
    const busy=snapshot.bots.filter(b=>b.state==='working').length;
    element('busy-count').textContent=busy?`${busy} working`:'';
    this.renderRoster(snapshot,connected,tracked);
    this.renderSelection(snapshot);
    this.renderPlaces(snapshot.bots);
    this.renderLog();
  }
  private renderRoster(snapshot:SimulationSnapshot,connected:boolean,tracked:boolean) {
    const roster=element('roster');roster.replaceChildren();
    if(!snapshot.bots.length) {
      const empty=node('div','','empty-roster');
      empty.append(node('div','⌂','empty-icon'),node('h3',connected?'Room for your first Bot':'A house waiting for its team'),
        node('p',connected?'Create a Bot in Grok Bot. It will arrive here after the next roster update.':'Connect Grok Bot and the Bots you create will find their way here.'));
      if(!connected){const button=node('button','Connect Grok Bot');button.onclick=()=>element<HTMLDialogElement>('connect-dialog').showModal();empty.append(button);}
      roster.append(empty);return;
    }
    for(const bot of snapshot.bots) {
      const button=node('button','','bot-row');button.setAttribute('aria-pressed',String(bot.id===this.selected));
      button.dataset.botId=bot.id;button.dataset.state=bot.state;button.style.setProperty('--bot-color',bot.color);
      button.append(node('span','••','bot-avatar'));
      const label=node('span','','bot-text');
      const top=node('span','','bot-top');top.append(node('strong',bot.name),timeNode(bot.state!=='unknown'?bot.since:undefined,''));
      label.append(top,activityChip(bot));
      if(bot.task)label.append(node('small',bot.task,'bot-task'));
      else if(bot.role)label.append(node('small',bot.role,'bot-task role'));
      button.append(label);button.onclick=()=>this.choose(bot.id);roster.append(button);
    }
    roster.append(node('p',!connected?'Showing the last known household. Task activity is unavailable until the connection returns.'
      :tracked?'Activity comes from each Bot’s live transcript. Rooms are chosen from the request, or from the Bot’s role when the request is unclear.'
      :'Names come from Grok Bot. Run the bridge with --activity to see what each Bot is working on.','roster-note'));
  }
  private renderSelection(snapshot:SimulationSnapshot) {
    const detail=element('selection'),bot=snapshot.bots.find(b=>b.id===this.selected);
    detail.hidden=!bot;detail.replaceChildren();
    if(!bot){if(this.selected){this.selected=null;this.choose(null);}return;}
    detail.style.setProperty('--bot-color',bot.color);
    const head=node('div','','selection-head');head.append(node('h3',bot.name),activityChip(bot));detail.append(head);
    if(bot.role)detail.append(node('p',bot.role,'selection-role'));
    const place=placeById(placeForBot(bot));
    if(bot.task){
      detail.append(node('span',bot.state==='working'?'CURRENT TASK':'LAST TASK','eyebrow'),node('blockquote',bot.task));
    } else detail.append(node('p',bot.state==='unknown'?'This source has not reported a current activity.':place?`${place.name} · ${place.detail}`:'Working on something general.'));
    const why=bot.state==='working'&&place?(bot.activitySource==='task'?`In the ${place.name.toLowerCase()} because of what it was asked to do.`:bot.activitySource==='role'?`In the ${place.name.toLowerCase()} based on its role; the request didn’t say.`:null)
      :bot.state==='working'?'Working, but the request doesn’t match a room yet, so it waits in the hall.':null;
    const meta=node('p','','selection-meta');
    if(why)meta.append(node('span',why));
    if(bot.since&&bot.state!=='unknown')meta.append(timeNode(bot.since,`${stateLabel[bot.state]} for `));
    if(meta.childNodes.length)detail.append(meta);
  }
  private renderPlaces(bots:SimulationBot[]) {
    const counts=new Map<TaskPlace,number>();
    for(const b of bots)if(b.state==='working'||b.state==='idle'){const p=placeForBot(b);counts.set(p,(counts.get(p)??0)+1);}
    for(const [id,el] of this.placeCounts){const n=counts.get(id)??0;el.hidden=!n;el.textContent=String(n);el.title=`${n} here now`;}
  }
  private renderLog() {
    const list=element('activity-log');list.replaceChildren();
    const entries=this.log.entries;
    element('activity-section').hidden=!entries.length;
    for(const e of entries) {
      const row=node('li',''),button=node('button','','log-row');button.style.setProperty('--bot-color',e.color);
      const text=node('span','');text.append(node('strong',e.name),document.createTextNode(` ${e.text}`));
      button.append(node('i',''),text,timeNode(e.at,''));
      button.onclick=()=>this.choose(e.botId);row.append(button);list.append(row);
    }
  }
}
