const $=id=>document.getElementById(id);

const RULES=[
{id:"height",title:"Posible trabajo en altura sin protección contra caídas visible",icon:"🪜",severity:"Alto",type:"Acto inseguro",
 normGeneral:"Decreto 351/79, art. 200 (trabajo en altura con peligro de caída).",
 normConstruction:"Decreto 911/96, arts. 52, 54 y 55; art. 112 para protección personal contra caídas según diferencia de nivel.",
 action:"Detener o asegurar la tarea y verificar protección colectiva, sistema anticaídas, anclaje, acceso, plataforma/barandas y procedimiento aplicable."},
{id:"helmet",title:"Casco no visible donde sería requerido",icon:"⛑️",severity:"Alto",type:"Acto inseguro",
 normGeneral:"Ley 19.587 y Decreto 351/79, Cap. 19 (equipos y elementos de protección personal) según riesgo.",
 normConstruction:"Decreto 911/96, capítulo de Equipos y Elementos de Protección Personal, según tarea y riesgo.",
 action:"Verificar evaluación de riesgos, obligatoriedad del casco y uso de protección de cabeza adecuada."},
{id:"vehicle_person",title:"Interacción persona–vehículo",icon:"🚜",severity:"Alto",type:"Condición insegura",
 normGeneral:"Ley 19.587 y Decreto 351/79; si intervienen autoelevadores, verificar además Resolución SRT 960/2015.",
 normConstruction:"Decreto 911/96 y requisitos aplicables a circulación/equipos móviles; para autoelevadores verificar normativa específica aplicable.",
 action:"Separar circulación peatonal y vehicular; controlar velocidad, visibilidad, señalización y operación segura."},
{id:"eye",title:"Protección ocular no visible",icon:"🥽",severity:"Alto",type:"Acto inseguro",
 normGeneral:"Ley 19.587 y Decreto 351/79, Cap. 19, protección ocular/facial según riesgo.",
 normConstruction:"Decreto 911/96, EPP según tarea y riesgo de proyección/partículas.",
 action:"Verificar riesgo de proyección, radiación o partículas y EPP ocular/facial requerido."},
{id:"electric",title:"Posible instalación / partes eléctricas accesibles",icon:"⚡",severity:"Alto",type:"Condición insegura",
 normGeneral:"Decreto 351/79, arts. 95 a 102 y Anexo VI (Instalaciones Eléctricas).",
 normConstruction:"Decreto 911/96, arts. 74 a 87; art. 64 cuando existan trabajos próximos a líneas de servicios.",
 action:"Restringir acceso si corresponde y verificar tensión, envolvente, aislamiento, protecciones, bloqueo/consignación, señalización y condición segura."},
{id:"fire",title:"Matafuego / acceso de extinción obstruido",icon:"🧯",severity:"Alto",type:"Condición insegura",
 normGeneral:"Decreto 351/79, arts. 160 a 187 y Anexo VII (Protección contra Incendios).",
 normConstruction:"Decreto 911/96, capítulo de Prevención y Protección contra Incendios (desde art. 88).",
 action:"Liberar acceso y verificar ubicación, señalización, tipo, mantenimiento y condición operativa del equipo."},
{id:"walkway",title:"Obstáculo / cable en circulación",icon:"🚧",severity:"Medio",type:"Condición insegura",
 normGeneral:"Ley 19.587 y Decreto 351/79, condiciones de orden, limpieza y circulación segura.",
 normConstruction:"Decreto 911/96, condiciones de lugares de trabajo, circulación, orden y protección.",
 action:"Retirar, proteger o canalizar el obstáculo y mantener libre la zona de paso."},
{id:"machine",title:"Máquina / herramienta sin resguardo visible",icon:"⚙️",severity:"Alto",type:"Condición insegura",
 normGeneral:"Decreto 351/79, Cap. 15 (Máquinas y Herramientas).",
 normConstruction:"Decreto 911/96, requisitos aplicables a máquinas, herramientas y equipos de obra.",
 action:"No operar hasta verificar resguardos, pantallas, protecciones y dispositivos de seguridad."}
];

