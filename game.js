
const profiles = [
  {id:"exploradore",name:"Exploradore",img:"assets/portraits/exploradore.png",affinity:1,desc:"Curiosidad y valentía."},
  {id:"guardian",name:"Guardián de historias",img:"assets/portraits/guardian.png",affinity:3,desc:"Paciencia y constancia."},
  {id:"cuidadore",name:"Cuidadore",img:"assets/portraits/cuidadore.png",affinity:3,desc:"Empatía y paciencia."},
  {id:"inventore",name:"Inventore",img:"assets/portraits/inventore.png",affinity:1,desc:"Curiosidad e ingenio."},
  {id:"magia",name:"Aprendiz de magia",img:"assets/portraits/magia.png",affinity:2,desc:"Intuición y valentía."}
];

const levels = [
  {kicker:"PRUEBA 1", title:"Bosque de las Huellas"},
  {kicker:"PRUEBA 2", title:"Caverna del Fuego"},
  {kicker:"PRUEBA 3", title:"Cámara de los Huevos"},
  {kicker:"PRUEBA 4", title:"Río de Cristal"},
  {kicker:"PRUEBA 5", title:"Patio de Entrenamiento"}
];

const state = {
  profile:null,
  trust:20,
  bond:0,
  energy:70,
  hunger:30,
  mood:70,
  clues:new Set(),
  encounterChoices:0,
  level:0
};

const $ = sel => document.querySelector(sel);
const stage = $("#game");
let playerEl = null;
let nivalEl = null;
let playerX = 90;
let nivalX = 810;
let keys = {left:false,right:false};
let playerFrame = 0;
let nivalFrame = 0;
let lastFrameTime = 0;
let currentMode = "idle";
let nivalMode = "idle";
let activeScene = "none";
let animationId = null;

function show(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  $("#"+id).classList.add("active");
}

function updateHUD(){
  $("#trust").textContent = state.trust;
  $("#bond").textContent = state.bond;
  $("#energy").textContent = state.energy;
}

function setMessage(text){
  $("#message").textContent = text;
}

function setLevel(index){
  state.level = index;
  $("#level-kicker").textContent = levels[index].kicker;
  $("#level-title").textContent = levels[index].title;
  updateHUD();
}

function clearStage(bgClass){
  stage.className = "game-stage " + bgClass;
  stage.innerHTML = "";
  playerEl = null;
  nivalEl = null;
  activeScene = "none";
}

function createActor(type, x, yBottom=18){
  const el = document.createElement("div");
  el.className = `actor ${type}`;
  el.style.left = `${x}px`;
  el.style.bottom = `${yBottom}px`;
  stage.appendChild(el);
  return el;
}

function setSpriteFrame(el, frame, frames){
  if(!el) return;
  const pct = frames <= 1 ? 0 : (frame / (frames - 1)) * 100;
  el.style.backgroundPosition = `${pct}% center`;
}

function clampPlayer(){
  const max = Math.max(40, stage.clientWidth - 150);
  playerX = Math.max(20, Math.min(max, playerX));
}

function updateActorPositions(){
  if(playerEl) playerEl.style.left = `${playerX}px`;
  if(nivalEl) nivalEl.style.left = `${nivalX}px`;
}


function moveFreePlayer(dt){
  if(!playerEl) return;

  const speed = 220;
  let moving = false;

  if(keys.left){
    playerX -= speed * dt;
    playerEl.classList.add("flip");
    moving = true;
  }
  if(keys.right){
    playerX += speed * dt;
    playerEl.classList.remove("flip");
    moving = true;
  }

  clampPlayer();
  currentMode = moving ? "walk" : "idle";
  playerEl.classList.toggle("walking", moving);
  updateActorPositions();
}

