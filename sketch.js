let handData = [];
let elements = [];
let fireflies = []; 
let currentMode = "flower"; 
let capture, hands, myFont;
let smoothX = 0, smoothY = 0;
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
  for(let i=0; i<20; i++) createFirefly(random(width), random(height));
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
  background(5, 5, 25); 
  
  // 1. 背景视频层
  push();
  translate(0, 0, -800); 
  scale(-3.8, 3.8); 
  imageMode(CENTER);
  tint(70, 100, 255, 50); 
  image(capture, 0, 0);
  pop();

  drawAndIdentifyFireflies();

  // 2. 绘制藤蔓的茎（先画线，确保连续性）
  drawVinePath();

  // 3. 绘制其他所有元素
  for (let el of elements) {
    if (el.type === "star") drawStar(el);
    else if (el.type === "flower") drawFlower(el);
    else if (el.type === "butterfly") drawButterfly(el);
    else if (el.type === "grass") drawMagicGrass(el);
    else if (el.type === "vine") drawVineLeaves(el); // 只画该点的叶子
  }

  if (elements.length > 600) elements.shift();
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

    if (screenX < 250 && isPinching && !wasPinching) {
      let idx = floor(screenY / (height / 7));
      let modes = ["grass", "flower", "vine", "butterfly", "star", "firefly"];
      if (idx >= 0 && idx < 6) setMode(modes[idx]);
      else if (idx === 6) clearCanvas();
    } 
    else if (isPinching) {
      if (currentMode === "firefly" && frameCount % 10 === 0) createFirefly(screenX, screenY);
      else if (currentMode === "butterfly" && frameCount % 30 === 0) createNew(screenX, screenY, "butterfly");
      else if (currentMode === "vine" && frameCount % 2 === 0) createNew(screenX, screenY, "vine");
      else if (currentMode !== "flower" && currentMode !== "butterfly" && currentMode !== "vine" && frameCount % 4 === 0) createNew(screenX, screenY, currentMode);
    }
    if (wasPinching && !isPinching && currentMode === "flower") createNew(screenX, screenY, "flower");
    wasPinching = isPinching;
  }
}

function createNew(x, y, type) {
  let col, targetSize, leafData = [];
  
  if (type === "flower") {
    targetSize = random(50, 100);
    // 随机梦幻配色方案
    let r = random(100, 255);
    let g = random(50, 200);
    let b = random(150, 255);
    col = [
      color(r, g, b, 150),       // 外层
      color(g, b, r, 180),       // 中层
      color(b, r, g, 210),       // 内层
      color(255, 255, 255, 230)  // 核心
    ];
  } else if (type === "vine") {
    targetSize = random(15, 25);
    if (random() > 0.7) { // 叶子密度控制
      leafData.push({
        side: random() > 0.5 ? 1 : -1,
        size: random(30, 70),
        angle: random(-PI/4, PI/4),
        c: color(random(0, 100), 255, random(100, 200), 180)
      });
    }
  } else if (type === "grass") {
    targetSize = random(80, 130);
    col = color(0, 255, random(100, 200), 180);
  } else {
    targetSize = random(20, 35);
    col = color(255);
  }

  elements.push({ x: x, y: y, type: type, size: 0, maxSize: targetSize, offset: random(1000), colors: col, leaf: leafData });
}

// --- 🌸 梦幻 4 层渐变花朵 ---
function drawFlower(el) {
  if (el.size < el.maxSize) el.size += 2.5;
  push();
  translate(el.x - width/2, el.y - height/2, 2);
  noStroke();
  
  let layers = 4;
  for (let l = 0; l < layers; l++) {
    fill(el.colors[l]);
    let lSize = el.size * (1 - l * 0.22);
    for (let i = 0; i < 6; i++) {
      rotate(PI/3);
      ellipse(0, lSize/2, lSize/1.8, lSize);
    }
  }
  pop();
}

// --- 🌿 丝滑藤蔓路径 ---
function drawVinePath() {
  let vPoints = elements.filter(el => el.type === "vine");
  if (vPoints.length < 2) return;
  
  push();
  noFill();
  stroke(0, 255, 180, 150);
  strokeWeight(6); // 粗细均匀的茎
  beginShape();
  curveVertex(vPoints[0].x - width/2, vPoints[0].y - height/2);
  for (let p of vPoints) {
    curveVertex(p.x - width/2, p.y - height/2);
  }
  curveVertex(vPoints[vPoints.length-1].x - width/2, vPoints[vPoints.length-1].y - height/2);
  endShape();
  pop();
}

// --- 🍃 自然柳叶状叶子 ---
function drawVineLeaves(p) {
  if (p.leaf.length === 0) return;
  push();
  translate(p.x - width/2, p.y - height/2, 1);
  let l = p.leaf[0];
  rotate(l.side * PI/3 + l.angle);
  noStroke();
  fill(l.c);
  
  // 柳叶形状：尖长的椭圆
  beginShape();
  vertex(0, 0);
  bezierVertex(l.size/4, -l.size/2, l.size/4, -l.size, 0, -l.size);
  bezierVertex(-l.size/4, -l.size, -l.size/4, -l.size/2, 0, 0);
  endShape(CLOSE);
  pop();
}

function drawMagicGrass(el) {
  if (el.size < el.maxSize) el.size += 3.5;
  push();
  translate(el.x - width/2, el.y - height/2, 0);
  let sw = sin(frameCount * 0.04 + el.offset) * 20;
  fill(el.colors);
  noStroke();
  beginShape();
  vertex(-12, 0);
  vertex(12, 0);
  bezierVertex(8, -el.size*0.4, sw, -el.size*0.8, sw, -el.size);
  endShape(CLOSE);
  pop();
}

function drawStar(el) {
  if (el.size < el.maxSize) el.size += 0.8;
  push();
  translate(el.x - width/2, el.y - height/2, 1);
  let b = sin(frameCount * 0.1 + el.offset);
  tint(255, 255, 200, map(b, -1, 1, 120, 255));
  imageMode(CENTER);
  image(imgStar, 0, 0, el.size, el.size);
  pop();
}

function drawButterfly(el) {
  if (!imgButterfly) return;
  if (el.size < el.maxSize) el.size += 0.5;
  el.y -= 1.5;
  el.x += sin(frameCount * 0.05 + el.offset) * 3;
  push();
  translate(el.x - width/2, el.y - height/2, 10);
  scale(sin(frameCount * 0.2 + el.offset), 1); 
  tint(255, 200, 255, 220);
  imageMode(CENTER);
  image(imgButterfly, 0, 0, el.size, el.size);
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
    fill(200, 255, 100, 200); noStroke();
    circle(f.x, f.y, f.size);
  }
  pop();
}