let stream=null,coco=null,mobile=null,running=false,facing="environment";
let findings=JSON.parse(localStorage.getItem("sst_v2_findings")||"[]");
let pendingRule=null,lastCapture=null,currentProposal=null,lastProposalKey="",lastProposalAt=0;
let lastSceneCheck=0,lastSceneInfo={text:"",items:[],electrical:false,tool:false,screen:false};
function currentNorm(rule){
 const profile=$("legalProfile")?.value||"general";
 return profile==="construction" ? (rule.normConstruction||rule.normGeneral||"") : (rule.normGeneral||rule.normConstruction||"");
}
let lastHeadCheck=0,lastHelmetResult=null;

function persist(){localStorage.setItem("sst_v2_findings",JSON.stringify(findings))}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function renderRules(){
 $("ruleList").innerHTML=RULES.map(r=>`<div class="rule" data-rule="${r.id}"><div class="ico">${r.icon}</div><div><strong>${r.title}</strong><small>${r.severity} · ${currentNorm(r)}</small></div></div>`).join("");
 document.querySelectorAll(".rule").forEach(e=>e.onclick=()=>openRule(e.dataset.rule,"manual/guiado"));
}
function openRule(id,source="manual/guiado",notes=""){
 pendingRule=RULES.find(r=>r.id===id);if(!pendingRule)return;
 $("mTitle").textContent=pendingRule.title;$("mNorm").textContent="Referencia orientativa: "+currentNorm(pendingRule);
 $("mType").value=pendingRule.type;$("mNotes").value=notes;$("mAction").value=pendingRule.action;
 $("modal").classList.add("show");
 if(source==="IA automática") $("mNotes").dataset.source="IA automática"; else delete $("mNotes").dataset.source;
}
function saveFinding(){
 if(!pendingRule)return;
 const source=$("mNotes").dataset.source||"manual/guiado";
 findings.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),ruleId:pendingRule.id,title:pendingRule.title,severity:pendingRule.severity,type:$("mType").value,norm:currentNorm(pendingRule),sector:$("mSector").value.trim(),notes:$("mNotes").value.trim(),action:$("mAction").value.trim(),time:new Date().toISOString(),source,image:lastCapture});
 persist();renderFindings();$("modal").classList.remove("show");delete $("mNotes").dataset.source;
}
function renderFindings(){
 $("totalCount").textContent=findings.length;$("highCount").textContent=findings.filter(f=>f.severity==="Alto").length;$("autoCount").textContent=findings.filter(f=>f.source==="IA automática").length;
 $("findings").innerHTML=findings.length?findings.map(f=>`<div class="finding"><div class="finding-top"><div><h3>${esc(f.title)}</h3><p>${esc(f.sector||"Sector no indicado")} · ${new Date(f.time).toLocaleString("es-AR")}</p></div><span class="tag ${f.severity==="Alto"?"red":"amber"}">${esc(f.severity)}</span></div><p><b>${esc(f.type)}</b> · ${esc(f.source)}</p><p>${esc(f.notes||"Sin observación adicional.")}</p><p><b>Norma relacionada:</b> ${esc(f.norm)}</p><p><b>Acción:</b> ${esc(f.action)}</p>${f.image?`<img class="thumb" src="${f.image}">`:""}</div>`).join(""):`<div class="status">Todavía no hay hallazgos registrados.</div>`;
}