function animate(now){
  if(!lastFrameTime) lastFrameTime = now;
  const dt = Math.min(0.035, (now-lastFrameTime)/1000);
  lastFrameTime = now;

  if(activeScene === "forest" && playerEl){
    moveFreePlayer(dt);
    updateForestPrompt();
  }

  if(activeScene === "s2forest" && playerEl){
    moveFreePlayer(dt);

    const playerCenter = playerX + 65;
    const nivalCenter = nivalX + 70;

    if(Math.abs(playerCenter - nivalCenter) < 170){
      setMessage("Nival escucha algo entre los árboles. El Bosque Cambiante empieza acá.");
    }else{
      setMessage("Explorá el Bosque Cambiante con A/D o las flechas.");
    }
  }

  if(activeScene === "portal" && playerEl && nivalEl){
    const speed = 210;
    let moving = false;

    if(keys.left){
      playerX -= speed * dt;
      playerEl.classList.add("flip");
      moving = true;
    }
    if(keys.right){
      playerX += speed * dt;
      playerEl.classList.remove("flip");
      moving = true;
    }

    const max = Math.max(40, stage.clientWidth - 115);
    playerX = Math.max(20, Math.min(max, playerX));

    currentMode = moving ? "walk" : "idle";
    playerEl.classList.toggle("walking", moving);

    const desiredNivalX = Math.max(25, playerX - 115);
    const diff = desiredNivalX - nivalX;

    if(Math.abs(diff) > 8){
      const nivalStep = Math.sign(diff) * Math.min(Math.abs(diff), 185 * dt);
      nivalX += nivalStep;
      nivalMode = "walk";
      nivalEl.classList.add("walking");
      nivalEl.classList.toggle("flip", nivalStep < 0);
    }else{
      nivalMode = "idle";
      nivalEl.classList.remove("walking");
    }

    updateActorPositions();

    const threshold = stage.clientWidth - 150;
    if(playerX > threshold && nivalX > threshold - 145 && !window.__portalCrossing){
      window.__portalCrossing = true;
      currentMode = "walk";
      nivalMode = "walk";
      playerEl.classList.add("walking");
      nivalEl.classList.add("walking");

      setMessage("El portal responde al vínculo. Lo atraviesan juntes…");

      playerEl.style.transition = "left .75s ease, opacity .75s ease, transform .75s ease";
      nivalEl.style.transition = "left .85s ease, opacity .85s ease, transform .85s ease";
      playerEl.style.left = `${stage.clientWidth + 30}px`;
      nivalEl.style.left = `${stage.clientWidth - 10}px`;
      playerEl.style.opacity = "0";
      nivalEl.style.opacity = "0";

      setTimeout(()=>{
        activeScene = "none";
        currentMode = "idle";
        nivalMode = "idle";
        show("season2-intro");
      },950);
    }
  }

  const frameStep = 1000/8;
  if(!animate.nextFrame || now >= animate.nextFrame){
    animate.nextFrame = now + frameStep;

    if(playerEl){
      if(currentMode === "walk"){
        playerFrame = (playerFrame+1)%6;
        setSpriteFrame(playerEl, playerFrame, 6);
      }else{
        playerFrame = 0;
        setSpriteFrame(playerEl, 0, 4);
      }
    }

    if(nivalEl){
      if(nivalMode === "walk"){
        nivalFrame = (nivalFrame+1)%6;
        setSpriteFrame(nivalEl, nivalFrame, 6);
      }else{
        nivalFrame = 0;
        setSpriteFrame(nivalEl, 0, 4);
      }
    }
  }

  animationId = requestAnimationFrame(animate);
}

function ensureAnimation(){
  if(!animationId) animationId = requestAnimationFrame(animate);
}

window.addEventListener("keydown", e=>{
  if(["ArrowLeft","ArrowRight","a","A","d","D","e","E"].includes(e.key)) e.preventDefault();
  if(e.key==="ArrowLeft" || e.key==="a" || e.key==="A") keys.left=true;
  if(e.key==="ArrowRight" || e.key==="d" || e.key==="D") keys.right=true;
  if((e.key==="e" || e.key==="E") && activeScene==="forest") interactForest();
});
window.addEventListener("keyup", e=>{
  if(e.key==="ArrowLeft" || e.key==="a" || e.key==="A") keys.left=false;
  if(e.key==="ArrowRight" || e.key==="d" || e.key==="D") keys.right=false;
});

function openChoices(title, copy, options, progress=""){
  $("#choice-title").textContent = title;
  $("#choice-copy").textContent = copy;
  $("#choice-progress").textContent = progress;
  const wrap = $("#choice-buttons");
  wrap.innerHTML = "";
  options.forEach(option=>{
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = option.label;
    btn.addEventListener("click", ()=>{
      closeChoices();
      option.run();
    });
    wrap.appendChild(btn);
  });
  $("#choice-overlay").classList.add("open");
}

function closeChoices(){
  $("#choice-overlay").classList.remove("open");
}

