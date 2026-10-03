const $=id=>document.getElementById(id);

const RULES=[
{id:"height",title:"Posible trabajo en altura sin protección contra caídas visible",icon:"🪜",severity:"Alto",type:"Acto inseguro",norm:"Decreto 351/79 y requisitos aplicables según tarea/actividad. Validar condiciones reales de trabajo en altura.",action:"Detener o asegurar la tarea y verificar sistema anticaídas, anclaje, acceso, plataforma, barandas y procedimiento aplicable."},
{id:"helmet",title:"Casco no visible donde sería requerido",icon:"⛑️",severity:"Alto",type:"Acto inseguro",norm:"Ley 19.587 y Decreto 351/79, protección personal según riesgo. Validar obligatoriedad para el sector/tarea.",action:"Verificar evaluación de riesgos y uso de protección de cabeza adecuada."},
{id:"vehicle_person",title:"Interacción persona–vehículo",icon:"🚜",severity:"Alto",type:"Condición insegura",norm:"Ley 19.587 y Decreto 351/79; para autoelevadores verificar además normativa específica aplicable.",action:"Separar circulación peatonal y vehicular; controlar velocidad, visibilidad, señalización y operación segura."},
{id:"eye",title:"Protección ocular no visible",icon:"🥽",severity:"Alto",type:"Acto inseguro",norm:"Ley 19.587 y Decreto 351/79, protección ocular/facial según riesgo.",action:"Verificar riesgo de proyección, radiación o partículas y EPP ocular/facial requerido."},
{id:"electric",title:"Tablero / partes eléctricas accesibles",icon:"⚡",severity:"Alto",type:"Condición insegura",norm:"Ley 19.587 y Decreto 351/79, requisitos de seguridad eléctrica.",action:"Restringir acceso y verificar envolvente, aislamiento, protecciones, señalización y condición segura."},
{id:"fire",title:"Matafuego / acceso de extinción obstruido",icon:"🧯",severity:"Alto",type:"Condición insegura",norm:"Decreto 351/79, protección contra incendios y medios de extinción.",action:"Liberar acceso y verificar ubicación, señalización y condición operativa del equipo."},
{id:"walkway",title:"Obstáculo / cable en circulación",icon:"🚧",severity:"Medio",type:"Condición insegura",norm:"Ley 19.587 y Decreto 351/79, orden, limpieza y circulación segura.",action:"Retirar, proteger o canalizar el obstáculo y mantener libre la zona de paso."},
{id:"machine",title:"Máquina / herramienta sin resguardo visible",icon:"⚙️",severity:"Alto",type:"Condición insegura",norm:"Decreto 351/79, protección de máquinas y herramientas.",action:"No operar hasta verificar resguardos, pantallas, protecciones y dispositivos de seguridad."}
];

let stream=null,coco=null,mobile=null,running=false,facing="environment";
let findings=JSON.parse(localStorage.getItem("sst_v2_findings")||"[]");
let pendingRule=null,lastCapture=null,currentProposal=null,lastProposalKey="",lastProposalAt=0;
let lastHeadCheck=0,lastHelmetResult=null;