async function startCamera(){
 try{
  stopCamera();
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720}},audio:false});
  $("video").srcObject=stream;await $("video").play();$("placeholder").style.display="none";$("onlinePill").textContent="● cámara activa";$("onlinePill").classList.add("on");
  $("startBtn").disabled=true;$("stopBtn").disabled=false;$("captureBtn").disabled=false;$("switchBtn").disabled=false;
  running=true;resizeCanvas();if(!coco)loadModels();detectLoop();
 }catch(e){$("status").textContent="No se pudo abrir la cámara: "+e.message}
}
function stopCamera(){
 running=false;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}$("video").srcObject=null;$("placeholder").style.display="grid";$("onlinePill").textContent="● cámara inactiva";$("onlinePill").classList.remove("on");
 $("startBtn").disabled=false;$("stopBtn").disabled=true;$("captureBtn").disabled=true;$("switchBtn").disabled=true;
 const c=$("overlay");c.getContext("2d").clearRect(0,0,c.width,c.height);
}
async function loadModels(){
 try{$("modelStatus").textContent="IA: cargando detector…";coco=await cocoSsd.load({base:"lite_mobilenet_v2"});$("modelStatus").textContent="IA: detector activo";
  setTimeout(async()=>{try{mobile=await mobilenet.load({version:2,alpha:0.5});$("modelStatus").textContent="IA: detector + contexto";}catch(e){}},1000);
 }catch(e){$("modelStatus").textContent="IA: error";$("status").textContent="No se pudo cargar el detector general."}
}
function resizeCanvas(){const v=$("video"),c=$("overlay");c.width=v.videoWidth||1280;c.height=v.videoHeight||720}
function draw(preds,proposal){
 const c=$("overlay"),ctx=c.getContext("2d"),v=$("video");if(v.videoWidth&&c.width!==v.videoWidth)resizeCanvas();ctx.clearRect(0,0,c.width,c.height);ctx.lineWidth=4;ctx.font="20px system-ui";
 preds.forEach(p=>{const[x,y,w,h]=p.bbox;ctx.strokeStyle="#20c4e6";ctx.fillStyle="rgba(3,10,18,.8)";ctx.strokeRect(x,y,w,h);const lab=`${p.class} ${(p.score*100).toFixed(0)}%`;const tw=ctx.measureText(lab).width+14;ctx.fillRect(x,Math.max(0,y-28),tw,28);ctx.fillStyle="#fff";ctx.fillText(lab,x+7,Math.max(20,y-7))});
 if(proposal&&proposal.box){const[x,y,w,h]=proposal.box;ctx.strokeStyle=proposal.severity==="Alto"?"#ef4444":"#f59e0b";ctx.lineWidth=7;ctx.strokeRect(x,y,w,h)}
}
function captureFrame(){
 const v=$("video");if(!v.videoWidth)return null;const c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0,c.width,c.height);return c;
}
function captureEvidence(){const c=captureFrame();if(!c)return;lastCapture=c.toDataURL("image/jpeg",.78);$("status").textContent="Evidencia capturada. Podés registrar un hallazgo manual o esperar una propuesta automática."}

function boxNear(a,b){
 const ac=[a[0]+a[2]/2,a[1]+a[3]/2],bc=[b[0]+b[2]/2,b[1]+b[3]/2];const d=Math.hypot(ac[0]-bc[0],ac[1]-bc[1]);return d<Math.max(a[2],a[3],b[2],b[3])*1.35;
}
function elevatedScore(box,W,H){
 const [x,y,w,h]=box;
 const bottom=(y+h)/H, relH=h/H, centerY=(y+h/2)/H, top=y/H;
 // V2.1: regla deliberadamente conservadora. Solo se usa en contexto "obra".
 // Requiere persona visible, con tamaño suficiente y cuyo extremo inferior quede claramente elevado.
 let score=0;
 if(relH>.24) score+=.22;
 if(bottom<.76) score+=.34;
 if(bottom<.66) score+=.18;
 if(centerY<.55) score+=.16;
 if(top>.02) score+=.05;
 return Math.min(.95,score);
}
async function classifyHead(person){
 if(!mobile||Date.now()-lastHeadCheck<3200)return lastHelmetResult;
 lastHeadCheck=Date.now();
 try{
  const v=$("video"),[x,y,w,h]=person.bbox;
  const sx=Math.max(0,x+w*.18),sy=Math.max(0,y),sw=Math.min(v.videoWidth-sx,w*.64),sh=Math.min(v.videoHeight-sy,h*.32);
  const c=document.createElement("canvas");c.width=224;c.height=224;c.getContext("2d").drawImage(v,sx,sy,sw,sh,0,0,224,224);
  const res=await mobile.classify(c,5);const text=res.map(r=>r.className.toLowerCase()).join(" | ");
  const helmet=/helmet|hard hat|crash helmet|construction helmet/.test(text);
  lastHelmetResult={helmet,text,top:res[0]?.probability||0};return lastHelmetResult;
 }catch(e){return null}
}