/* Portada: toda la portada y, especialmente, la zona del botón son clickeables. */
const startBtn = $("#start-btn");
const hero = document.querySelector(".hero");
startBtn.addEventListener("click", e=>{
  e.stopPropagation();
  show("character");
});
hero.addEventListener("click", ()=>show("character"));

const grid = $("#character-grid");
profiles.forEach(p=>{
  const card = document.createElement("article");
  card.className = "char";
  card.innerHTML = `
    <img class="portrait" src="${p.img}" alt="${p.name}">
    <button class="primary" type="button">Elegir</button>
    <h3>${p.name}</h3>
    <small>${p.desc}</small>
  `;
  card.querySelector("button").addEventListener("click", ()=>{
    state.profile = p;
    state.trust = 20 + p.affinity;
    state.bond = 0;
    state.energy = 70;
    state.hunger = 30;
    state.mood = 70;
    state.clues.clear();
    state.encounterChoices = 0;
    show("play");
    startForest();
  });
  grid.appendChild(card);
});

function addSceneCard(title, copy){
  const card = document.createElement("div");
  card.className = "scene-card";
  card.innerHTML = `<strong>${title}</strong><span>${copy}</span>`;
  stage.appendChild(card);
}

function startForest(){
  keys.left=false;
  keys.right=false;
  setLevel(0);
  clearStage("bg-forest");
  activeScene = "forest";
  playerX = 70;
  nivalX = Math.max(680, stage.clientWidth - 175);
  playerEl = createActor("player", playerX, 14);
  nivalEl = createActor("nival", nivalX, 24);
  currentMode = "idle";
  nivalMode = "idle";

  const clues = [
    {key:"feather", icon:"🪶", x:.30, text:"La pluma todavía está tibia."},
    {key:"tracks", icon:"🐾", x:.52, text:"Las huellas se vuelven más lentas aquí."},
    {key:"branch", icon:"🌿", x:.72, text:"La rama fue apartada con cuidado."}
  ];

  clues.forEach(c=>{
    const el = document.createElement("div");
    el.className = "clue-object";
    el.dataset.key = c.key;
    el.dataset.text = c.text;
    el.dataset.ratio = c.x;
    el.textContent = c.icon;
    el.style.left = `${c.x*100}%`;
    stage.appendChild(el);
  });

  addSceneCard("Bosque de las Huellas","Explorá las señales antes de acercarte a Nival.");
  setMessage("Usá A/D o las flechas para caminar. Acercate a una pista y presioná E.");
  updateHUD();
  ensureAnimation();
}

function cluePosition(el){
  return stage.clientWidth * Number(el.dataset.ratio);
}

function nearestClue(){
  let best = null;
  stage.querySelectorAll(".clue-object:not(.found)").forEach(el=>{
    const d = Math.abs((playerX+65)-cluePosition(el));
    if(d < 85 && (!best || d<best.d)) best = {el,d};
  });
  return best ? best.el : null;
}

function updateForestPrompt(){
  const clue = nearestClue();
  if(clue){
    setMessage(`Presioná E para examinar ${clue.textContent}.`);
    return;
  }
  const playerCenter = playerX + 65;
  if(Math.abs(playerCenter-(nivalX+70)) < 150){
    if(state.clues.size<3){
      setMessage(`Nival te observa, pero todavía te faltan ${3-state.clues.size} pista(s).`);
    }else{
      setMessage("Nival está cerca. Presioná E para intentar acercarte.");
    }
    return;
  }
  if(state.clues.size===3) setMessage("Encontraste las tres pistas. Acercate a Nival.");
}

function interactForest(){
  const clue = nearestClue();
  if(clue){
    clue.classList.add("found");
    state.clues.add(clue.dataset.key);
    state.trust += 2;
    updateHUD();
    setMessage(clue.dataset.text + " +2 confianza.");
    return;
  }

  const playerCenter = playerX+65;
  if(Math.abs(playerCenter-(nivalX+70)) < 150 && state.clues.size===3){
    encounter();
  }
}