function persist(){localStorage.setItem("sst_v2_findings",JSON.stringify(findings))}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function renderRules(){
 $("ruleList").innerHTML=RULES.map(r=>`<div class="rule" data-rule="${r.id}"><div class="ico">${r.icon}</div><div><strong>${r.title}</strong><small>${r.severity} · ${r.norm}</small></div></div>`).join("");
 document.querySelectorAll(".rule").forEach(e=>e.onclick=()=>openRule(e.dataset.rule,"manual/guiado"));
}
function openRule(id,source="manual/guiado",notes=""){
 pendingRule=RULES.find(r=>r.id===id);if(!pendingRule)return;
 $("mTitle").textContent=pendingRule.title;$("mNorm").textContent="Referencia orientativa: "+pendingRule.norm;
 $("mType").value=pendingRule.type;$("mNotes").value=notes;$("mAction").value=pendingRule.action;
 $("modal").classList.add("show");
 if(source==="IA automática") $("mNotes").dataset.source="IA automática"; else delete $("mNotes").dataset.source;
}
function saveFinding(){
 if(!pendingRule)return;
 const source=$("mNotes").dataset.source||"manual/guiado";
 findings.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),ruleId:pendingRule.id,title:pendingRule.title,severity:pendingRule.severity,type:$("mType").value,norm:pendingRule.norm,sector:$("mSector").value.trim(),notes:$("mNotes").value.trim(),action:$("mAction").value.trim(),time:new Date().toISOString(),source,image:lastCapture});
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
 const [x,y,w,h]=box, bottom=(y+h)/H, relH=h/H, centerY=(y+h/2)/H;
 // Experimental geometry: person reasonably large but feet/end of bbox remain well above lower frame.
 let score=0;if(relH>.22)score+=.25;if(bottom<.83)score+=.35;if(centerY<.62)score+=.20;if(bottom<.72)score+=.15;return Math.min(.95,score);
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
async function inferRisk(preds){
 const persons=preds.filter(p=>p.class==="person"&&p.score>.55);
 const vehicles=preds.filter(p=>["car","truck","bus","motorcycle"].includes(p.class)&&p.score>.45);
 const W=$("video").videoWidth||1280,H=$("video").videoHeight||720;
 const context=$("contextMode").value,helmetPolicy=$("helmetPolicy").value;
 let candidates=[];
 // Person-vehicle
 persons.forEach(p=>vehicles.forEach(v=>{if(boxNear(p.bbox,v.bbox))candidates.push({key:"vehicle",ruleId:"vehicle_person",title:"⚠️ Posible interacción persona–vehículo",reason:"La IA detectó una persona y un vehículo próximos en la misma escena.",confidence:.78,box:p.bbox,severity:"Alto"})}));
 // Height / fall risk
 for(const p of persons){
   let s=elevatedScore(p.bbox,W,H);if(context==="obra")s+=.12;if(context==="taller")s+=.03;
   if(s>=.64){
     candidates.push({key:"height",ruleId:"height",title:"⚠️ Posible trabajo en altura",reason:"La geometría de la escena sugiere que la persona podría encontrarse elevada respecto del plano inferior visible. Confirmar altura real y protección contra caídas.",confidence:Math.min(.91,s),box:p.bbox,severity:"Alto"});
     const hp=helmetPolicy==="required"||(helmetPolicy==="auto"&&context==="obra");
     if(hp){
       const hr=await classifyHead(p);
       if(hr&&!hr.helmet)candidates.push({key:"helmet-height",ruleId:"helmet",title:"⚠️ Casco no visible en contexto de altura/obra",reason:"La persona fue detectada en una escena compatible con trabajo elevado y el clasificador de la región de cabeza no identificó un casco. Confirmar visualmente.",confidence:.62,box:p.bbox,severity:"Alto"});
     }
   }
 }
 if(!candidates.length)return null;
 candidates.sort((a,b)=>b.confidence-a.confidence);return candidates[0];
}
function showProposal(p){
 if(!p)return;
 const now=Date.now(),key=p.key+":"+Math.round(p.box?.[0]||0)/100;
 if(lastProposalKey===key&&now-lastProposalAt<9000)return;
 currentProposal=p;lastProposalKey=key;lastProposalAt=now;
 $("autoTitle").textContent=p.title;$("autoConfidence").textContent=`conf. experimental ${Math.round(p.confidence*100)}%`;$("autoReason").textContent=p.reason;
 const r=RULES.find(x=>x.id===p.ruleId);$("autoNorm").textContent="Referencia: "+(r?.norm||"Validar normativa aplicable.");$("autoBox").classList.add("show");
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
 w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Informe SST IA V2</title><style>body{margin:0;background:#eef3f7;font-family:Arial;color:#17212b}.bar{position:sticky;top:0;background:#0b1d33;padding:10px;text-align:center}.bar button{padding:11px 18px;border:0;border-radius:9px;font-weight:700}.page{max-width:900px;margin:18px auto;background:#fff;padding:32px}.title{border-bottom:4px solid #1769aa;padding-bottom:14px}.title h1{margin:3px 0;color:#0b1d33}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}.metric{border:1px solid #d9e2ec;border-radius:12px;padding:12px}.metric b{font-size:25px;display:block}.finding{border:1px solid #d9e2ec;border-radius:14px;padding:16px;margin:0 0 16px;break-inside:avoid}.head{display:flex;justify-content:space-between;gap:15px}.head h2{font-size:18px;margin:3px 0;color:#0b1d33}.muted{font-size:11px;color:#607080}.high,.med{border-radius:999px;padding:7px 10px;font-size:11px;height:max-content}.high{background:#fee4e2;color:#b42318}.med{background:#fff1cf;color:#a65d00}img{width:100%;max-height:390px;object-fit:contain;background:#f7f9fb;border-radius:10px;margin:13px 0}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:8px;border-top:1px solid #d9e2ec;text-align:left;vertical-align:top}th{width:190px}.note{font-size:10px;color:#607080;line-height:1.5;border-top:1px solid #d9e2ec;padding-top:10px;margin-top:20px}@media(max-width:650px){.page{margin:0;padding:18px}.summary{grid-template-columns:1fr 1fr}}@media print{.bar{display:none}.page{margin:0;max-width:none;box-shadow:none}}</style></head><body><div class="bar"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div><main class="page"><div class="title"><small>INSPECCIÓN VISUAL ASISTIDA POR IA</small><h1>Informe de Seguridad e Higiene</h1><div>${new Date().toLocaleString("es-AR")} · SST IA V2</div></div><div class="summary"><div class="metric"><b>${findings.length}</b><span>Hallazgos</span></div><div class="metric"><b>${hi}</b><span>Altos</span></div><div class="metric"><b>${med}</b><span>Medios</span></div><div class="metric"><b>${auto}</b><span>Desde IA</span></div></div>${rows}<div class="note"><b>Alcance:</b> las alertas de IA son preventivas y experimentales. La confirmación de cumplimiento/incumplimiento requiere evaluación profesional y verificación de condiciones reales, documentación, mediciones y normativa específica aplicable.</div></main></body></html>`);w.document.close();
}

$("startBtn").onclick=startCamera;$("stopBtn").onclick=stopCamera;$("captureBtn").onclick=captureEvidence;$("switchBtn").onclick=async()=>{facing=facing==="environment"?"user":"environment";await startCamera()};
$("cancelModal").onclick=()=>{$("modal").classList.remove("show");delete $("mNotes").dataset.source};$("saveFinding").onclick=saveFinding;$("modal").onclick=e=>{if(e.target===$("modal"))$("modal").classList.remove("show")};
$("reportBtn").onclick=generateReport;$("clearBtn").onclick=()=>{if(confirm("¿Borrar todos los hallazgos?")){findings=[];persist();renderFindings()}};
window.addEventListener("resize",resizeCanvas);renderRules();renderFindings();
