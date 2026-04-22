let handData = [];
let elements = [];
let fireflies = []; 
let currentMode = "flower"; 
let capture, hands, myFont;
let wasPinching = false;
let imgStar, imgButterfly;

function preload() {
  myFont = loadFont('https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceSansPro-Bold.otf');
  imgStar = loadImage('Star.png');
  imgButterfly = loadImage('Butterfly.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
  hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
  hands.onResults(results => { handData = results.multiHandLandmarks; });

  capture = createCapture(VIDEO);
  capture.size(640, 480);
  capture.hide(); 
  processVideo();
  for(let i=0; i<15; i++) createFirefly(random(width), random(height));
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

async function processVideo() {
  if (capture.elt.readyState === 4) await hands.send({ image: capture.elt });
  window.requestAnimationFrame(processVideo);
}

function setMode(mode) {
  currentMode = mode;
  let btns = document.getElementsByClassName('menu-btn');
  for(let btn of btns) btn.classList.remove('active');
  let target = document.getElementById('btn-' + mode);
  if(target) target.classList.add('active');
}

function clearCanvas() { elements = []; fireflies = []; }

function draw() {
  background(5, 5, 20); 

  // 1. 背景层
  push();
  translate(0, 0, -800); 
  scale(-3.8, 3.8); 
  imageMode(CENTER);
  tint(80, 120, 255, 60); 
  image(capture, 0, 0);
  pop();

  drawAndIdentifyFireflies();

  // 2. 绘制森林
  for (let i = 0; i < elements.length; i++) {
    let el = elements[i];
    let prevEl = (i > 0) ? elements[i-1] : null;

    if (el.type === "flower") drawFlower(el);
    else if (el.type === "vine") drawVine(el, prevEl);
    else if (el.type === "grass") drawMagicGrass(el);
    else if (el.type === "star") drawStar(el);
    else if (el.type === "butterfly") drawButterfly(el);
  }

  if (elements.length > 500) elements.shift();
  handleInput(); 
}

function handleInput() {
  if (handData && handData.length > 0) {
    let hand = handData[0];
    let screenX = (1 - hand[8].x) * width;
    let screenY = hand[8].y * height;
    let thumbX = (1 - hand[4].x) * width;
    let thumbY = hand[4].y * height;
    let isPinching = dist(screenX, screenY, thumbX, thumbY) < 70;

    // 按钮选择逻辑 (大屏优化)
    if (screenX < 260 && isPinching && !wasPinching) {
      let idx = floor(screenY / (height / 7.5));
      let modes = ["grass", "flower", "vine", "butterfly", "star", "firefly"];
      if (idx >= 0 && idx < 6) setMode(modes[idx]);
      else if (idx >= 6) clearCanvas();
    } 
    // 生成逻辑
    else if (isPinching) {
      if (currentMode === "vine" && frameCount % 2 === 0) createNew(screenX, screenY, "vine");
      else if (currentMode === "firefly" && frameCount % 10 === 0) createFirefly(screenX, screenY);
      else if (currentMode === "butterfly" && frameCount % 30 === 0) createNew(screenX, screenY, "butterfly");
      else if (currentMode !== "flower" && currentMode !== "butterfly" && currentMode !== "vine" && frameCount % 4 === 0) createNew(screenX, screenY, currentMode);
    }
    if (wasPinching && !isPinching && currentMode === "flower") createNew(screenX, screenY, "flower");
    wasPinching = isPinching;
  }
}

function createNew(x, y, type) {
  let colors = [], leafData = [], targetSize = 0;
  
  if (type === "flower") {
    targetSize = random(60, 110);
    let r = random(150, 255), g = random(50, 200), b = random(180, 255);
    colors = [color(r,g,b,180), color(b,r,g,200), color(g,b,r,220), color(255,255,255,230)];
  } else if (type === "vine") {
    targetSize = 20;
    if (random() > 0.8) {
      leafData.push({ side: random()>0.5?1:-1, size: random(40, 80), angle: random(-0.3, 0.3), c: color(random(0,100), 255, random(100,200), 180)});
    }
  } else if (type === "grass") {
    targetSize = random(80, 130);
    colors = color(0, 255, random(100,200), 180);
  } else {
    targetSize = random(20, 35);
  }
  
  elements.push({ x: x, y: y, type: type, size: 0, maxSize: targetSize, offset: random(1000), colors: colors, leaf: leafData });
}

// --- 🌸 核心：渐变、生长、呼吸花朵 ---
function drawFlower(el) {
  if (el.size < el.maxSize) el.size += 2.5;
  let breath = 1 + sin(frameCount * 0.05 + el.offset) * 0.05;
  let alphaB = map(sin(frameCount * 0.05 + el.offset), -1, 1, 150, 255);

  push();
  translate(el.x - width/2, el.y - height/2, 2);
  scale(breath);
  noStroke();
  for (let l = 0; l < 4; l++) {
    let c = el.colors[l];
    fill(c.levels[0], c.levels[1], c.levels[2], alphaB * (1 - l*0.15));
    let lSize = el.size * (1 - l * 0.22);
    for (let i = 0; i < 6; i++) {
      rotate(PI/3);
      ellipse(0, lSize/2, lSize/1.8, lSize);
    }
  }
  pop();
}

// --- 🌿 核心：丝滑参考版藤蔓 + 柳叶 ---
function drawVine(el, prevEl) {
  if (prevEl && prevEl.type === "vine" && dist(el.x, el.y, prevEl.x, prevEl.y) < 85) {
    push();
    stroke(0, 255, 200, 180);
    strokeWeight(5);
    line(prevEl.x - width/2, prevEl.y - height/2, 0, el.x - width/2, el.y - height/2, 0);
    
    // 柳叶形状
    if (el.leaf.length > 0) {
      let l = el.leaf[0];
      push();
      translate(el.x - width/2, el.y - height/2, 1);
      rotate(l.side * PI/3 + l.angle);
      noStroke(); fill(l.c);
      beginShape();
      vertex(0, 0);
      bezierVertex(l.size/3, -l.size/3, l.size/3, -l.size/1.5, 0, -l.size);
      bezierVertex(-l.size/3, -l.size/1.5, -l.size/3, -l.size/3, 0, 0);
      endShape(CLOSE);
      pop();
    }
    pop();
  }
}

function drawMagicGrass(el) {
  if (el.size < el.maxSize) el.size += 3.5;
  push();
  translate(el.x - width/2, el.y - height/2, 0);
  let sw = sin(frameCount * 0.04 + el.offset) * 20;
  fill(el.colors); noStroke();
  beginShape();
  vertex(-12, 0); vertex(12, 0);
  bezierVertex(8, -el.size*0.4, sw, -el.size*0.8, sw, -el.size);
  endShape(CLOSE);
  pop();
}

function drawStar(el) {
  if (el.size < el.maxSize) el.size += 0.8;
  push();
  translate(el.x - width/2, el.y - height/2, 1);
  tint(255, 255, 200, map(sin(frameCount*0.1 + el.offset), -1, 1, 120, 255));
  imageMode(CENTER); image(imgStar, 0, 0, el.size, el.size);
  pop();
}

function drawButterfly(el) {
  if (el.size < el.maxSize) el.size += 0.5;
  el.y -= 1.5; el.x += sin(frameCount * 0.05 + el.offset) * 3;
  push();
  translate(el.x - width/2, el.y - height/2, 10);
  scale(sin(frameCount * 0.2 + el.offset), 1); 
  tint(255, 200, 255, 220);
  imageMode(CENTER); image(imgButterfly, 0, 0, el.size, el.size);
  pop();
}

function createFirefly(x, y) {
  fireflies.push({ x: x, y: y, vx: random(-0.7, 0.7), vy: random(-0.7, 0.7), size: random(5, 10), offset: random(1000) });
}

function drawAndIdentifyFireflies() {
  push();
  translate(-width/2, -height/2, 50);
  for(let f of fireflies) {
    f.x += f.vx; f.y += f.vy;
    if(f.x<0 || f.x>width) f.vx*=-1;
    if(f.y<0 || f.y>height) f.vy*=-1;
    fill(200, 255, 100, 200); noStroke(); circle(f.x, f.y, f.size);
  }
  pop();
}