function encounter(){
  openChoices(
    "Primer encuentro",
    "Nival mantiene distancia. Elegí tres acciones.",
    [
      {label:"Esperar sin acercarte",run:()=>resolveEncounter(8,3,"Nival baja lentamente las alas.")},
      {label:"Acercarte lentamente",run:()=>resolveEncounter(5,2,"Nival no retrocede.")},
      {label:"Ofrecer la pluma",run:()=>resolveEncounter(9,4,"Nival da un paso hacia vos.")},
      {label:"Llamarlo en voz alta",run:()=>resolveEncounter(-5,0,"El sonido repentino lo sobresalta.")}
    ],
    `Confianza: ${state.trust} · acciones ${state.encounterChoices}/3`
  );
}

function resolveEncounter(t,b,msg){
  state.trust = Math.max(0,state.trust+t);
  state.bond = Math.max(0,state.bond+b);
  state.encounterChoices++;
  updateHUD();
  setMessage(msg);

  if(state.encounterChoices<3){
    setTimeout(encounter,450);
    return;
  }

  if(state.trust>=44){
    nivalMode = "walk";
    nivalEl.classList.add("walking","flip");
    const target = playerX + 135;
    nivalEl.style.transition = "left .95s ease";
    nivalX = target;
    updateActorPositions();
    setTimeout(()=>{
      nivalMode = "idle";
      nivalEl.classList.remove("walking");
      setMessage("Nival decide acompañarte.");
      setTimeout(startCave,800);
    },1000);
  }else{
    state.encounterChoices = 0;
    setMessage(`Tenés ${state.trust} de confianza. Necesitás 44. Probá de nuevo.`);
  }
}

function prepareChoiceScene(levelIndex,bg,title,copy){
  setLevel(levelIndex);
  clearStage(bg);
  activeScene = "choices";
  playerEl = createActor("player", 110, 15);
  nivalEl = createActor("nival", Math.max(650,stage.clientWidth-190), 25);
  currentMode = "idle";
  nivalMode = "idle";
  addSceneCard(title,copy);
  updateHUD();
  ensureAnimation();
}

function startCave(){
  prepareChoiceScene(1,"bg-cave","Caverna del Fuego","El calor pone nervioso a Nival.");
  let round = 0;
  function ask(){
    round++;
    openChoices("Caverna del Fuego","¿Cómo lo acompañás?",[
      {label:"Esperar a que se calme",run:()=>apply(7,4,2,"Nival regula la respiración.")},
      {label:"Acercarte muy despacio",run:()=>apply(5,3,-1,"Respetás su señal.")},
      {label:"Ofrecerle comida",run:()=>apply(8,5,0,"Nival se acerca cuando está listo.")},
      {label:"Intentar sacarlo rápido",run:()=>apply(-7,-2,-7,"Nival retrocede y se tensa.")}
    ],`Acción ${round}/3`);
  }
  function apply(t,b,e,msg){
    state.trust=Math.max(0,state.trust+t);
    state.bond=Math.max(0,state.bond+b);
    state.energy=Math.max(0,state.energy+e);
    updateHUD();
    setMessage(msg);
    if(round<3) setTimeout(ask,450);
    else if(state.trust>=55) setTimeout(startEggs,750);
    else{
      round=0;
      setMessage(`Nival necesita más seguridad. Confianza: ${state.trust}.`);
      setTimeout(ask,850);
    }
  }
  setTimeout(ask,500);
}

function startEggs(){
  prepareChoiceScene(2,"bg-eggs","Cámara de los Huevos","Cada huevo necesita un ambiente diferente.");
  const eggs=[
    {name:"Huevo de Escamas de Río",answer:"Agua",clue:"Está frío y vibra cuando escucha agua."},
    {name:"Huevo de Brasa",answer:"Fuego",clue:"Está tibio y tiene líneas rojizas."},
    {name:"Huevo de Cielo",answer:"Viento",clue:"Es liviano y sus marcas parecen plumas."}
  ];
  let i=0;
  function ask(){
    const e=eggs[i];
    openChoices(e.name,e.clue,["Fuego","Agua","Viento","Luz"].map(x=>({
      label:x,run:()=>answer(x)
    })),`Huevo ${i+1}/3`);
  }
  function answer(a){
    const e=eggs[i];
    if(a===e.answer){
      state.trust+=5;
      state.bond+=4;
      updateHUD();
      setMessage("Elegiste el ambiente que el huevo necesitaba.");
      i++;
      if(i<3) setTimeout(ask,500);
      else setTimeout(startRiver,800);
    }else{
      state.trust=Math.max(0,state.trust-3);
      updateHUD();
      setMessage("Ese nido no coincide con todas las pistas.");
      setTimeout(ask,500);
    }
  }
  setTimeout(ask,500);
}

