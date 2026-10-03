const $=id=>document.getElementById(id);

const MODEL_URL="https://huggingface.co/lanseria/yolov8n-hard-hat-detection_web_model/resolve/main/model.json";
const LABELS=["Hardhat","NO-Hardhat"];
const INPUT=640;
const IOU_THRESHOLD=.45;
const MAX_BOXES=20;

let model=null,stream=null,running=false,facing="environment",inferenceBusy=false;
let lastCapture=null,currentAlert=null,pendingSource="",pendingConfidence=null,violationStreak=0,lastAlertAt=0,discarded=Number(localStorage.getItem("sst_v3_discarded")||0);
let findings=JSON.parse(localStorage.getItem("sst_v3_findings")||"[]");

function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function currentNorm(){
  if($("legalProfile").value==="construction"){
    return "Decreto 911/96: requisitos de EPP aplicables a la industria de la construcción, según riesgo y tarea. Validar además el programa/procedimiento y requisitos específicos del puesto.";
  }
  return "Ley 19.587 y Decreto 351/79, Capítulo 19: Equipos y Elementos de Protección Personal, según riesgo y tarea.";
}
function currentAction(){
  return "Interrumpir o corregir la exposición si corresponde y verificar obligatoriedad, provisión, adecuación y uso efectivo del casco de seguridad para la tarea y el sector.";
}
function persist(){
  localStorage.setItem("sst_v3_findings",JSON.stringify(findings));
  localStorage.setItem("sst_v3_discarded",String(discarded));
}
function renderFindings(){
  $("totalCount").textContent=findings.length;
  $("autoCount").textContent=findings.filter(f=>f.source==="IA especializada").length;
  $("discardCount").textContent=discarded;
  $("findings").innerHTML=findings.length?findings.map(f=>`
    <div class="finding">
      <div class="finding-top"><div><h3>${esc(f.title)}</h3><p>${esc(f.sector||"Sector no indicado")} · ${new Date(f.time).toLocaleString("es-AR")}</p></div><span class="tag">ALTO</span></div>
      <p><b>${esc(f.type)}</b> · ${esc(f.source)} ${f.confidence!=null?` · confianza ${Math.round(f.confidence*100)}%`:""}</p>
      <p>${esc(f.notes||"Sin observación adicional.")}</p>
      <p><b>Normativa relacionada:</b> ${esc(f.norm)}</p>
      <p><b>Acción:</b> ${esc(f.action)}</p>
      ${f.image?`<img class="thumb" src="${f.image}" alt="Evidencia">`:""}
    </div>`).join(""):`<div class="status">Todavía no hay hallazgos registrados.</div>`;
}

async function loadModel(){
  if(model)return true;
  try{
    $("modelStatus").textContent="Modelo EPP: descargando…";
    $("modelInfo").className="status";
    $("modelInfo").textContent="Descargando modelo especializado de casco (~12 MB)…";
    await tf.ready();
    try{await tf.setBackend("webgl")}catch(e){}
    model=await tf.loadGraphModel(MODEL_URL);
    // warm-up
    const warm=tf.zeros([1,INPUT,INPUT,3]);
    const out=await model.executeAsync(warm);
    tf.dispose(out);warm.dispose();
    $("modelStatus").textContent="Modelo EPP: activo";
    $("modelInfo").className="status good";
    $("modelInfo").textContent="Modelo especializado cargado. Detecta explícitamente Hardhat y NO-Hardhat.";
    return true;
  }catch(e){
    console.error(e);
    $("modelStatus").textContent="Modelo EPP: error";
    $("modelInfo").className="status warn";
    $("modelInfo").textContent="No se pudo descargar/cargar el modelo especializado. Verificá conexión a internet y recargá la página. Detalle: "+e.message;
    return false;
  }
}

