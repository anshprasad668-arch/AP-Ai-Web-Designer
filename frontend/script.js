const form=document.querySelector("#websiteForm");
const message=document.querySelector("#formMessage");
const color=document.querySelector("#primaryColor");
const progressCount=document.querySelector("#progressCount");
const progressBar=document.querySelector("#progressBar");
function updateProgress(){
 const cards=[...document.querySelectorAll("#websiteForm .card")];
 const done=cards.filter(card=>{
  const controls=[...card.querySelectorAll("input:not([type=file]):not([type=checkbox]),textarea,select")];
  const hasFiles=[...card.querySelectorAll('input[type=file]')].some(x=>x.files&&x.files.length);
  const hasChecks=[...card.querySelectorAll('input[type=checkbox]')].some(x=>x.checked);
  if(card.querySelector("#ownerName")) return ["ownerName","siteName","about"].every(id=>document.getElementById(id).value.trim());
  return controls.some(x=>String(x.value||"").trim())||hasFiles||hasChecks;
 }).length;
 progressCount.textContent=done;
 progressBar.style.width=(done/cards.length*100)+"%";
}
form.addEventListener("input",updateProgress);
form.addEventListener("change",updateProgress);
updateProgress();
color.addEventListener("input",()=>document.querySelector("#colorValue").textContent=color.value.toUpperCase());

function previewOne(inputId,nameId,previewId){
 const input=document.getElementById(inputId),name=document.getElementById(nameId),img=document.getElementById(previewId);
 input.addEventListener("change",()=>{
  const file=input.files[0];
  if(!file){name.textContent="Choose a file";img.style.display="none";return;}
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)){name.textContent="Use PNG, JPG or WEBP.";input.value="";return;}
  if(file.size>8*1024*1024){name.textContent="Image must be under 8 MB.";input.value="";return;}
  name.textContent=file.name;img.src=URL.createObjectURL(file);img.style.display="block";
 });
}
previewOne("logoUpload","logoName","logoPreview");
previewOne("profileUpload","profileName","profilePreview");
previewOne("backgroundUpload","backgroundName","backgroundPreview");

const gallery=document.querySelector("#galleryUpload");
gallery.addEventListener("change",()=>{
 const files=Array.from(gallery.files||[]),wrap=document.querySelector("#galleryPreview");
 if(files.length>12||files.some(f=>f.size>8*1024*1024||!["image/png","image/jpeg","image/webp"].includes(f.type))){
  gallery.value="";document.querySelector("#galleryName").textContent="Choose up to 12 PNG/JPG/WEBP images, each under 8 MB.";wrap.replaceChildren();return;
 }
 wrap.replaceChildren();document.querySelector("#galleryName").textContent=files.length?`${files.length} image(s) selected`:"Choose images";
 files.filter(f=>f.type.startsWith("image/")).forEach(file=>{const img=document.createElement("img");img.alt=file.name;img.src=URL.createObjectURL(file);wrap.appendChild(img);});
});

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PENDING_KEY="ap-generating-project";   // remembers the website being built, even if the page is refreshed
const submitBtn=form.querySelector('button[type="submit"]');
const submitLabel=submitBtn.innerHTML;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const editorUrl=id=>"/editor.html?id="+encodeURIComponent(id);

function setMessage(text,mode){message.className="message"+(mode?" "+mode:"");message.textContent=text;}
function resetButton(){submitBtn.disabled=false;submitBtn.innerHTML=submitLabel;}

// Ask the server every 2 seconds whether the website is ready. Does not depend on one long connection.
async function waitUntilReady(id,startedAt){
 for(;;){
  await sleep(2000);
  let res;
  try{res=await fetch("/api/projects/"+id,{cache:"no-store"});}
  catch(_){continue;}                                   // server busy for a moment: keep trying
  if(res.status===404)throw new Error("This project was deleted before it finished. Please try again.");
  const p=await res.json().catch(()=>null);
  if(!p)continue;
  if(p.status==="error"){fetch("/api/projects/"+id,{method:"DELETE"}).catch(()=>{});throw new Error(p.error||"Generation failed. Please try again.");}
  if(!p.status||p.status==="ready")return p;
  setMessage(`✦ AP AI is designing your website… ${Math.round((Date.now()-startedAt)/1000)}s. The editor will open automatically when it is ready.`,"working");
 }
}

