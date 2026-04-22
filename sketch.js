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
  push();
  translate(0, 0, -700); 
  scale(-3.5, 3.5); 
  imageMode(CENTER);
  tint(80, 120, 255, 60); 
  image(capture, 0, 0);
  pop();

  drawAndIdentifyFireflies();

  // 分组绘制藤蔓以保持曲线连贯
  let vinePoints = elements.filter(el => el.type === "vine");
  if (vinePoints.length > 1) drawSmoothVine(vinePoints);

  // 绘制其他元素
  for (let el of elements) {
    if (el.type === "star") drawStar(el);
    else if (el.type === "flower") drawFlower(el);
    else if (el.type === "butterfly") drawButterfly(el);
    else if (el.type === "grass") drawMagicGrass(el);
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
    let isPinching = dist(screenX, screenY, thumbX, thumbY) < 65;

    if (screenX < 250 && isPinching && !wasPinching) {
      let idx = floor(screenY / (height / 7));
      let modes = ["grass", "flower", "vine", "butterfly", "star", "firefly"];
      if (idx >= 0 && idx < 6) setMode(modes[idx]);
      else if (idx === 6) clearCanvas();
    } 
    else if (isPinching) {
      if (currentMode === "firefly" && frameCount % 10 === 0) createFirefly(screenX, screenY);
      else if (currentMode === "butterfly" && frameCount % 25 === 0) createNew(screenX, screenY, "butterfly");
      else if (currentMode === "vine" && frameCount % 2 === 0) createNew(screenX, screenY, "vine");
      else if (currentMode !== "flower" && currentMode !== "butterfly" && currentMode !== "vine" && frameCount % 4 === 0) createNew(screenX, screenY, currentMode);
    }
    if (wasPinching && !isPinching && currentMode === "flower") createNew(screenX, screenY, "flower");
    wasPinching = isPinching;
  }
}

function createNew(x, y, type) {
  let col, targetSize, leaves = [];
  if (type === "vine") {
    col = color(0, 255, 180);
    targetSize = random(15, 25);
    // 降低叶子密度：只有 20% 的概率生成叶子
    if (random() > 0.8) {
      leaves.push({ side: random() > 0.5 ? 1 : -1, size: random(35, 60), col: color(random(0, 50), 255, random(100, 200), 200) });
    }
  } else if (type === "flower") {
    // 随机花朵主色调
    let base = random(360);
    targetSize = random(50, 85);
    col = {
      outer: color(random(100, 255), 50, 255, 180),   // 外层：紫色/蓝色系
      middle: color(255, random(100, 200), 50, 200), // 第二层：橙色/黄色系
      inner: color(255, 255, 200)                    // 中心：浅色
    };
  } else if (type === "grass") {
    col = color(0, 255, 100);
    targetSize = random(70, 110);
  } else {
    col = color(255);
    targetSize = random(20, 30);
  }
  
  elements.push({ x: x, y: y, type: type, size: 0, maxSize: targetSize, offset: random(1000), c: col, leaves: leaves });
}

// --- 🌸 核心修改：三层不同颜色的梦幻花朵 ---
function drawFlower(el) {
  if (el.size < el.maxSize) el.size += 2;
  push();
  translate(el.x - width/2, el.y - height/2, 2);
  noStroke();
  
  // 第一层：外围大花瓣
  fill(el.c.outer);
  for (let i = 0; i < 8; i++) {
    rotate(PI/4);
    ellipse(0, el.size/2, el.size/1.5, el.size);
  }
  
  // 第二层：中间稍小花瓣（不同颜色）
  fill(el.c.middle);
  for (let i = 0; i < 8; i++) {
    rotate(PI/4);
    ellipse(0, el.size/3, el.size/2.5, el.size/1.5);
  }
  
  // 第三层：中心花蕊发光
  fill(el.c.inner);
  circle(0, 0, el.size/4);
  pop();
}

// --- 🌿 核心修改：丝滑曲线藤蔓 + 心形🧡叶子 ---
function drawSmoothVine(points) {
  push();
  noFill();
  stroke(0, 255, 180, 180);
  strokeWeight(5);
  beginShape();
  // 使用 curveVertex 实现极其顺滑的曲线
  curveVertex(points[0].x - width/2, points[0].y - height/2);
  for (let p of points) {
    curveVertex(p.x - width/2, p.y - height/2);
    // 在绘制曲线的同时，记录叶子的位置
    if (p.leaves.length > 0) drawHeartLeaf(p);
  }
  curveVertex(points[points.length-1].x - width/2, points[points.length-1].y - height/2);
  endShape();
  pop();
}

function drawHeartLeaf(p) {
  push();
  translate(p.x - width/2, p.y - height/2, 1);
  let leaf = p.leaves[0];
  rotate(leaf.side * QUARTER_PI + sin(frameCount*0.02)*0.2);
  fill(leaf.col);
  noStroke();
  
  // 绘制心形🧡结构的叶子
  let s = leaf.size;
  beginShape();
  vertex(0, 0);
  bezierVertex(-s/2, -s/2, -s, s/3, 0, s);
  bezierVertex(s, s/3, s/2, -s/2, 0, 0);
  endShape(CLOSE);
  pop();
}

function drawMagicGrass(el) {
  if (el.size < el.maxSize) el.size += 3;
  push();
  translate(el.x - width/2, el.y - height/2, 0);
  let sw = sin(frameCount * 0.05 + el.offset) * 15;
  fill(0, 255, 150, 150);
  noStroke();
  beginShape();
  vertex(-10, 0);
  vertex(10, 0);
  bezierVertex(5, -el.size*0.4, sw, -el.size*0.7, sw, -el.size);
  endShape(CLOSE);
  pop();
}

function drawStar(el) {
  if (el.size < el.maxSize) el.size += 0.5;
  push();
  translate(el.x - width/2, el.y - height/2, 1);
  let b = sin(frameCount * 0.1 + el.offset);
  tint(255, 255, 150, map(b, -1, 1, 100, 255));
  image(imgStar, 0, 0, el.size, el.size);
  pop();
}

function drawButterfly(el) {
  if (!imgButterfly) return;
  if (el.size < el.maxSize) el.size += 0.5;
  el.y -= 1.2;
  el.x += sin(frameCount * 0.05 + el.offset) * 2;
  push();
  translate(el.x - width/2, el.y - height/2, 10);
  scale(sin(frameCount * 0.3 + el.offset), 1); 
  tint(200, 255, 255, 200);
  image(imgButterfly, 0, 0, el.size, el.size);
  pop();
}

function createFirefly(x, y) {
  fireflies.push({ x: x, y: y, vx: random(-0.5, 0.5), vy: random(-0.5, 0.5), size: random(4, 8), offset: random(1000), c: color(200, 255, 100) });
}

function drawAndIdentifyFireflies() {
  push();
  translate(-width/2, -height/2, 60);
  for(let f of fireflies) {
    f.x += f.vx; f.y += f.vy;
    fill(f.c); noStroke();
    circle(f.x, f.y, f.size);
  }
  pop();
}