async function startCamera(){
  try{
    stopCamera();
    const ok=await loadModel();
    if(!ok)return;
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720}},audio:false});
    $("video").srcObject=stream;await $("video").play();
    $("placeholder").style.display="none";$("onlinePill").textContent="● cámara activa";$("onlinePill").classList.add("on");
    $("startBtn").disabled=true;$("stopBtn").disabled=false;$("captureBtn").disabled=false;$("switchBtn").disabled=false;
    running=true;resizeCanvas();detectLoop();
  }catch(e){
    $("modelInfo").className="status warn";
    $("modelInfo").textContent="No se pudo iniciar cámara: "+e.message;
  }
}
function stopCamera(){
  running=false;inferenceBusy=false;
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
  $("video").srcObject=null;$("placeholder").style.display="grid";$("onlinePill").textContent="● cámara inactiva";$("onlinePill").classList.remove("on");
  $("startBtn").disabled=false;$("stopBtn").disabled=true;$("captureBtn").disabled=true;$("switchBtn").disabled=true;
  const c=$("overlay");c.getContext("2d").clearRect(0,0,c.width,c.height);
}
function resizeCanvas(){
  const v=$("video"),c=$("overlay");
  if(v.videoWidth&&v.videoHeight){c.width=v.videoWidth;c.height=v.videoHeight}
}
function captureFrame(){
  const v=$("video");if(!v.videoWidth)return null;
  const c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0,c.width,c.height);return c;
}
function captureEvidence(){
  const c=captureFrame();if(!c)return;
  lastCapture=c.toDataURL("image/jpeg",.8);
  currentAlert=null;
  pendingSource="Registro manual con evidencia";
  pendingConfidence=null;
  $("mTitle").textContent="Registrar evidencia / hallazgo";
  $("mNorm").textContent="La IA no confirmó un hallazgo automático. Describí lo observado para incorporarlo al informe.";
  $("mFindingTitle").value="";
  $("mSector").value="";
  $("mType").value="Condición insegura";
  $("mNotes").value="";
  $("mNormInput").value="Normativa a validar según la condición observada y la actividad.";
  $("mAction").value="Verificar la condición observada, evaluar el riesgo y definir la medida correctiva correspondiente.";
  $("modal").classList.add("show");
  $("modelInfo").className="status good";
  $("modelInfo").textContent="Evidencia capturada. Completá el hallazgo y guardalo para incluirlo en el informe.";
}

function preprocess(video){
  return tf.tidy(()=>{
    const img=tf.browser.fromPixels(video);
    const [h,w]=img.shape.slice(0,2);
    const scale=Math.min(INPUT/w,INPUT/h);
    const nw=Math.round(w*scale),nh=Math.round(h*scale);
    const resized=tf.image.resizeBilinear(img,[nh,nw]);
    const padX=INPUT-nw,padY=INPUT-nh;
    const left=Math.floor(padX/2),right=padX-left,top=Math.floor(padY/2),bottom=padY-top;
    const padded=tf.pad(resized,[[top,bottom],[left,right],[0,0]],114);
    const tensor=padded.toFloat().div(255).expandDims(0);
    return {tensor,meta:{w,h,scale,left,top}};
  });
}

function getOutputTensor(raw){
  if(raw instanceof tf.Tensor)return raw;
  if(Array.isArray(raw)){
    return raw.find(t=>t instanceof tf.Tensor && t.rank===3) || raw[0];
  }
  if(raw&&typeof raw==="object"){
    const vals=Object.values(raw);
    return vals.find(t=>t instanceof tf.Tensor && t.rank===3) || vals[0];
  }
  throw new Error("Salida del modelo no reconocida");
}

