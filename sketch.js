let handData = [];
let elements = [];
let fireflies = []; 
let currentMode = "flower"; // 初始模式
let capture, hands, myFont;
let smoothX = 0, smoothY = 0;
let wasPinching = false;
let imgStar, imgButterfly;

function preload() {
  // 加载素材
  myFont = loadFont('https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceSansPro-Bold.otf');
  imgStar = loadImage('Star.png');
  imgButterfly = loadImage('Butterfly.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  textFont(myFont);
  
  // MediaPipe 配置
  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });
  hands.setOptions({ 
    maxNumHands: 1, 
    modelComplexity: 0, 
    minDetectionConfidence: 0.6, 
    minTrackingConfidence: 0.6 
  });
  hands.onResults(results => { handData = results.multiHandLandmarks; });

  capture = createCapture(VIDEO);
  capture.size(640, 480);
  capture.hide(); 
  processVideo();
  
  // 初始环境萤火虫
  for(let i=0; i<12; i++) createFirefly(random(width), random(height));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

async function processVideo() {
  if (capture.elt.readyState === 4) await hands.send({ image: capture.elt });
  window.requestAnimationFrame(processVideo);
}

// --- 🌟 HTML 按钮调用的函数 ---
function setMode(mode) {
  currentMode = mode;
  // 更新按钮的视觉反馈（高亮选中项）
  let btns = document.getElementsByClassName('menu-btn');
  for(let btn of btns) {
    btn.classList.remove('active');
  }
  document.getElementById('btn-' + mode).classList.add('active');
}

function clearCanvas() {
  elements = [];
  fireflies = [];
}

function draw() {
  background(5, 5, 15); 

  // 1. 绘制背景视频 (最底层)
  push();
  translate(0, 0, -600); 
  scale(-3.2, 3.2); 
  imageMode(CENTER);
  tint(100, 150, 255, 80); 
  image(capture, 0, 0);
  pop();

  drawAndIdentifyFireflies();

  // 2. 渲染森林元素
  for (let i = 0; i < elements.length; i++) {
    let el = elements[i];
    let prevEl = i > 0 ? elements[i-1] : null;
    if (el.type === "star") drawStar(el);
    else if (el.type === "flower") drawFlower(el);
    else if (el.type === "butterfly") drawButterfly(el);
    else if (el.type === "vine") drawVine(el, prevEl); 
    else if (el.type === "grass") drawMagicGrass(el);
  }

  if (elements.length > 350) elements.shift();

  handleInput(); 
}

// --- 🧠 手势交互逻辑 ---
function handleInput() {
  if (handData && handData.length > 0) {
    let hand = handData[0];
    
    // 坐标映射
    let rawX = (1 - hand[8].x) * width - width / 2;
    let rawY = hand[8].y * height - height / 2;
    let thumbX = (1 - hand[4].x) * width - width / 2;
    let thumbY = hand[4].y * height - height / 2;

    smoothX += (rawX - smoothX) * 0.25;
    smoothY += (rawY - smoothY) * 0.25;
    let isPinching = dist(rawX, rawY, thumbX, thumbY) < 45;

    // 指尖引导点
    push();
    translate(smoothX, smoothY, 300); 
    noStroke();
    fill(isPinching ? color(0, 255, 255) : color(255, 255, 0, 180));
    circle(0, 0, 15);
    pop();

    let screenX = smoothX + width / 2;
    let screenY = smoothY + height / 2;

    // 绘制逻辑
    if (isPinching) {
      if (currentMode === "firefly" && frameCount % 8 === 0) createFirefly(screenX, screenY);
      else if (currentMode !== "flower" && frameCount % 3 === 0) createNew(screenX, screenY, currentMode);
    }
    // 花朵需要松开手指时生成（像开花一样）
    if (wasPinching && !isPinching && currentMode === "flower") createNew(screenX, screenY, "flower");
    
    wasPinching = isPinching;
  }
}

// --- 🌸 元素绘制函数 (保持原本的魔法效果) ---
function createNew(x, y, type) {
  let col, targetSize, angle = 0, side = random(1);
  if (type === "star") { targetSize = random(8, 22); col = color(255); } 
  else if (type === "vine") { col = color(0, 255, 150); targetSize = random(20, 35); } 
  else if (type === "flower") { col = color(random([color(255,0,127), color(191,0,255)])); targetSize = random(30, 50); } 
  else if (type === "grass") { col = color(57, 255, 20); targetSize = random(40, 75); }
  
  if (elements.length > 0) { 
    let last = elements[elements.length - 1]; 
    angle = atan2(y - last.y, x - last.x) + HALF_PI; 
  }
  elements.push({ x: x, y: y, type: type, size: 0, maxSize: targetSize, offset: random(1000), angle: angle, c: col, side: side });
}

function drawStar(el) {
  if (!imgStar) return;
  if (el.size < el.maxSize) el.size += 0.5;
  push();
  translate(el.x - width/2, el.y - height/2, 1);
  imageMode(CENTER);
  let b = sin(frameCount * 0.1 + el.offset);
  tint(255, map(b, -1, 1, 150, 255));
  image(imgStar, 0, 0, el.size, el.size);
  pop();
}

function drawMagicGrass(el) {
  if (el.size < el.maxSize) el.size += 2;
  push();
  translate(el.x - width/2, el.y - height/2, 0);
  stroke(57, 255, 20, 200);
  strokeWeight(2);
  let w = sin(frameCount * 0.05 + el.offset) * 5;
  line(0, 0, w, -el.size);
  pop();
}

function drawFlower(el) {
  if (el.size < el.maxSize) el.size += 1.5;
  push();
  translate(el.x - width/2, el.y - height/2, 2);
  fill(el.c);
  noStroke();
  for (let i = 0; i < 6; i++) {
    rotate(PI/3);
    ellipse(0, el.size/2, el.size/2, el.size);
  }
  fill(255, 200);
  circle(0,0, el.size/4);
  pop();
}

function drawVine(el, prevEl) {
  if (prevEl && prevEl.type === "vine" && dist(el.x, el.y, prevEl.x, prevEl.y) < 60) {
    push();
    stroke(0, 255, 200, 150);
    strokeWeight(2);
    line(prevEl.x - width/2, prevEl.y - height/2, 0, el.x - width/2, el.y - height/2, 0);
    pop();
  }
}

function drawButterfly(el) {
  if (!imgButterfly) return;
  if (el.size < el.maxSize) el.size += 0.5;
  el.y -= 1; // 向上飞
  push();
  translate(el.x - width/2, el.y - height/2, 5);
  let flap = sin(frameCount * 0.2 + el.offset) * 0.8;
  scale(sin(flap), 1); // 模拟扇翅膀
  imageMode(CENTER);
  image(imgButterfly, 0, 0, el.size, el.size);
  pop();
}

function createFirefly(x, y) {
  fireflies.push({ x: x, y: y, vx: random(-0.5, 0.5), vy: random(-0.5, 0.5), size: random(3, 6), offset: random(1000) });
}

function drawAndIdentifyFireflies() {
  push();
  translate(-width/2, -height/2, 50);
  for(let f of fireflies) {
    f.x += f.vx + sin(frameCount * 0.02 + f.offset) * 0.2;
    f.y += f.vy;
    fill(255, 255, 150, 200);
    noStroke();
    circle(f.x, f.y, f.size);
  }
  pop();
}