function startRiver(){
  prepareChoiceScene(3,"bg-river","Río de Cristal","Cruzar juntes importa más que llegar rápido.");
  let stageNo=0;
  const texts=[
    "Las piedras están separadas y Nival duda.",
    "Una piedra se mueve con la corriente.",
    "La salida está cerca, pero Nival está cansado."
  ];

  function ask(){
    openChoices(`Tramo ${stageNo+1}`,texts[stageNo],[
      {label:"Ir primero y llamarlo",run:()=>apply(4,3,-6,"Le mostrás un camino posible.")},
      {label:"Esperar a que Nival decida",run:()=>apply(7,4,-2,"Nival cruza cuando se siente preparado.")},
      {label:"Cruzar al mismo tiempo",run:()=>apply(5,7,-7,"Coordinan el movimiento.")},
      {label:"Empujarlo a avanzar",run:()=>apply(-7,-3,-5,"Nival pierde seguridad.")}
    ],`Tramo ${stageNo+1}/3`);
  }

  function apply(t,b,e,msg){
    state.trust=Math.max(0,state.trust+t);
    state.bond=Math.max(0,state.bond+b);
    state.energy=Math.max(0,state.energy+e);
    updateHUD();
    setMessage(msg);

    currentMode="walk";
    nivalMode="walk";
    playerEl.classList.add("walking");
    nivalEl.classList.add("walking");
    playerEl.style.transition="left .7s ease";
    nivalEl.style.transition="left .7s ease";
    playerX=Math.min(stage.clientWidth-320,playerX+120);
    nivalX=Math.min(stage.clientWidth-165,nivalX+80);
    updateActorPositions();

    setTimeout(()=>{
      currentMode="idle";
      nivalMode="idle";
      playerEl.classList.remove("walking");
      nivalEl.classList.remove("walking");
      stageNo++;
      if(stageNo<3) ask();
      else setTimeout(startTraining,650);
    },750);
  }
  setTimeout(ask,500);
}

function startTraining(){
  prepareChoiceScene(4,"bg-training","Patio de Entrenamiento","Entrenar no es controlar: es aprender a comunicarse.");
  let i=0;
  const trials=[
    {title:"Aros de vuelo",copy:"Nival abre las alas y mira el aro.",best:"Volá"},
    {title:"Rampa de precisión",copy:"La plataforma necesita un salto medido.",best:"Saltá"},
    {title:"Una bandera cae",copy:"Nival se sobresalta. El circuito puede esperar.",best:"Quedate"}
  ];

  function ask(){
    const t=trials[i];
    openChoices(t.title,t.copy,["Volá","Saltá","Quedate","¡Más rápido!"].map(x=>({
      label:x,run:()=>answer(x,t.best)
    })),`Ejercicio ${i+1}/3`);
  }

  function answer(a,best){
    if(a===best){
      state.trust+=7;
      state.bond+=7;
      state.energy=Math.max(0,Math.min(100,state.energy+(a==="Quedate"?5:-5)));
      setMessage("La indicación coincide con lo que Nival necesita.");
    }else if(a==="¡Más rápido!"){
      state.trust=Math.max(0,state.trust-8);
      state.bond=Math.max(0,state.bond-4);
      state.energy=Math.max(0,state.energy-6);
      setMessage("Apurarlo rompe el ritmo que habían construido.");
    }else{
      state.trust+=1;
      state.bond+=1;
      state.energy=Math.max(0,state.energy-3);
      setMessage("Funciona a medias: Nival esperaba otra señal.");
    }
    updateHUD();
    i++;
    if(i<3) setTimeout(ask,500);
    else setTimeout(finishAdventure,800);
  }
  setTimeout(ask,500);
}