async function classifyScene(){
 if(!mobile || Date.now()-lastSceneCheck<2400) return lastSceneInfo;
 lastSceneCheck=Date.now();
 try{
   const c=captureFrame();
   if(!c) return lastSceneInfo;
   const res=await mobile.classify(c,8);
   const items=res.map(r=>({name:r.className.toLowerCase(),p:r.probability}));
   const text=items.map(x=>x.name).join(" | ");
   const electrical=/switch|electric|electrical|plug|socket|power supply|power drill|meter|oscilloscope|control panel|fuse|circuit/.test(text);
   const tool=/power drill|drill|chain saw|circular saw|hammer|screwdriver/.test(text);
   const screen=/monitor|screen|television|laptop|notebook|desktop computer/.test(text);
   lastSceneInfo={text,items,electrical,tool,screen};
   const brief=items.slice(0,3).map(x=>`${x.name} ${Math.round(x.p*100)}%`).join(" · ");
   $("sceneStatus").textContent="Contexto visual IA: "+(brief||"sin clasificación");
   return lastSceneInfo;
 }catch(e){ return lastSceneInfo; }
}

async function inferRisk(preds){
 const persons=preds.filter(p=>p.class==="person"&&p.score>.55);
 const vehicles=preds.filter(p=>["car","truck","bus","motorcycle"].includes(p.class)&&p.score>.45);
 const W=$("video").videoWidth||1280,H=$("video").videoHeight||720;
 const context=$("contextMode").value,helmetPolicy=$("helmetPolicy").value;
 const sensitivity=$("autoSensitivity")?.value||"strict";
 const scene=await classifyScene();
 let candidates=[];

 // 1) Persona-vehículo: solo en contextos donde tiene sentido.
 if(["general","obra","deposito"].includes(context)){
   persons.forEach(p=>vehicles.forEach(v=>{
     if(boxNear(p.bbox,v.bbox)) candidates.push({
       key:"vehicle",ruleId:"vehicle_person",
       title:"⚠️ Posible interacción persona–vehículo",
       reason:"La IA detectó una persona y un vehículo próximos en la misma escena. Verificar segregación, trayectoria y distancia real.",
       confidence:.78,box:p.bbox,severity:"Alto"
     });
   }));
 }

 // 2) Trabajo en altura: V2.1 SOLO en contexto explícito Obra/altura.
 if(context==="obra"){
   for(const p of persons){
     const s=elevatedScore(p.bbox,W,H);
     const threshold=sensitivity==="strict" ? .72 : .64;
     if(s>=threshold){
       candidates.push({
         key:"height",ruleId:"height",
         title:"⚠️ Posible trabajo en altura",
         reason:"En modo Obra/altura, la geometría de la persona sugiere una posición elevada respecto del plano inferior visible. La IA no puede medir metros: confirmar diferencia de nivel y protecciones.",
         confidence:Math.min(.91,s),box:p.bbox,severity:"Alto"
       });
       const hp=helmetPolicy==="required"||(helmetPolicy==="auto");
       if(hp){
         const hr=await classifyHead(p);
         if(hr&&!hr.helmet) candidates.push({
           key:"helmet-height",ruleId:"helmet",
           title:"⚠️ Casco no identificado en contexto de obra",
           reason:"La IA no identificó un casco en la región de cabeza. Esta detección es experimental; confirmar visualmente antes de registrar.",
           confidence:.60,box:p.bbox,severity:"Alto"
         });
       }
     }
   }
 }

 // 3) Riesgo eléctrico: nunca dispara altura. Usa clasificación contextual.
 if(context==="electrico" && scene.electrical){
   const p=persons[0];
   candidates.push({
     key:"electric-scene",ruleId:"electric",
     title:"⚠️ Posible elemento / instalación eléctrica",
     reason:"El clasificador visual encontró etiquetas compatibles con equipamiento eléctrico. Verificar si existen partes activas accesibles, tablero abierto, falta de protección, señalización o bloqueo. La presencia de un elemento eléctrico por sí sola NO implica incumplimiento.",
     confidence:Math.max(.58, scene.items.find(x=>/switch|electric|electrical|plug|socket|power|meter|oscilloscope|fuse|circuit/.test(x.name))?.p||.58),
     box:p?.bbox||null,severity:"Alto"
   });
 }

 // 4) Taller: si reconoce herramienta motorizada, propone revisión, no ausencia automática de EPP.
 if(context==="taller" && scene.tool){
   const p=persons[0];
   candidates.push({
     key:"tool-scene",ruleId:"machine",
     title:"⚠️ Herramienta motorizada detectada: revisar protecciones",
     reason:"La IA identificó una etiqueta compatible con herramienta motorizada. Verificar resguardo, estado, método de uso y EPP requerido; no se presume incumplimiento automáticamente.",
     confidence:.60,box:p?.bbox||null,severity:"Alto"
   });
 }

 if(!candidates.length) return null;
 candidates.sort((a,b)=>b.confidence-a.confidence);
 return candidates[0];
}
function showProposal(p){
 if(!p)return;
 const now=Date.now(),key=p.key+":"+Math.round(p.box?.[0]||0)/100;
 if(lastProposalKey===key&&now-lastProposalAt<9000)return;
 currentProposal=p;lastProposalKey=key;lastProposalAt=now;
 $("autoTitle").textContent=p.title;$("autoConfidence").textContent=`conf. experimental ${Math.round(p.confidence*100)}%`;$("autoReason").textContent=p.reason;
 const r=RULES.find(x=>x.id===p.ruleId);$("autoNorm").textContent="Referencia: "+(r?currentNorm(r):"Validar normativa aplicable.");$("autoBox").classList.add("show");
}
async function detectLoop(){
 if(!running)return;
 if(coco&&$("video").readyState>=2){
  try{const preds=await coco.detect($("video"),20,.42);$("detStatus").textContent=`${preds.length} det.`;const proposal=await inferRisk(preds);draw(preds,proposal);if(proposal)showProposal(proposal)}catch(e){}
 }
 setTimeout(()=>requestAnimationFrame(detectLoop),420);
}
$("dismissAuto").onclick=()=>{$("autoBox").classList.remove("show");currentProposal=null};
$("confirmAuto").onclick=()=>{
 if(!currentProposal)return;const c=captureFrame();if(c)lastCapture=c.toDataURL("image/jpeg",.78);
 openRule(currentProposal.ruleId,"IA automática",currentProposal.reason+" Alerta generada automáticamente; validada por el inspector.");$("autoBox").classList.remove("show");currentProposal=null;
};

