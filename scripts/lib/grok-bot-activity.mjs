/**
 * Turns read-only transcript events into a small, honest activity view for one Bot.
 * State comes from observed traffic (a live request, tool use, a failed turn); the category comes
 * from the request text and tools, falling back to the Bot's own role, and always says which.
 */
export const IDLE_AFTER=120_000;
export const REPLY_SETTLE=30_000;
export const ERROR_HOLD=60_000;
const TASK_MAX=140;

const RULES=[
  ['coding',/\b(code|coding|bug|debug|deploy|repo|github|gitlab|pull request|pr|commit|script|api|endpoint|function|compile|build|refactor|typescript|javascript|python|rust|sql|database|server|website|web ?app|frontend|backend|css|html|react|terminal|shell|docker|stack ?trace|lint|unit test|cli)\b/i],
  ['cooking',/\b(recipes?|cook\w*|bak(e|ing)|meals?|dinner|lunch|breakfast|ingredients?|grocer\w*|kitchen|food|menu|diet|nutrition|snacks?)\b/i],
  ['travel',/\b(travel\w*|trips?|flights?|hotels?|itinerar\w*|vacation|holiday|airports?|destinations?|tours?|visa|road ?trip|airbnb|booking)\b/i],
  ['writing',/\b(writ(e|ing)|draft\w*|essays?|blog\w*|articles?|posts?|copy(writing)?|emails?|newsletters?|stor(y|ies)|proofread\w*|summar\w*|docs?|documentation|tweets?|threads?|captions?|books?|read(ing)?|edit(ing)? (the )?(text|copy|draft))\b/i],
  ['analysis',/\b(research\w*|analy\w*|data|reports?|market\w*|sponsor\w*|scout\w*|leads?|prospect\w*|competitors?|numbers|spreadsheets?|financ\w*|budget\w*|forecast\w*|metrics?|ops|operations?|monitor\w*|audit\w*|pric(e|es|ing)|stocks?|crypto|compar\w*|investigat\w*|dashboards?|kpis?)\b/i],
  ['meeting',/\b(meet\w*|(phone|video|zoom) calls?|schedul\w*|calendar|coordinat\w*|standup|agenda|invites?|slack|discord|outreach|follow ?ups?|partners?|negotiat\w*)\b/i],
];
const TOOL_RULES=[
  ['coding',/(shell|terminal|exec|bash|command|edit|patch|write_?file|git|code|python|node)/i],
  ['analysis',/(search|browse|browser|web|fetch|scrape|sheet)/i],
  ['writing',/(document|notion|draft|compose)/i],
  ['meeting',/(calendar|slack|discord|meet|email|mail)/i],
];

/** Best matching place for some text, or undefined when nothing clearly matches. */
export function classify(text,tools=[]) {
  const score=new Map();
  for(const [place,re] of RULES) {
    const hits=String(text??'').match(new RegExp(re.source,'gi'));
    if(hits)score.set(place,(score.get(place)??0)+hits.length*2);
  }
  for(const tool of tools)for(const [place,re] of TOOL_RULES)if(re.test(tool))score.set(place,(score.get(place)??0)+1);
  let best,top=0;
  for(const [place,n] of score)if(n>top){best=place;top=n;}
  return best;
}

const str=v=>typeof v==='string'?v:'';
const short=v=>{const line=str(v).replace(/\s+/g,' ').trim();return line.length>TASK_MAX?line.slice(0,TASK_MAX-1)+'…':line;};

/** Classify a decoded transcript body without trusting any particular schema. */
export function readEntry(kind,body) {
  const b=body&&typeof body==='object'?body:{};
  const k=str(kind||b.kind).toLowerCase();
  const m=b.message&&typeof b.message==='object'?b.message:{};
  const role=str(b.role||m.role||b.sender||b.from||b.author?.role).toLowerCase();
  const text=str(m.content)||str(b.text)||str(b.content)||str(m.text)||str(b.prompt);
  const toolName=str(b.toolName)||str(b.tool?.name)||str(b.tool)||(/tool|call/.test(k)?str(b.name):'');
  if(role==='user'||role==='human'||/(^|[-_.])user([-_.]|$)|human|prompt/.test(k))return {who:'user',text};
  if(toolName||/tool|exec|shell|command|browser|search|edit|patch|file|step|action|thinking|reasoning/.test(k))return {who:'tool',tool:toolName||k,text};
  if(k==='send-message'||/assistant|reply|response|answer/.test(k)||role==='assistant'||role==='bot')return {who:'bot',text};
  return {who:'other',text};
}

export class ActivityTracker {
  constructor(role='') {
    this.role=role;this.watching=false;this.task='';this.taskAt=0;this.tools=[];this.said='';
    this.workingUntil=0;this.errorUntil=0;this.since=0;this.lastState='';this.kinds=new Set();
  }
  /** Seed from recent history: learns the last request, never makes the Bot look busy. */
  seed(entries) { for(const e of entries)this.apply(readEntry(e.kind,e.body),0,true); }
  observe(event,now=Date.now()) {
    if(event.type==='reset'){this.task='';this.said='';this.tools=[];return;}
    if(event.type==='turn.failed'){this.errorUntil=now+ERROR_HOLD;this.workingUntil=0;return;}
    if(event.type==='message')return this.apply({who:'bot',text:event.data.text},now,event.data.replay===true);
    if(event.type==='entry'){
      const kind=str(event.data.entryKind);if(/^[a-z0-9_.-]{1,40}$/i.test(kind))this.kinds.add(kind);
      return this.apply(readEntry(kind,event.data.entry),now,event.data.replay===true);
    }
    if(event.type==='entry.unavailable'&&event.data.replay!==true)this.workingUntil=Math.max(this.workingUntil,now+REPLY_SETTLE);
  }
  apply(info,now,history) {
    if(info.who==='user'&&info.text.trim()){this.task=short(info.text);this.taskAt=now;this.tools=[];this.said='';}
    if(info.who==='bot'&&info.text.trim())this.said=info.text.slice(0,2000);
    if(info.who==='tool'&&info.tool)this.tools=[...this.tools.slice(-5),info.tool];
    if(history)return;
    if(info.who==='user'||info.who==='tool')this.workingUntil=now+IDLE_AFTER;
    else if(info.who==='bot')this.workingUntil=Math.min(Math.max(this.workingUntil,now),now+REPLY_SETTLE);
    else this.workingUntil=Math.max(this.workingUntil,now+REPLY_SETTLE);
  }
  view(now=Date.now()) {
    const state=!this.watching?'unknown':this.errorUntil>now?'error':this.workingUntil>now?'working':'idle';
    if(state!==this.lastState){this.lastState=state;this.since=now;}
    // The SDK reports text messages without a sender, so the Bot's own words stand in for a hidden request.
    const fromTask=classify(this.task,this.tools)??classify(this.said),fromRole=classify(this.role);
    const activity=fromTask??fromRole;
    return {state,since:this.since,...this.task?{task:this.task}:{},
      ...activity?{activity,activitySource:fromTask?'task':'role'}:{}};
  }
}