// Website is ready: open the editor in this same tab (new tabs get blocked by pop-up blockers).
function openEditorSoon(id){
 localStorage.removeItem(PENDING_KEY);
 const link=document.createElement("a");link.href=editorUrl(id);link.textContent="Open the editor now";
 message.className="message";message.replaceChildren("✓ Your website is ready! Opening the editor… ",link);
 setTimeout(()=>{location.href=editorUrl(id);},700);
}

async function followProject(id,startedAt){
 submitBtn.disabled=true;submitBtn.innerHTML="Generating… please wait";
 setMessage("✦ AP AI is designing your website. This usually takes 30–90 seconds. The editor will open automatically when it is ready.","working");
 try{
  await waitUntilReady(id,startedAt);
  openEditorSoon(id);
 }catch(e){
  localStorage.removeItem(PENDING_KEY);
  setMessage("⚠ "+e.message);resetButton();loadProjects();
 }
}

form.addEventListener("submit",async event=>{
 event.preventDefault();setMessage("");
 let first=null;
 ["ownerName","siteName","about"].forEach(id=>{const el=document.getElementById(id),bad=!el.value.trim();el.classList.toggle("invalid",bad);if(bad&&!first)first=el;});
 const email=document.querySelector("#email");email.classList.remove("invalid");if(email.value&&!email.checkValidity()){email.classList.add("invalid");first=first||email;}
 if(first){setMessage("Please complete the required fields and check your email address.");first.focus();return;}
 submitBtn.disabled=true;submitBtn.innerHTML="Uploading…";
 setMessage("Uploading your details and images…","working");
 message.scrollIntoView({behavior:"smooth",block:"center"});
 try{
  const r=await fetch("/api/generate",{method:"POST",body:new FormData(form)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.id)throw new Error(j.error||"Something went wrong. Please try again.");
  localStorage.setItem(PENDING_KEY,JSON.stringify({id:j.id,t:Date.now()}));
  loadProjects();
  await followProject(j.id,Date.now());
 }catch(e){setMessage("⚠ "+e.message);resetButton();}
});

/* ---------- My projects (always visible) ---------- */
let listTimer;
function loadProjects(){
 clearTimeout(listTimer);
 return fetch("/api/projects",{cache:"no-store"}).then(r=>r.json()).then(list=>{
  const box=document.querySelector("#projectList");
  if(!list.length){box.innerHTML='<p class="empty">No projects yet. Create your first website above and it will appear here.</p>';return;}
  box.innerHTML=list.map(p=>{
   const st=p.status||"ready";
   const info=st==="generating"?'<small class="st gen">● Generating… it will be ready in a moment</small>'
    :st==="error"?`<small class="st bad">⚠ ${esc(p.error||"Generation failed")}</small>`
    :`<small>${new Date(p.created).toLocaleString()}</small>`;
   const actions=st==="ready"?`<a href="${editorUrl(p.id)}">Edit</a><a href="/api/projects/${p.id}/download">ZIP</a>`:"";
   return `<div class="proj"><div><b>${esc(p.name)}</b>${info}</div>${actions}<button data-del="${p.id}">Delete</button></div>`;
  }).join("");
  if(list.some(p=>p.status==="generating"))listTimer=setTimeout(loadProjects,3000);   // keep the list fresh while building
 }).catch(()=>{
  document.querySelector("#projectList").innerHTML='<p class="empty">Could not load your projects. Is the server running?</p>';
 });
}
document.querySelector("#projectList").addEventListener("click",async e=>{
 const id=e.target.dataset.del;if(!id||!confirm("Delete this project permanently?"))return;
 await fetch("/api/projects/"+id,{method:"DELETE"});
 try{if(JSON.parse(localStorage.getItem(PENDING_KEY)||"{}").id===id)localStorage.removeItem(PENDING_KEY);}catch(_){}
 loadProjects();
});

// If the page was refreshed or reopened while a website was being built, carry on and open the editor when ready.
function resumePending(){
 let pend;try{pend=JSON.parse(localStorage.getItem(PENDING_KEY)||"null");}catch(_){pend=null;}
 if(!pend||!pend.id)return;
 if(Date.now()-pend.t>30*60*1000){localStorage.removeItem(PENDING_KEY);return;}   // too old, don't jump around
 followProject(pend.id,pend.t);
}

loadProjects();
resumePending();