function generateReport(){
 if(!findings.length){alert("No hay hallazgos para informar.");return}
 const hi=findings.filter(f=>f.severity==="Alto").length,med=findings.filter(f=>f.severity==="Medio").length,auto=findings.filter(f=>f.source==="IA automática").length;
 const rows=findings.map((f,i)=>`<article class="finding"><div class="head"><div><small>HALLAZGO ${i+1}</small><h2>${esc(f.title)}</h2><div class="muted">${esc(f.sector||"Sector no indicado")} · ${new Date(f.time).toLocaleString("es-AR")}</div></div><b class="${f.severity==="Alto"?"high":"med"}">${esc(f.severity)}</b></div>${f.image?`<img src="${f.image}">`:""}<table><tr><th>Clasificación</th><td>${esc(f.type)}</td></tr><tr><th>Origen</th><td>${esc(f.source)}</td></tr><tr><th>Observación</th><td>${esc(f.notes||"Sin observación adicional.")}</td></tr><tr><th>Normativa relacionada</th><td>${esc(f.norm)}</td></tr><tr><th>Acción recomendada</th><td>${esc(f.action)}</td></tr></table></article>`).join("");
 const w=window.open("","_blank");if(!w){alert("Permití ventanas emergentes para generar el informe.");return}
 w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Informe SST IA V2.1</title><style>body{margin:0;background:#eef3f7;font-family:Arial;color:#17212b}.bar{position:sticky;top:0;background:#0b1d33;padding:10px;text-align:center}.bar button{padding:11px 18px;border:0;border-radius:9px;font-weight:700}.page{max-width:900px;margin:18px auto;background:#fff;padding:32px}.title{border-bottom:4px solid #1769aa;padding-bottom:14px}.title h1{margin:3px 0;color:#0b1d33}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}.metric{border:1px solid #d9e2ec;border-radius:12px;padding:12px}.metric b{font-size:25px;display:block}.finding{border:1px solid #d9e2ec;border-radius:14px;padding:16px;margin:0 0 16px;break-inside:avoid}.head{display:flex;justify-content:space-between;gap:15px}.head h2{font-size:18px;margin:3px 0;color:#0b1d33}.muted{font-size:11px;color:#607080}.high,.med{border-radius:999px;padding:7px 10px;font-size:11px;height:max-content}.high{background:#fee4e2;color:#b42318}.med{background:#fff1cf;color:#a65d00}img{width:100%;max-height:390px;object-fit:contain;background:#f7f9fb;border-radius:10px;margin:13px 0}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:8px;border-top:1px solid #d9e2ec;text-align:left;vertical-align:top}th{width:190px}.note{font-size:10px;color:#607080;line-height:1.5;border-top:1px solid #d9e2ec;padding-top:10px;margin-top:20px}@media(max-width:650px){.page{margin:0;padding:18px}.summary{grid-template-columns:1fr 1fr}}@media print{.bar{display:none}.page{margin:0;max-width:none;box-shadow:none}}</style></head><body><div class="bar"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div><main class="page"><div class="title"><small>INSPECCIÓN VISUAL ASISTIDA POR IA</small><h1>Informe de Seguridad e Higiene</h1><div>${new Date().toLocaleString("es-AR")} · SST IA V2.1</div></div><div class="summary"><div class="metric"><b>${findings.length}</b><span>Hallazgos</span></div><div class="metric"><b>${hi}</b><span>Altos</span></div><div class="metric"><b>${med}</b><span>Medios</span></div><div class="metric"><b>${auto}</b><span>Desde IA</span></div></div>${rows}<div class="note"><b>Alcance:</b> las alertas de IA son preventivas y experimentales. La confirmación de cumplimiento/incumplimiento requiere evaluación profesional y verificación de condiciones reales, documentación, mediciones y normativa específica aplicable.</div></main></body></html>`);w.document.close();
}

$("startBtn").onclick=startCamera;$("stopBtn").onclick=stopCamera;$("captureBtn").onclick=captureEvidence;$("switchBtn").onclick=async()=>{facing=facing==="environment"?"user":"environment";await startCamera()};
$("cancelModal").onclick=()=>{$("modal").classList.remove("show");delete $("mNotes").dataset.source};$("saveFinding").onclick=saveFinding;$("modal").onclick=e=>{if(e.target===$("modal"))$("modal").classList.remove("show")};
$("reportBtn").onclick=generateReport;$("clearBtn").onclick=()=>{if(confirm("¿Borrar todos los hallazgos?")){findings=[];persist();renderFindings()}};

["contextMode","legalProfile","autoSensitivity"].forEach(id=>{
 const el=$(id); if(el) el.addEventListener("change",()=>{
   $("autoBox").classList.remove("show"); currentProposal=null; lastProposalKey="";
   if(id==="legalProfile") renderRules();
   if(id==="contextMode"){
     const ctx=$("contextMode").value;
     if(ctx==="obra" && $("legalProfile").value==="general"){
       $("status").textContent="Modo Obra/altura seleccionado. Si se trata de industria de la construcción, elegí también “Normativa: Construcción / obra” para aplicar Decreto 911/96.";
     } else if(ctx==="electrico"){
       $("status").textContent="Modo Riesgo eléctrico: la regla automática de trabajo en altura queda desactivada.";
     } else {
       $("status").textContent="V2.1: reglas automáticas limitadas por contexto para reducir falsos positivos.";
     }
   }
 });
});
window.addEventListener("resize",resizeCanvas);renderRules();renderFindings();