async function postprocess(output,meta,scoreThreshold){
  let trans=null,boxes=null,scores=null,classes=null,nms=null;
  try{
    // YOLOv8 typically exports [1, 4+classes, 8400].
    if(output.shape.length!==3)throw new Error("Shape inesperado: "+output.shape.join("x"));
    if(output.shape[1]===4+LABELS.length){
      trans=output.transpose([0,2,1]);
    }else if(output.shape[2]===4+LABELS.length){
      trans=output;
    }else{
      throw new Error("La salida no coincide con 2 clases: "+output.shape.join("x"));
    }

    boxes=tf.tidy(()=>{
      const w=trans.slice([0,0,2],[-1,-1,1]);
      const h=trans.slice([0,0,3],[-1,-1,1]);
      const x1=tf.sub(trans.slice([0,0,0],[-1,-1,1]),tf.div(w,2));
      const y1=tf.sub(trans.slice([0,0,1],[-1,-1,1]),tf.div(h,2));
      return tf.concat([y1,x1,tf.add(y1,h),tf.add(x1,w)],2).squeeze();
    });
    [scores,classes]=tf.tidy(()=>{
      const rawScores=trans.slice([0,0,4],[-1,-1,LABELS.length]).squeeze(0);
      return [rawScores.max(1),rawScores.argMax(1)];
    });
    nms=await tf.image.nonMaxSuppressionAsync(boxes,scores,MAX_BOXES,IOU_THRESHOLD,scoreThreshold);
    const b=await boxes.gather(nms,0).array();
    const s=Array.from(await scores.gather(nms,0).data());
    const cl=Array.from(await classes.gather(nms,0).data());

    const dets=[];
    for(let i=0;i<s.length;i++){
      let [y1,x1,y2,x2]=b[i];
      // map letterboxed 640x640 coordinates back to original video
      x1=(x1-meta.left)/meta.scale;x2=(x2-meta.left)/meta.scale;
      y1=(y1-meta.top)/meta.scale;y2=(y2-meta.top)/meta.scale;
      x1=Math.max(0,Math.min(meta.w,x1));x2=Math.max(0,Math.min(meta.w,x2));
      y1=Math.max(0,Math.min(meta.h,y1));y2=Math.max(0,Math.min(meta.h,y2));
      if(x2<=x1||y2<=y1)continue;
      dets.push({class:LABELS[cl[i]],score:s[i],bbox:[x1,y1,x2-x1,y2-y1]});
    }
    return dets;
  }finally{
    if(trans && trans!==output)trans.dispose();
    [boxes,scores,classes,nms].forEach(t=>{try{t&&t.dispose()}catch(e){}});
  }
}

async function infer(){
  const v=$("video");if(!model||v.readyState<2)return [];
  const {tensor,meta}=preprocess(v);
  let raw=null,out=null;
  try{
    raw=await model.executeAsync(tensor);
    out=getOutputTensor(raw);
    const threshold=Number($("threshold").value)/100;
    return await postprocess(out,meta,threshold);
  }finally{
    tensor.dispose();
    if(Array.isArray(raw)){raw.forEach(t=>{try{t.dispose()}catch(e){}})}
    else if(raw&&typeof raw==="object" && !(raw instanceof tf.Tensor)){Object.values(raw).forEach(t=>{try{t.dispose()}catch(e){}})}
    else if(raw instanceof tf.Tensor){try{raw.dispose()}catch(e){}}
  }
}

function draw(dets){
  const c=$("overlay"),ctx=c.getContext("2d"),v=$("video");
  if(v.videoWidth&&c.width!==v.videoWidth)resizeCanvas();
  ctx.clearRect(0,0,c.width,c.height);
  const font=Math.max(16,Math.round(c.width/35));ctx.font=`${font}px system-ui`;ctx.lineWidth=Math.max(3,c.width/180);
  dets.forEach(d=>{
    const [x,y,w,h]=d.bbox;
    const bad=d.class==="NO-Hardhat";
    const color=bad?"#ef4444":"#22c55e";
    const label=(bad?"SIN CASCO":"CASCO")+" "+Math.round(d.score*100)+"%";
    ctx.strokeStyle=color;ctx.strokeRect(x,y,w,h);
    const tw=ctx.measureText(label).width+14;
    const th=font+10;ctx.fillStyle=color;ctx.fillRect(x,Math.max(0,y-th),tw,th);
    ctx.fillStyle="#fff";ctx.fillText(label,x+7,Math.max(font,y-7));
  });
}

