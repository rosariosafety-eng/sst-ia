const $=id=>document.getElementById(id);
const MODEL_URL='https://huggingface.co/ayushgupta7777/safetyvision-yolov8/resolve/main/v2/best_640.onnx';
const LABELS=['Fall-Detected','Gloves','Goggles','Hardhat','Mask','NO-Gloves','NO-Goggles','NO-Hardhat','NO-Mask','NO-Safety Vest','No_Harness','Person','Safety Vest'];
const INPUT=640,IOU=.45,MAX=40;
const LABEL_ES={
  'Fall-Detected':'CAÍDA DETECTADA',
  'Gloves':'GUANTES',
  'Goggles':'ANTIPARRAS',
  'Hardhat':'CASCO',
  'Mask':'PROTECCIÓN RESPIRATORIA',
  'NO-Gloves':'SIN GUANTES',
  'NO-Goggles':'SIN ANTIPARRAS',
  'NO-Hardhat':'SIN CASCO',
  'NO-Mask':'SIN PROTECCIÓN RESPIRATORIA',
  'NO-Safety Vest':'SIN CHALECO',
  'No_Harness':'SIN ARNÉS',
  'Person':'PERSONA',
  'Safety Vest':'CHALECO'
};
const SENSITIVITY={
  max:{score:.25,streak:1,cooldown:4500,delay:420,tiles:true},
  high:{score:.32,streak:1,cooldown:6500,delay:550,tiles:true},
  balanced:{score:.42,streak:2,cooldown:12000,delay:850,tiles:false}
};
function sensitivityCfg(){return SENSITIVITY[$('sensitivityMode')?.value||'max']||SENSITIVITY.max}
let tileIndex=0;
const VIOLATIONS={
  'Fall-Detected':{title:'Caída / evento de caída detectado',category:'Caídas',type:'Evento / casi accidente',ppe:null,severity:'Crítico'},
  'NO-Hardhat':{title:'Persona sin casco detectada',category:'EPP',type:'Acto inseguro',ppe:'reqHardhat',severity:'Alto'},
  'NO-Goggles':{title:'Protección ocular no detectada',category:'EPP',type:'Acto inseguro',ppe:'reqGoggles',severity:'Alto'},
  'NO-Gloves':{title:'Guantes no detectados',category:'EPP',type:'Acto inseguro',ppe:'reqGloves',severity:'Medio'},
  'NO-Safety Vest':{title:'Chaleco de alta visibilidad no detectado',category:'EPP',type:'Acto inseguro',ppe:'reqVest',severity:'Medio'},
  'No_Harness':{title:'Arnés / protección contra caídas no detectado',category:'Caídas',type:'Acto inseguro',ppe:'reqHarness',severity:'Alto'},
  'NO-Mask':{title:'Protección respiratoria no detectada',category:'EPP',type:'Acto inseguro',ppe:'reqMask',severity:'Alto'}
};
const RISKS=[
{id:'slip',icon:'🚧',category:'Caídas',title:'Caída al mismo nivel',type:'Condición insegura',auto:false,profiles:['general','maintenance','logistics','construction'],signals:'Obstáculos, cables, derrames, desniveles, herramientas en circulación.',general:'Decreto 351/79, art. 42; art. 110 respecto de herramientas en pasillos o zonas elevadas.',construction:'Decreto 911/96: condiciones de lugares de trabajo y señalización aplicables a circulación segura.',action:'Eliminar o aislar el obstáculo, limpiar y señalizar derrames y mantener vías de circulación libres.'},
{id:'height',icon:'🪜',category:'Caídas',title:'Caída a distinto nivel / altura',type:'Condición insegura',auto:true,profiles:['construction','maintenance','general'],signals:'Bordes, plataformas, escaleras, huecos, falta de protección colectiva, falta de arnés cuando corresponda.',general:'Decreto 351/79, art. 200 y requisitos aplicables a trabajo con peligro de caída.',construction:'Decreto 911/96, arts. 52, 54, 55, 56, 57 y 112.',action:'Priorizar protección colectiva; verificar barandas, plataformas, acceso, anclaje y sistema personal anticaídas cuando corresponda.'},
{id:'ppe',icon:'⛑️',category:'EPP',title:'EPP faltante o inadecuado',type:'Acto inseguro',auto:true,profiles:['general','construction','maintenance','logistics','electrical','chemicals','confined'],signals:'Casco, antiparras, guantes, chaleco, arnés o respiratoria según riesgo.',general:'Ley 19.587; Decreto 351/79, Capítulo 19. Resolución SRT 299/2011 para constancia de entrega.',construction:'Decreto 911/96, arts. 98 a 114; art. 107 casco, 108 protección ocular y 110 miembros superiores.',action:'Verificar el riesgo del puesto y el EPP definido por Higiene y Seguridad; corregir uso, provisión o selección.'},
{id:'electric',icon:'⚡',category:'Electricidad',title:'Riesgo eléctrico',type:'Condición insegura',auto:false,profiles:['general','construction','maintenance','electrical'],signals:'Tableros abiertos, partes activas accesibles, conductores dañados, empalmes, humedad, intervención sin bloqueo.',general:'Decreto 351/79, arts. 95 a 102 y Anexo VI.',construction:'Decreto 911/96, arts. 74 a 87; art. 64 para trabajos próximos a líneas de servicios.',action:'Restringir acceso y verificar desenergización, bloqueo/consignación, aislamiento, protecciones, puesta a tierra y personal autorizado.'},
{id:'machine',icon:'⚙️',category:'Máquinas',title:'Máquina / herramienta insegura',type:'Condición insegura',auto:false,profiles:['general','maintenance','construction'],signals:'Resguardo ausente, partes móviles expuestas, proyecciones, herramienta dañada, accionamiento imprevisto.',general:'Decreto 351/79, arts. 103 a 113.',construction:'Decreto 911/96, requisitos aplicables a máquinas, equipos y herramientas de obra.',action:'Detener el uso cuando exista riesgo; verificar resguardos, dispositivos, estado, bloqueo y método seguro.'},
{id:'vehicle',icon:'🚜',category:'Tránsito interno',title:'Interacción persona–vehículo / autoelevador',type:'Condición insegura',auto:false,profiles:['logistics','construction','general'],signals:'Peatón y equipo móvil sin segregación, maniobra ciega, velocidad, carga elevada, falta de señalero.',general:'Resolución SRT 960/2015 para operación de autoelevadores; Ley 19.587 y Decreto 351/79 según situación.',construction:'Decreto 911/96, arts. 61, 70 y 71 cuando corresponda; Resolución SRT 960/2015 para autoelevadores.',action:'Segregar peatones y equipos, definir recorridos, velocidad y señalización; controlar maniobras y competencia del operador.'},
{id:'storage',icon:'📦',category:'Almacenamiento',title:'Acopio / caída de objetos',type:'Condición insegura',auto:false,profiles:['logistics','construction','general','maintenance'],signals:'Estiba inestable, materiales al borde, objetos sobre personas, carga suspendida, retiro que desestabiliza.',general:'Decreto 351/79, art. 42; arts. 114 y 115 para izaje; requisitos específicos según material.',construction:'Decreto 911/96, art. 45 para almacenamiento de materiales.',action:'Asegurar estabilidad, mantener circulaciones y evitar cargas sobre personas; revisar método de estiba y retiro.'},
{id:'fire',icon:'🧯',category:'Incendio',title:'Incendio / evacuación',type:'Condición insegura',auto:false,profiles:['general','construction','maintenance','logistics','chemicals'],signals:'Matafuego obstruido, salida bloqueada, combustible junto a ignición, acumulación de residuos.',general:'Decreto 351/79, arts. 160 a 187 y Anexo VII; art. 176 para matafuegos.',construction:'Decreto 911/96, arts. 88 a 93 y disposiciones específicas sobre inflamables.',action:'Liberar medios de escape y extinción, separar fuentes de ignición y combustibles, verificar señalización y medios contra incendio.'},
{id:'chemical',icon:'🧪',category:'Químicos',title:'Sustancias peligrosas / derrame',type:'Condición insegura',auto:false,profiles:['chemicals','maintenance','general'],signals:'Envase sin rótulo, derrame, recipiente abierto, almacenamiento incompatible, exposición sin control.',general:'Decreto 351/79, arts. 145 a 148 y demás requisitos según sustancia.',construction:'Decreto 911/96 y normativa específica aplicable a la sustancia o proceso.',action:'Aislar o contener según procedimiento, identificar producto, revisar FDS/SGA, ventilación, almacenamiento y EPP requerido.'},
{id:'ergo',icon:'🏋️',category:'Ergonomía',title:'Manipulación manual / postura riesgosa',type:'Acto inseguro',auto:false,profiles:['general','maintenance','logistics','construction'],signals:'Flexión o torsión marcada, carga alejada, elevación sobre hombros, agarre deficiente, alta repetición.',general:'Resolución MTEySS 295/2003, Anexo I: Ergonomía y Levantamiento Manual de Cargas.',construction:'Resolución MTEySS 295/2003, Anexo I, cuando resulte aplicable.',action:'Evaluar peso, frecuencia, duración, altura, alcance y postura; rediseñar tarea o utilizar ayuda mecánica.'},
{id:'confined',icon:'🕳️',category:'Espacio confinado',title:'Ingreso / trabajo en espacio confinado',type:'Acto inseguro',auto:false,profiles:['confined','maintenance'],signals:'Ingreso sin aislamiento, medición atmosférica, ventilación, vigía, rescate o EPP adecuados.',general:'Resolución SRT 953/2010 y Norma IRAM 3625/2003 como criterio de seguridad.',construction:'Resolución SRT 953/2010 y Norma IRAM 3625/2003, además de normativa de obra aplicable.',action:'No ingresar sin permiso o programa, aislamiento, evaluación atmosférica, ventilación, comunicación, vigía y plan de rescate.'}
];
let session=null,stream=null,running=false,facing='environment',busy=false,currentAlert=null,lastCapture=null,pendingRisk=null,manualMode=false;
let streaks={},lastAlertAt={},discarded=Number(localStorage.getItem('sst_v4_discarded')||0),findings=JSON.parse(localStorage.getItem('sst_v4_findings')||'[]');
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function normFor(r){return $('legalProfile').value==='construction'?(r.construction||r.general):(r.general||r.construction)}
function persist(){localStorage.setItem('sst_v4_findings',JSON.stringify(findings));localStorage.setItem('sst_v4_discarded',String(discarded))}
function renderRisks(){const p=$('activityProfile').value,list=RISKS.filter(r=>r.profiles.includes(p)||p==='general');$('riskGrid').innerHTML=list.map(r=>`<div class="risk-card"><div class="risk-head"><div class="risk-name"><div class="risk-icon">${r.icon}</div><div><strong>${r.title}</strong><small>${r.signals}</small></div></div><span class="mode ${r.auto?'auto':'guided'}">${r.auto?'IA + validación':'GUIADA'}</span></div><div class="risk-actions"><button class="mini" data-risk="${r.id}">Registrar hallazgo</button></div></div>`).join('');document.querySelectorAll('[data-risk]').forEach(b=>b.onclick=()=>openRisk(b.dataset.risk,true))}
function renderFindings(){$('totalCount').textContent=findings.length;$('autoCount').textContent=findings.filter(f=>f.source==='IA especializada').length;$('discardCount').textContent=discarded;$('findings').innerHTML=findings.length?findings.map(f=>`<div class="finding"><div class="finding-top"><div><h3>${esc(f.title)}</h3><p>${esc(f.category)} · ${esc(f.sector||'Sector no indicado')} · ${new Date(f.time).toLocaleString('es-AR')}</p></div><span class="tag">${esc(f.severity||'Alto')}</span></div><p><b>${esc(f.type)}</b> · ${esc(f.source)}</p>${f.confidence!=null?`<p>Confianza IA: ${Math.round(f.confidence*100)}%</p>`:''}<p>${esc(f.notes||'Sin observación adicional.')}</p><p><b>Normativa:</b> ${esc(f.norm)}</p><p><b>Acción:</b> ${esc(f.action)}</p>${f.image?`<img class="thumb" src="${f.image}">`:''}</div>`).join(''):'<div class="status">Todavía no hay hallazgos registrados.</div>'}
async function loadModel(){if(session)return true;try{$('modelStatus').textContent='IA SST: descargando…';$('modelInfo').className='status';$('modelInfo').textContent='Descargando SafetyVision v2 (~43 MB). En celular puede tardar en la primera carga.';ort.env.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';ort.env.wasm.numThreads=1;session=await ort.InferenceSession.create(MODEL_URL,{executionProviders:['wasm'],graphOptimizationLevel:'all'});$('modelStatus').textContent='IA SST: activa';$('modelInfo').className='status good';$('modelInfo').textContent='Motor SST cargado: EPP, arnés y detección de caída. El resto de riesgos se inspecciona de forma guiada.';return true}catch(e){console.error(e);$('modelStatus').textContent='IA SST: error';$('modelInfo').className='status warn';$('modelInfo').textContent='No se pudo cargar el modelo SST. Verificá conexión y recargá. '+e.message;return false}}
async function startCamera(){try{stopCamera();if(!await loadModel())return;stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720}},audio:false});$('video').srcObject=stream;await $('video').play();$('placeholder').style.display='none';$('onlinePill').textContent='● cámara activa';$('onlinePill').classList.add('on');$('startBtn').disabled=true;$('stopBtn').disabled=false;$('manualBtn').disabled=false;$('switchBtn').disabled=false;running=true;resizeCanvas();loop()}catch(e){$('modelInfo').className='status warn';$('modelInfo').textContent='No se pudo iniciar la cámara: '+e.message}}
function stopCamera(){running=false;busy=false;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}$('video').srcObject=null;$('placeholder').style.display='grid';$('onlinePill').textContent='● cámara inactiva';$('onlinePill').classList.remove('on');$('startBtn').disabled=false;$('stopBtn').disabled=true;$('manualBtn').disabled=true;$('switchBtn').disabled=true;const c=$('overlay');c.getContext('2d').clearRect(0,0,c.width,c.height)}
function resizeCanvas(){const v=$('video'),c=$('overlay');if(v.videoWidth){c.width=v.videoWidth;c.height=v.videoHeight}}
function captureFrame(){const v=$('video');if(!v.videoWidth)return null;const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0,c.width,c.height);return c}
function preprocess(region=null){
  const v=$('video'),tmp=document.createElement('canvas');tmp.width=INPUT;tmp.height=INPUT;
  const ctx=tmp.getContext('2d');
  const sx=region?.x||0,sy=region?.y||0,sw=region?.w||v.videoWidth,sh=region?.h||v.videoHeight;
  const scale=Math.min(INPUT/sw,INPUT/sh),nw=Math.round(sw*scale),nh=Math.round(sh*scale),dx=(INPUT-nw)/2,dy=(INPUT-nh)/2;
  ctx.fillStyle='rgb(114,114,114)';ctx.fillRect(0,0,INPUT,INPUT);
  ctx.drawImage(v,sx,sy,sw,sh,dx,dy,nw,nh);
  const pix=ctx.getImageData(0,0,INPUT,INPUT).data,arr=new Float32Array(3*INPUT*INPUT),plane=INPUT*INPUT;
  for(let i=0,p=0;i<pix.length;i+=4,p++){arr[p]=pix[i]/255;arr[plane+p]=pix[i+1]/255;arr[2*plane+p]=pix[i+2]/255}
  return{tensor:new ort.Tensor('float32',arr,[1,3,INPUT,INPUT]),meta:{scale,dx,dy,w:v.videoWidth,h:v.videoHeight,sx,sy,sw,sh}}
}
function iou(a,b){const ax2=a.x+a.w,ay2=a.y+a.h,bx2=b.x+b.w,by2=b.y+b.h,ix=Math.max(0,Math.min(ax2,bx2)-Math.max(a.x,b.x)),iy=Math.max(0,Math.min(ay2,by2)-Math.max(a.y,b.y)),inter=ix*iy;return inter/(a.w*a.h+b.w*b.h-inter+1e-6)}
function postprocess(out,meta,scoreThreshold){
  const data=out.data,dims=out.dims;let ch,n;
  if(dims[1]===17){ch=17;n=dims[2]}else if(dims[2]===17){ch=17;n=dims[1]}else throw new Error('Salida ONNX inesperada: '+dims.join('x'));
  const candidates=[];
  for(let i=0;i<n;i++){
    const get=c=>dims[1]===17?data[c*n+i]:data[i*17+c];
    let best=-1,cls=-1;
    for(let c=0;c<LABELS.length;c++){const s=get(4+c);if(s>best){best=s;cls=c}}
    if(best<scoreThreshold)continue;
    const cx=get(0),cy=get(1),w=get(2),h=get(3);
    let x=(cx-w/2-meta.dx)/meta.scale+meta.sx,y=(cy-h/2-meta.dy)/meta.scale+meta.sy,bw=w/meta.scale,bh=h/meta.scale;
    x=Math.max(0,Math.min(meta.w,x));y=Math.max(0,Math.min(meta.h,y));
    bw=Math.max(0,Math.min(meta.w-x,bw));bh=Math.max(0,Math.min(meta.h-y,bh));
    if(bw<2||bh<2)continue;
    candidates.push({class:LABELS[cls],score:best,x,y,w:bw,h:bh})
  }
  candidates.sort((a,b)=>b.score-a.score);
  const keep=[];
  for(const d of candidates){
    if(keep.length>=MAX)break;
    if(!keep.some(k=>k.class===d.class&&iou(k,d)>IOU))keep.push(d)
  }
  return keep
}
function mergeDetections(all){
  const sorted=[...all].sort((a,b)=>b.score-a.score),keep=[];
  for(const d of sorted){
    if(keep.length>=MAX)break;
    if(!keep.some(k=>k.class===d.class&&iou(k,d)>.5))keep.push(d)
  }
  return keep
}
function draw(dets){
  const c=$('overlay'),ctx=c.getContext('2d'),v=$('video');
  if(v.videoWidth&&c.width!==v.videoWidth)resizeCanvas();
  ctx.clearRect(0,0,c.width,c.height);
  ctx.font=`${Math.max(15,Math.round(c.width/38))}px system-ui`;
  ctx.lineWidth=Math.max(3,c.width/210);
  for(const d of dets){
    const bad=!!VIOLATIONS[d.class],good=['Hardhat','Gloves','Goggles','Safety Vest','Mask'].includes(d.class);
    const color=bad?'#ef4444':good?'#22c55e':'#18c7e8';
    const label=(bad?'⚠ ':'')+(LABEL_ES[d.class]||d.class)+' '+Math.round(d.score*100)+'%';
    ctx.strokeStyle=color;ctx.strokeRect(d.x,d.y,d.w,d.h);
    const tw=ctx.measureText(label).width+12,th=parseInt(ctx.font)+10;
    ctx.fillStyle=color;ctx.fillRect(d.x,Math.max(0,d.y-th),tw,th);
    ctx.fillStyle='#fff';ctx.fillText(label,d.x+6,Math.max(parseInt(ctx.font),d.y-7))
  }
}
function violationEnabled(cls){const v=VIOLATIONS[cls];if(!v)return false;if(cls==='Fall-Detected')return true;if(!v.ppe)return true;return $(v.ppe)?.checked===true}
function riskForViolation(cls){if(cls==='Fall-Detected'||cls==='No_Harness')return RISKS.find(r=>r.id==='height');return RISKS.find(r=>r.id==='ppe')}
function evaluate(dets){
  const cfg=sensitivityCfg();
  const active=dets.filter(d=>VIOLATIONS[d.class]&&violationEnabled(d.class)),
        seen=new Set(active.map(d=>d.class));
  Object.keys(VIOLATIONS).forEach(k=>{streaks[k]=seen.has(k)?(streaks[k]||0)+1:Math.max(0,(streaks[k]||0)-1)});
  if($('alertBox').classList.contains('show'))return;
  active.sort((a,b)=>b.score-a.score);
  for(const d of active){
    if((streaks[d.class]||0)<cfg.streak)continue;
    if(Date.now()-(lastAlertAt[d.class]||0)<cfg.cooldown)continue;
    lastAlertAt[d.class]=Date.now();streaks[d.class]=0;
    const meta=VIOLATIONS[d.class],risk=riskForViolation(d.class);
    currentAlert={det:d,meta,risk};
    $('alertTitle').textContent='⚠️ '+meta.title;
    $('alertConf').textContent=Math.round(d.score*100)+'%';
    $('alertText').textContent=d.class==='Fall-Detected'
      ?'El modelo identificó una configuración compatible con caída o evento de caída. Confirmar inmediatamente la situación real.'
      :'La IA detectó '+(LABEL_ES[d.class]||d.class)+' con sensibilidad '+($('sensitivityMode').value==='max'?'máxima':$('sensitivityMode').value==='high'?'alta':'equilibrada')+'. Confirmar antes de registrar.';
    $('alertNorm').textContent='Referencia: '+normFor(risk);
    $('alertBox').classList.add('show');break
  }
}
async function inferRegion(region=null){
  const prep=preprocess(region),feeds={};feeds[session.inputNames[0]]=prep.tensor;
  const outputs=await session.run(feeds),tensor=outputs[session.outputNames[0]];
  return postprocess(tensor,prep.meta,sensitivityCfg().score)
}
async function infer(){
  const v=$('video');
  const full=await inferRegion(null);
  const cfg=sensitivityCfg();
  if(!cfg.tiles || $('detailScan')?.value==='off' || !v.videoWidth)return full;

  // Barrido de detalle: analiza una zona ampliada por ciclo.
  // Esto mejora la sensibilidad para EPP/personas pequeñas sin hacer 5 inferencias en cada frame.
  const W=v.videoWidth,H=v.videoHeight,tw=W*.64,th=H*.64;
  const tiles=[
    {x:0,y:0,w:tw,h:th},
    {x:W-tw,y:0,w:tw,h:th},
    {x:0,y:H-th,w:tw,h:th},
    {x:W-tw,y:H-th,w:tw,h:th}
  ];
  const region=tiles[tileIndex%tiles.length];tileIndex++;
  const detail=await inferRegion(region);
  return mergeDetections(full.concat(detail))
}
async function loop(){
  if(!running)return;
  if(!busy){
    busy=true;
    try{
      const dets=await infer();
      $('detStatus').textContent=dets.length+' det.';
      draw(dets);evaluate(dets)
    }catch(e){
      console.error(e);$('modelInfo').className='status warn';$('modelInfo').textContent='Error de inferencia: '+e.message
    }finally{busy=false}
  }
  if(running)setTimeout(()=>requestAnimationFrame(loop),sensitivityCfg().delay)
}
function openRisk(id,withCapture=false){const r=RISKS.find(x=>x.id===id);if(!r)return;pendingRisk=r;manualMode=true;if(withCapture){const c=captureFrame();if(c)lastCapture=c.toDataURL('image/jpeg',.78)}$('mTitle').textContent='Registrar: '+r.title;$('mCategory').value=r.category;$('mType').value=r.type;$('mFinding').value=r.title;$('mNotes').value='';$('mAction').value=r.action;$('mNormEdit').value=normFor(r);$('mNorm').textContent='Verificación preventiva guiada. La norma se puede editar antes de guardar.';$('modal').classList.add('show')}
function openManual(){const c=captureFrame();if(c)lastCapture=c.toDataURL('image/jpeg',.78);pendingRisk=RISKS[0];manualMode=true;$('mTitle').textContent='Registrar evidencia manual';$('mCategory').value='Otro / definir';$('mType').value='Condición insegura';$('mFinding').value='';$('mNotes').value='';$('mAction').value='Controlar el riesgo identificado siguiendo la jerarquía de controles.';$('mNormEdit').value='Validar normativa específica aplicable.';$('mNorm').textContent='Completá el hallazgo observado. La imagen ya quedó capturada.';$('modal').classList.add('show')}
function openAlert(){if(!currentAlert)return;const c=captureFrame();if(c)lastCapture=c.toDataURL('image/jpeg',.78);const{det,meta,risk}=currentAlert;pendingRisk=risk;manualMode=false;$('mTitle').textContent=meta.title;$('mCategory').value=meta.category;$('mType').value=meta.type;$('mFinding').value=meta.title;$('mNotes').value=`Detección IA: ${LABEL_ES[det.class]||det.class} con ${Math.round(det.score*100)}% de confianza, confirmada por el inspector.`;$('mAction').value=risk.action;$('mNormEdit').value=normFor(risk);$('mNorm').textContent='Alerta automática SST. Confirmá o ajustá antes de guardar.';$('modal').classList.add('show');$('alertBox').classList.remove('show')}
function saveFinding(){const f={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title:$('mFinding').value.trim()||'Hallazgo SST',category:$('mCategory').value,type:$('mType').value,severity:manualMode?'Alto':currentAlert?.meta?.severity||'Alto',source:manualMode?'Inspección guiada/manual':'IA especializada',confidence:manualMode?null:currentAlert?.det?.score??null,sector:$('mSector').value.trim(),notes:$('mNotes').value.trim(),action:$('mAction').value.trim(),norm:$('mNormEdit').value.trim(),time:new Date().toISOString(),image:lastCapture};findings.unshift(f);persist();renderFindings();$('modal').classList.remove('show');currentAlert=null;manualMode=false;lastCapture=null}
function report(){if(!findings.length){alert('No hay hallazgos registrados.');return}const auto=findings.filter(f=>f.source==='IA especializada').length,rows=findings.map((f,i)=>`<article class="finding"><div class="fh"><div><small>HALLAZGO ${i+1}</small><h2>${esc(f.title)}</h2><div class="muted">${esc(f.category)} · ${esc(f.sector||'Sector no indicado')} · ${new Date(f.time).toLocaleString('es-AR')}</div></div><b>${esc(f.severity)}</b></div>${f.image?`<img src="${f.image}">`:''}<table><tr><th>Tipo</th><td>${esc(f.type)}</td></tr><tr><th>Origen</th><td>${esc(f.source)}</td></tr>${f.confidence!=null?`<tr><th>Confianza IA</th><td>${Math.round(f.confidence*100)}%</td></tr>`:''}<tr><th>Observación</th><td>${esc(f.notes)}</td></tr><tr><th>Normativa relacionada</th><td>${esc(f.norm)}</td></tr><tr><th>Acción recomendada</th><td>${esc(f.action)}</td></tr></table></article>`).join('');const w=window.open('','_blank');if(!w){alert('Permití ventanas emergentes.');return}w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Informe SST IA V4.1</title><style>body{margin:0;background:#eef3f7;font-family:Arial;color:#17212b}.bar{position:sticky;top:0;background:#0b1d33;padding:10px;text-align:center}.bar button{padding:11px 18px;border:0;border-radius:9px;font-weight:700}.page{max-width:900px;margin:18px auto;background:#fff;padding:32px}.head{border-bottom:4px solid #1769aa;padding-bottom:14px}.head h1{margin:3px 0;color:#0b1d33}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.metric{border:1px solid #d9e2ec;border-radius:12px;padding:12px}.metric strong{font-size:25px;display:block}.finding{border:1px solid #d9e2ec;border-radius:14px;padding:16px;margin:0 0 16px;break-inside:avoid}.fh{display:flex;justify-content:space-between;gap:15px}.fh h2{font-size:18px;margin:3px 0;color:#0b1d33}.fh b{background:#fee4e2;color:#b42318;padding:7px 10px;border-radius:999px;height:max-content;font-size:11px}.muted{font-size:11px;color:#607080}img{width:100%;max-height:390px;object-fit:contain;background:#f7f9fb;border-radius:10px;margin:13px 0}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:8px;border-top:1px solid #d9e2ec;text-align:left;vertical-align:top}th{width:190px}.note{font-size:10px;color:#607080;line-height:1.5;border-top:1px solid #d9e2ec;padding-top:10px;margin-top:20px}@media(max-width:650px){.page{margin:0;padding:18px}.summary{grid-template-columns:1fr}}@media print{.bar{display:none}.page{margin:0;max-width:none}}</style></head><body><div class="bar"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div><main class="page"><div class="head"><small>INSPECCIÓN PREVENTIVA ASISTIDA POR IA</small><h1>Informe de Seguridad e Higiene</h1><div>${new Date().toLocaleString('es-AR')} · SST IA V4.1</div></div><div class="summary"><div class="metric"><strong>${findings.length}</strong><span>Hallazgos</span></div><div class="metric"><strong>${auto}</strong><span>Desde IA</span></div><div class="metric"><strong>${discarded}</strong><span>Alertas descartadas</span></div></div>${rows}<div class="note"><b>Alcance:</b> herramienta preventiva de apoyo. Las detecciones automáticas y verificaciones guiadas requieren validación profesional y no sustituyen mediciones, documentación, capacitación ni evaluación normativa específica.</div></main></body></html>`);w.document.close()}
function updateSensitivityInfo(){
  const mode=$('sensitivityMode').value,cfg=sensitivityCfg();
  const txt=mode==='max'
    ?`Máxima sensibilidad: umbral ${Math.round(cfg.score*100)}%, alerta con ${cfg.streak} lectura y barrido ampliado. Puede aumentar falsos positivos.`
    :mode==='high'
      ?`Alta sensibilidad: umbral ${Math.round(cfg.score*100)}%, alerta rápida y barrido ampliado.`
      :`Equilibrada: umbral ${Math.round(cfg.score*100)}%, exige ${cfg.streak} lecturas y prioriza menos falsos positivos.`;
  $('sensitivityInfo').textContent=txt;
  streaks={};lastAlertAt={};
}
$('sensitivityMode').onchange=updateSensitivityInfo;
$('detailScan').onchange=()=>{tileIndex=0};
updateSensitivityInfo();
$('activityProfile').onchange=()=>{if($('activityProfile').value==='construction')$('legalProfile').value='construction';renderRisks()};$('legalProfile').onchange=renderRisks;$('startBtn').onclick=startCamera;$('stopBtn').onclick=stopCamera;$('manualBtn').onclick=openManual;$('switchBtn').onclick=async()=>{facing=facing==='environment'?'user':'environment';await startCamera()};$('dismissAlert').onclick=()=>{discarded++;persist();renderFindings();$('alertBox').classList.remove('show');currentAlert=null};$('confirmAlert').onclick=openAlert;$('cancelModal').onclick=()=>{$('modal').classList.remove('show');currentAlert=null;manualMode=false};$('saveFinding').onclick=saveFinding;$('modal').onclick=e=>{if(e.target===$('modal'))$('modal').classList.remove('show')};$('reportBtn').onclick=report;$('clearBtn').onclick=()=>{if(confirm('¿Borrar todos los hallazgos?')){findings=[];discarded=0;persist();renderFindings()}};window.addEventListener('resize',resizeCanvas);renderRisks();renderFindings();