function finishAdventure(){
  activeScene="none";
  $("#final-trust").textContent=state.trust;
  $("#final-bond").textContent=state.bond;
  $("#decision-title").textContent="Ahora decide Nival.";
  $("#decision-copy").textContent=`Terminaste las cinco pruebas con ${state.trust} de confianza y ${state.bond} de vínculo.`;
  const btn=$("#decision-btn");
  btn.textContent="Ver la decisión";
  btn.onclick=()=>{
    const chosen = state.trust>=65 && state.bond>=25;
    if(chosen){
      $("#decision-title").textContent="Nival te ha elegido.";
      $("#decision-copy").textContent="Nival se acerca por decisión propia y apoya la frente contra vos. Una luz aparece al otro lado del Santuario.";
      btn.textContent="Ir hacia la luz";
      btn.onclick=startPortalTransition;
    }else{
      $("#decision-title").textContent="Nival todavía no está listo.";
      $("#decision-copy").textContent=`Terminaste con ${state.trust} de confianza y ${state.bond} de vínculo.`;
      btn.textContent="Volver a empezar";
      btn.onclick=()=>location.reload();
    }
  };
  show("decision");
}


function startPortalTransition(){
  keys.left=false;
  keys.right=false;
  show("play");
  clearStage("bg-portal");
  activeScene="portal";
  window.__portalCrossing=false;

  $("#level-kicker").textContent="FINAL DE TEMPORADA 1";
  $("#level-title").textContent="El Portal";

  playerX=100;
  nivalX=25;

  playerEl=createActor("player",playerX,15);
  nivalEl=createActor("nival",nivalX,25);

  currentMode="idle";
  nivalMode="idle";

  const portal=document.createElement("div");
  portal.className="portal";
  stage.appendChild(portal);

  const label=document.createElement("div");
  label.className="portal-label";
  label.textContent="Atravesá el portal con Nival";
  stage.appendChild(label);

  addSceneCard(
    "El Portal",
    "No se abre para una sola persona. Caminá hacia él y asegurate de que Nival cruce con vos."
  );

  setMessage("Usá A/D o las flechas. Nival te acompaña por decisión propia.");
  ensureAnimation();
}


function enterRefuge(){
  $("#r-trust").textContent=state.trust;
  $("#r-bond").textContent=state.bond;
  $("#r-energy").textContent=state.energy;
  $("#hunger").textContent=state.hunger;
  $("#mood").textContent=state.mood;
  show("refuge");
}

document.querySelectorAll("[data-home]").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const a=btn.dataset.home;
    if(a==="feed"){
      state.hunger=Math.max(0,state.hunger-20);
      state.mood=Math.min(100,state.mood+5);
      $("#refuge-message").textContent="Nival acepta la comida y se acomoda cerca tuyo.";
    }
    if(a==="train"){
      state.energy=Math.max(0,state.energy-10);
      state.bond=Math.min(100,state.bond+3);
      state.mood=Math.min(100,state.mood+4);
      $("#refuge-message").textContent="Practican una señal corta y Nival vuelve contento.";
    }
    if(a==="explore"){
      state.energy=Math.max(0,state.energy-12);
      state.bond=Math.min(100,state.bond+4);
      state.hunger=Math.min(100,state.hunger+8);
      $("#refuge-message").textContent="Salen a explorar los senderos del Santuario.";
    }
    if(a==="rest"){
      state.energy=Math.min(100,state.energy+20);
      state.mood=Math.min(100,state.mood+3);
      $("#refuge-message").textContent="Nival se acurruca y descansa.";
    }
    $("#r-trust").textContent=state.trust;
    $("#r-bond").textContent=state.bond;
    $("#r-energy").textContent=state.energy;
    $("#hunger").textContent=state.hunger;
    $("#mood").textContent=state.mood;
  });
});

$("#restart").addEventListener("click",()=>location.reload());


$("#season2-start").addEventListener("click",()=>{
  keys.left=false;
  keys.right=false;
  show("play");
  setLevel(0);
  clearStage("bg-forest");
  activeScene="s2forest";
  $("#level-kicker").textContent="TEMPORADA 2 · CAPÍTULO 1";
  $("#level-title").textContent="El Bosque Cambiante";
  addSceneCard(
    "Una señal extraña",
    "Nival escucha algo que vos no podés oír. El bosque ya no parece estar en el mismo lugar."
  );
  playerX=100;
  nivalX=Math.max(650,stage.clientWidth-190);
  playerEl=createActor("player",playerX,15);
  nivalEl=createActor("nival",nivalX,25);
  currentMode="idle";
  nivalMode="idle";
  setMessage("Temporada 2 iniciada. Explorá el Bosque Cambiante con A/D o las flechas.");
  updateHUD();
  ensureAnimation();
});


ensureAnimation();