function evaluateAlerts(dets){
  const bad=dets.filter(d=>d.class==="NO-Hardhat");
  const best=bad.sort((a,b)=>b.score-a.score)[0];
  if(best && $("helmetPolicy").value==="required"){
    violationStreak++;
  }else{
    violationStreak=Math.max(0,violationStreak-1);
  }
  const needed=Number($("persistence").value);
  if(best && violationStreak>=needed && Date.now()-lastAlertAt>10000 && !$("alertBox").classList.contains("show")){
    lastAlertAt=Date.now();violationStreak=0;currentAlert=best;
    $("alertConf").textContent=Math.round(best.score*100)+"%";
    $("alertText").textContent=`El modelo especializado identificó explícitamente la clase NO-Hardhat durante ${needed} lecturas. No se infiere por ausencia de casco.`;
    $("alertNorm").textContent="Referencia normativa: "+currentNorm();
    $("alertBox").classList.add("show");
  }
}

async function detectLoop(){
  if(!running)return;
  if(!inferenceBusy){
    inferenceBusy=true;
    try{
      const dets=await infer();
      $("detStatus").textContent=`${dets.length} det.`;
      draw(dets);evaluateAlerts(dets);
    }catch(e){
      console.error(e);
      $("modelInfo").className="status warn";
      $("modelInfo").textContent="Error durante inferencia: "+e.message;
      running=false;
    }finally{inferenceBusy=false}
  }
  if(running)setTimeout(()=>requestAnimationFrame(detectLoop),550);
}

function openConfirmedAlert(){
  if(!currentAlert)return;
  const c=captureFrame();if(c)lastCapture=c.toDataURL("image/jpeg",.8);
  pendingSource="IA especializada";
  pendingConfidence=currentAlert.score;
  $("mTitle").textContent="Falta de casco detectada";
  $("mNorm").textContent="Referencia orientativa: "+currentNorm();
  $("mFindingTitle").value="Falta de casco de seguridad";
  $("mNotes").value=`Detección automática NO-Hardhat con ${Math.round(currentAlert.score*100)}% de confianza, persistente en múltiples lecturas. Validada por el inspector.`;
  $("mNormInput").value=currentNorm();
  $("mAction").value=currentAction();
  $("modal").classList.add("show");
  $("alertBox").classList.remove("show");
}
function saveFinding(){
  const title=$("mFindingTitle").value.trim();
  if(!title){alert("Indicá el hallazgo o una descripción breve.");return;}
  const source=pendingSource||"Registro manual con evidencia";
  const confidence=pendingConfidence;
  findings.unshift({
    id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),
    title,
    severity:"Alto",type:$("mType").value,source,
    confidence,sector:$("mSector").value.trim(),
    notes:$("mNotes").value.trim(),
    norm:$("mNormInput").value.trim()||"Normativa a validar.",
    action:$("mAction").value.trim(),
    time:new Date().toISOString(),image:lastCapture
  });
  persist();renderFindings();$("modal").classList.remove("show");
  currentAlert=null;pendingSource="";pendingConfidence=null;lastCapture=null;
  $("modelInfo").className="status good";$("modelInfo").textContent="Hallazgo guardado. Ya está disponible para el informe.";
}

