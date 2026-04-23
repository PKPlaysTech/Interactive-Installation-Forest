let handData = [];
let elements = [];
let fireflies = [];
let currentMode = "flower";
let capture, hands, myFont;
let wasPinching = false;
let imgStar, imgButterfly;
let clearTextAlpha = 0;

// 平滑变量：解决大屏抖动
let smoothX = 0;
let smoothY = 0;
let smoothThumbX = 0;
let smoothThumbY = 0;

function preload() {
  myFont = loadFont('https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceSansPro-Bold.otf');
  imgStar = loadImage('Star.png', img => {}, err => console.warn('Star.png 找不到'));
  imgButterfly = loadImage('Butterfly.png', img => {}, err => console.warn('Butterfly.png 找不到'));
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
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
  for (let i = 0; i < 15; i++) createFirefly(random(width), random(height));
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

async function processVideo() {
  if (capture.elt.readyState === 4) await hands.send({ image: capture.elt });
  window.requestAnimationFrame(processVideo);
}

function setMode(mode) {
  currentMode = mode;
  let btns = document.getElementsByClassName('menu-btn');
  for (let btn of btns) btn.classList.remove('active');
  let target = document.getElementById('btn-' + mode);
  if (target) target.classList.add('active');
}

function clearCanvas() {
  elements = [];
  fireflies = [];
  clearTextAlpha = 255;
}

function draw() {
  background(5, 5, 20);

  // 1. 背景层
  push();
  translate(0, 0, -850);
  scale(-4.2, 4.2);
  imageMode(CENTER);
  tint(80, 120, 255, 65);
  image(capture, 0, 0);
  pop();

  drawAndIdentifyFireflies();

  // 2. 绘制森林元素
  for (let i = 0; i < elements.length; i++) {
    let el = elements[i];
    let prevEl = (i > 0) ? elements[i - 1] : null;

    if (el.type === "flower") drawFlower(el);
    else if (el.type === "vine") drawVine(el, prevEl);
    else if (el.type === "grass") drawMagicGrass(el);
    else if (el.type === "star") drawStar(el);
    else if (el.type === "butterfly") drawButterfly(el);
  }

  // 3. 视觉反馈
  drawClearFeedback();

  // ✅ 你的修复：清理飞出屏幕的蝴蝶
  elements = elements.filter(el => el.type !== 'butterfly' || el.y > -100);

  // ✅ 你的修复：高性能清理超出上限的元素
  if (elements.length > 500) { // 针对 75 寸大屏性能调优，建议保持在 500 左右
    elements.splice(0, elements.length - 500);
  }

  handleInput();
}

function handleInput() {
  if (handData && handData.length > 0) {
    let hand = handData[0];
    
    // 获取原始坐标
    let rawX = (1 - hand[8].x) * width;
    let rawY = hand[8].y * height;
    let rawThumbX = (1 - hand[4].x) * width;
    let rawThumbY = hand[4].y * height;

    // ✅ Lerp 平滑处理：解决大屏抖动感
    smoothX = lerp(smoothX, rawX, 0.3);
    smoothY = lerp(smoothY, rawY, 0.3);
    smoothThumbX = lerp(smoothThumbX, rawThumbX, 0.3);
    smoothThumbY = lerp(smoothThumbY, rawThumbY, 0.3);

    // --- 🔮 五指张开魔法清屏检测 ---
    let d1 = dist(hand[8].x, hand[8].y, hand[0].x, hand[0].y);
    let d2 = dist(hand[12].x, hand[12].y, hand[0].x, hand[0].y);
    let d3 = dist(hand[16].x, hand[16].y, hand[0].x, hand[0].y);
    let d4 = dist(hand[20].x, hand[20].y, hand[0].x, hand[0].y);

    if (d1 > 0.45 && d2 > 0.45 && d3 > 0.45 && d4 > 0.45) {
      if (elements.length > 0) clearCanvas();
      return;
    }

    // --- ✍️ 捏合绘图检测 ---
    let isPinching = dist(smoothX, smoothY, smoothThumbX, smoothThumbY) < 75;

    if (smoothX < 260 && isPinching && !wasPinching) {
      let idx = floor(smoothY / (height / 7.5));
      let modes = ["grass", "flower", "vine", "butterfly", "star", "firefly"];
      if (idx >= 0 && idx < 6) setMode(modes[idx]);
      else if (idx >= 6) clearCanvas();
    }
    else if (isPinching) {
      if (currentMode === "vine" && frameCount % 2 === 0) createNew(smoothX, smoothY, "vine");
      else if (currentMode === "firefly" && frameCount % 10 === 0) createFirefly(smoothX, smoothY);
      else if (currentMode === "butterfly" && frameCount % 30 === 0) createNew(smoothX, smoothY, "butterfly");
      else if (currentMode !== "flower" && currentMode !== "butterfly" && currentMode !== "vine" && frameCount % 4 === 0) createNew(smoothX, smoothY, currentMode);
    }

    if (wasPinching && !isPinching && currentMode === "flower") createNew(smoothX, smoothY, "flower");
    wasPinching = isPinching;
  }
}

function createNew(x, y, type) {
  let colors = [], leafData = [], targetSize = 0;

  if (type === "flower") {
    targetSize = random(25, 80);
    let h = random(360);
    colorMode(HSB, 360, 100, 100, 1);
    colors = [
      color(h, 70, 100, 0.7), color((h + 40) % 360, 60, 100, 0.8),
      color((h + 80) % 360, 40, 100, 0.9), color(0, 0, 100, 1)
    ];
    colorMode(RGB, 255, 255, 255, 255);
  } else if (type === "vine") {
    targetSize = 20;
    if (random() > 0.4) {
      leafData.push({
        side: random() > 0.5 ? 1 : -1,
        size: random(45, 85),
        angle: random(-0.3, 0.3),
        c: color(random(0, 100), 255, random(100, 200), 190)
      });
      if (random() > 0.7) {
        leafData.push({
          side: leafData[0].side * -1,
          size: random(35, 65),
          angle: random(-0.3, 0.3),
          c: color(random(0, 120), 255, random(120, 220), 160)
        });
      }
    }
  } else if (type === "grass") {
    targetSize = random(90, 140);
    colors = color(random(0, 100), 255, random(100, 200), 180);
  } else {
    targetSize = random(25, 40);
  }

  elements.push({ x: x, y: y, type: type, size: 0, maxSize: targetSize, offset: random(1000), colors: colors, leaf: leafData });
}

function drawFlower(el) {
  if (el.size < el.maxSize) el.size += 2.5;
  let breath = 1 + sin(frameCount * 0.05 + el.offset) * 0.06;
  let alphaB = map(sin(frameCount * 0.05 + el.offset), -1, 1, 160, 255);

  push();
  translate(el.x - width / 2, el.y - height / 2, 2);
  scale(breath);
  noStroke();
  for (let l = 0; l < 4; l++) {
    let c = el.colors[l];
    fill(c.levels[0], c.levels[1], c.levels[2], alphaB * (1 - l * 0.18));
    let lSize = el.size * (1 - l * 0.23);
    for (let i = 0; i < 6; i++) {
      rotate(PI / 3);
      ellipse(0, lSize / 2, lSize / 1.7, lSize);
    }
  }
  pop();
}

function drawVine(el, prevEl) {
  if (prevEl && prevEl.type === "vine" && dist(el.x, el.y, prevEl.x, prevEl.y) < 95) {
    push();
    stroke(0, 255, 200, 200);
    strokeWeight(5.5);
    line(prevEl.x - width / 2, prevEl.y - height / 2, 0, el.x - width / 2, el.y - height / 2, 0);

    if (el.leaf.length > 0) {
      for (let l of el.leaf) {
        push();
        translate(el.x - width / 2, el.y - height / 2, 1);
        rotate(l.side * PI / 3 + l.angle);
        noStroke(); fill(l.c);
        beginShape();
        vertex(0, 0);
        bezierVertex(l.size / 3, -l.size / 3, l.size / 3, -l.size / 1.5, 0, -l.size);
        bezierVertex(-l.size / 3, -l.size / 1.5, -l.size / 3, -l.size / 3, 0, 0);
        endShape(CLOSE);
        pop();
      }
    }
    pop();
  }
}

function drawMagicGrass(el) {
  if (el.size < el.maxSize) el.size += 3.5;
  push();
  translate(el.x - width / 2, el.y - height / 2, 0);
  let sw = sin(frameCount * 0.04 + el.offset) * 20;
  fill(el.colors); noStroke();
  beginShape();
  vertex(-15, 0); vertex(15, 0);
  bezierVertex(10, -el.size * 0.4, sw, -el.size * 0.8, sw, -el.size);
  endShape(CLOSE);
  pop();
}

function drawStar(el) {
  if (el.size < el.maxSize) el.size += 0.8;
  push();
  translate(el.x - width / 2, el.y - height / 2, 1);
  tint(255, 255, 200, map(sin(frameCount * 0.1 + el.offset), -1, 1, 130, 255));
  imageMode(CENTER); image(imgStar, 0, 0, el.size, el.size);
  pop();
}

function drawButterfly(el) {
  if (el.size < el.maxSize) el.size += 0.5;
  el.y -= 1.6; el.x += sin(frameCount * 0.05 + el.offset) * 3.5;
  push();
  translate(el.x - width / 2, el.y - height / 2, 10);
  scale(sin(frameCount * 0.2 + el.offset), 1);
  tint(255, 200, 255, 230);
  imageMode(CENTER); image(imgButterfly, 0, 0, el.size, el.size);
  pop();
}

function createFirefly(x, y) {
  fireflies.push({ x: x, y: y, vx: random(-0.8, 0.8), vy: random(-0.8, 0.8), size: random(6, 12), offset: random(1000) });
}

function drawAndIdentifyFireflies() {
  push();
  translate(-width / 2, -height / 2, 50);
  for (let f of fireflies) {
    f.x += f.vx; f.y += f.vy;
    if (f.x < 0 || f.x > width) f.vx *= -1;
    if (f.y < 0 || f.y > height) f.vy *= -1;
    fill(200, 255, 100, 210); noStroke(); circle(f.x, f.y, f.size);
  }
  pop();
}

function drawClearFeedback() {
  if (clearTextAlpha > 0) {
    push();
    fill(255, 255, 255, clearTextAlpha);
    textAlign(CENTER);
    textFont(myFont);
    textSize(80);
    text(" MAGIC RESET ", 0, 0);
    clearTextAlpha -= 5;
    pop();
  }
}
