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
  
  for(let i=0; i<15; i++) createFirefly(random(width), random(height));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

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

function clearCanvas() {
  elements = [];
  fireflies = [];
}

function draw() {
  background(5, 5, 20); 

  // 1. 背景视频
  push();
  translate(0, 0, -700); 
  scale(-3.5, 3.5); 
  imageMode(CENTER);
  tint(80, 120, 255, 60); 
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

  if (elements.length > 400) elements.shift();

  handleInput(); 
}

function handleInput() {
  if (handData && handData.length > 0) {
    let hand = handData[0];
    
    // 映射到屏幕坐标
    let screenX = (1 - hand[8].x) * width;
    let screenY = hand[8].y * height;
    
    // 转换为 WEBGL 坐标用于后续计算
    let webglX = screenX - width / 2;
    let webglY = screenY - height / 2;
    
    let thumbX = (1 - hand[4].x) * width;
    let thumbY = hand[4].y * height;

    smoothX += (webglX - smoothX) * 0.25;
    smoothY += (webglY - smoothY) * 0.25;
    
    let isPinching = dist(screenX, screenY, thumbX, thumbY) < 60;

    // --- 修复：大屏按钮选择逻辑 ---
    // 如果手指在左侧区域且执行了捏合动作
    if (screenX < 250 && isPinching && !wasPinching) {
      let btnH = height / 7;
      let idx = floor(screenY / btnH);
      let modes = ["grass", "flower", "vine", "butterfly", "star", "firefly"];
      if (idx >= 0 && idx < 6) setMode(modes[idx]);
      else if (idx === 6) clearCanvas();
    } 
    // --- 绘制逻辑 ---
    else if (isPinching) {
      if (currentMode === "firefly" && frameCount % 10 === 0) createFirefly(screenX, screenY);
      else if (currentMode === "butterfly" && frameCount % 20 === 0) createNew(screenX, screenY, "butterfly");
      else if (currentMode !== "flower" && currentMode !== "butterfly" && frameCount % 4 === 0) createNew(screenX, screenY, currentMode);
    }

    if (wasPinching && !isPinching && currentMode === "flower") createNew(screenX, screenY, "flower");
    
    wasPinching = isPinching;
  }
}

function createNew(x, y, type) {
  let col, targetSize, leaves = [];
  
  if (type === "star") {
    targetSize = random(10, 25);
    col = color(255, 255, 200);
  } else if (type === "vine") {
    // 霓虹绿、青色系列
    col = color(random([0, 50]), 255, random([150, 255]));
    targetSize = random(15, 30);
    // 随机生成叶子数据
    if (random() > 0.4) {
      leaves.push({
        side: random() > 0.5 ? 1 : -1,
        size: random(5, 15),
        col: color(random(0, 100), 255, random(100, 200))
      });
    }
  } else if (type === "flower") {
    // 梦幻霓虹色渐变
    col = color(random(150, 255), random(50, 255), random(200, 255));
    targetSize = random(40, 70);
  } else if (type === "grass") {
    col = color(random(50, 150), 255, 50);
    targetSize = random(60, 100);
  } else if (type === "butterfly") {
    targetSize = random(15, 25); // 蝴蝶变小
  }
  
  elements.push({ 
    x: x, y: y, 
    type: type, 
    size: 0, 
    maxSize: targetSize, 
    offset: random(1000), 
    c: col,
    leaves: leaves
  });
}

function drawStar(el) {
  if (el.size < el.maxSize) el.size += 0.5;
  push();
  translate(el.x - width/2, el.y - height/2, 1);
  imageMode(CENTER);
  let b = sin(frameCount * 0.1 + el.offset);
  tint(el.c.levels[0], el.c.levels[1], el.c.levels[2], map(b, -1, 1, 100, 255));
  image(imgStar, 0, 0, el.size, el.size);
  pop();
}

function drawMagicGrass(el) {
  if (el.size < el.maxSize) el.size += 3;
  push();
  translate(el.x - width/2, el.y - height/2, 0);
  let sw = sin(frameCount * 0.05 + el.offset) * 10;
  noStroke();
  // 霓虹渐变感：底部宽，顶部尖
  fill(el.c.levels[0], el.c.levels[1], el.c.levels[2], 180);
  beginShape();
  vertex(-8, 0); // 底部左
  vertex(8, 0);  // 底部右
  bezierVertex(5, -el.size*0.3, sw, -el.size*0.6, sw, -el.size); // 尖端
  endShape(CLOSE);
  pop();
}

function drawFlower(el) {
  if (el.size < el.maxSize) el.size += 2;
  push();
  translate(el.x - width/2, el.y - height/2, 2);
  noStroke();
  for (let i = 0; i < 6; i++) {
    rotate(PI/3);
    // 梦幻渐变感：花瓣带一点透明度和颜色交替
    fill(el.c.levels[0], el.c.levels[1], el.c.levels[2], 150);
    ellipse(0, el.size/2, el.size/2, el.size);
    fill(255, 255, 255, 100);
    ellipse(0, el.size/2, el.size/4, el.size/1.5);
  }
  // 花蕊发光
  fill(255, 255, 0, 200);
  circle(0, 0, el.size/4);
  pop();
}

function drawVine(el, prevEl) {
  if (prevEl && prevEl.type === "vine" && dist(el.x, el.y, prevEl.x, prevEl.y) < 80) {
    push();
    stroke(el.c);
    strokeWeight(3);
    line(prevEl.x - width/2, prevEl.y - height/2, 0, el.x - width/2, el.y - height/2, 0);
    
    // 绘制随机小叶子
    if (el.leaves.length > 0) {
      for (let leaf of el.leaves) {
        push();
        translate(el.x - width/2, el.y - height/2, 1);
        rotate(leaf.side * QUARTER_PI);
        noStroke();
        fill(leaf.col);
        ellipse(leaf.side * 10, 0, leaf.size, leaf.size/2);
        pop();
      }
    }
    pop();
  }
}

function drawButterfly(el) {
  if (!imgButterfly) return;
  if (el.size < el.maxSize) el.size += 0.5;
  el.y -= 1.5;
  el.x += sin(frameCount * 0.05 + el.offset) * 2;
  push();
  translate(el.x - width/2, el.y - height/2, 10);
  let flap = sin(frameCount * 0.3 + el.offset);
  scale(flap, 1); 
  tint(200, 255, 255, 230);
  imageMode(CENTER);
  image(imgButterfly, 0, 0, el.size, el.size);
  pop();
}

function createFirefly(x, y) {
  fireflies.push({ 
    x: x, y: y, 
    vx: random(-0.8, 0.8), vy: random(-0.8, 0.8), 
    size: random(4, 8), 
    offset: random(1000),
    c: color(random(150, 255), 255, random(150, 255))
  });
}

function drawAndIdentifyFireflies() {
  push();
  translate(-width/2, -height/2, 60);
  for(let f of fireflies) {
    f.x += f.vx + sin(frameCount * 0.02 + f.offset) * 0.5;
    f.y += f.vy;
    if(f.x < 0 || f.x > width) f.vx *= -1;
    if(f.y < 0 || f.y > height) f.vy *= -1;
    
    // 萤火虫发光效果
    fill(f.c.levels[0], f.c.levels[1], f.c.levels[2], 200);
    noStroke();
    circle(f.x, f.y, f.size);
    fill(255, 255, 255, 150);
    circle(f.x, f.y, f.size/2);
  }
  pop();
}