function generateReport(){
  if(!findings.length){alert("No hay hallazgos registrados.");return}
  const rows=findings.map((f,i)=>`<article class="finding"><div class="fh"><div><small>HALLAZGO ${i+1}</small><h2>${esc(f.title)}</h2><div class="muted">${esc(f.sector||"Sector no indicado")} · ${new Date(f.time).toLocaleString("es-AR")}</div></div><b>ALTO</b></div>${f.image?`<img src="${f.image}">`:""}<table><tr><th>Clasificación</th><td>${esc(f.type)}</td></tr><tr><th>Origen</th><td>${esc(f.source)}</td></tr>${f.confidence!=null?`<tr><th>Confianza IA</th><td>${Math.round(f.confidence*100)}%</td></tr>`:""}<tr><th>Observación</th><td>${esc(f.notes)}</td></tr><tr><th>Normativa relacionada</th><td>${esc(f.norm)}</td></tr><tr><th>Acción recomendada</th><td>${esc(f.action)}</td></tr></table></article>`).join("");
  const w=window.open("","_blank");if(!w){alert("Permití ventanas emergentes para generar el informe.");return}
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Informe SST IA V3.1</title><style>body{margin:0;background:#eef3f7;font-family:Arial;color:#17212b}.bar{position:sticky;top:0;background:#0b1d33;padding:10px;text-align:center}.bar button{padding:11px 18px;border:0;border-radius:9px;font-weight:700}.page{max-width:900px;margin:18px auto;background:#fff;padding:32px}.head{border-bottom:4px solid #1769aa;padding-bottom:14px}.head h1{margin:3px 0;color:#0b1d33}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.metric{border:1px solid #d9e2ec;border-radius:12px;padding:12px}.metric strong{font-size:25px;display:block}.finding{border:1px solid #d9e2ec;border-radius:14px;padding:16px;margin:0 0 16px;break-inside:avoid}.fh{display:flex;justify-content:space-between;gap:15px}.fh h2{font-size:18px;margin:3px 0;color:#0b1d33}.fh b{background:#fee4e2;color:#b42318;padding:7px 10px;border-radius:999px;height:max-content;font-size:11px}.muted{font-size:11px;color:#607080}img{width:100%;max-height:390px;object-fit:contain;background:#f7f9fb;border-radius:10px;margin:13px 0}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:8px;border-top:1px solid #d9e2ec;text-align:left;vertical-align:top}th{width:190px}.note{font-size:10px;color:#607080;line-height:1.5;border-top:1px solid #d9e2ec;padding-top:10px;margin-top:20px}@media(max-width:650px){.page{margin:0;padding:18px}.summary{grid-template-columns:1fr}}@media print{.bar{display:none}.page{margin:0;max-width:none}}</style></head><body><div class="bar"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div><main class="page"><div class="head"><small>INSPECCIÓN VISUAL ASISTIDA POR IA — MÓDULO EPP</small><h1>Informe de Seguridad e Higiene</h1><div>${new Date().toLocaleString("es-AR")} · SST IA V3.1</div></div><div class="summary"><div class="metric"><strong>${findings.length}</strong><span>Hallazgos</span></div><div class="metric"><strong>${findings.filter(f=>f.source==="IA especializada").length}</strong><span>Desde IA especializada</span></div><div class="metric"><strong>${discarded}</strong><span>Alertas descartadas</span></div></div>${rows}<div class="note"><b>Alcance:</b> la detección de NO-Hardhat es una asistencia visual y no sustituye la evaluación profesional. El inspector debe validar la obligación del EPP, la tarea, el sector, el riesgo real y la normativa aplicable.</div></main></body></html>`);
  w.document.close();
}

$("threshold").oninput=()=>{
  const v=Number($("threshold").value);$("thresholdValue").textContent=v+"%";
  if(v>=70){$("modelInfo").className="status warn";$("modelInfo").textContent="Confianza muy alta: podés perder cascos pequeños o lejanos. Para pruebas usá 40–50%.";}
};
$("startBtn").onclick=startCamera;$("stopBtn").onclick=stopCamera;$("captureBtn").onclick=captureEvidence;
$("switchBtn").onclick=async()=>{facing=facing==="environment"?"user":"environment";await startCamera()};
$("dismissAlert").onclick=()=>{discarded++;persist();renderFindings();$("alertBox").classList.remove("show");currentAlert=null};
$("confirmAlert").onclick=openConfirmedAlert;
$("cancelModal").onclick=()=>{$("modal").classList.remove("show");currentAlert=null;pendingSource="";pendingConfidence=null};
$("saveFinding").onclick=saveFinding;
$("modal").onclick=e=>{if(e.target===$("modal"))$("modal").classList.remove("show")};
$("reportBtn").onclick=generateReport;
$("clearBtn").onclick=()=>{if(confirm("¿Borrar todos los hallazgos de esta inspección?")){findings=[];discarded=0;persist();renderFindings()}};
window.addEventListener("resize",resizeCanvas);
renderFindings();
