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
  createCanvas(640, 480, WEBGL);
  textFont(myFont);
  
  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });
  hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
  hands.onResults(results => { handData = results.multiHandLandmarks; });

  capture = createCapture(VIDEO);
  capture.size(640, 480);
  capture.hide();
  processVideo();
  
  for(let i=0; i<12; i++) createFirefly(random(width), random(height));
}

async function processVideo() {
  if (capture.elt.readyState === 4) await hands.send({ image: capture.elt });
  window.requestAnimationFrame(processVideo);
}

function draw() {
  background(5, 5, 15); 

  // 绘制背景视频
  push();
  translate(0, 0, -200); 
  scale(-1, 1);
  tint(100, 150, 255, 40); 
  imageMode(CENTER);
  image(capture, 0, 0, width, height);
  pop();

  drawAndIdentifyFireflies();

  // 绘制所有元素
  for (let i = 0; i < elements.length; i++) {
    let el = elements[i];
    let prevEl = i > 0 ? elements[i-1] : null;

    if (el.type === "star") drawStar(el);
    else if (el.type === "flower") drawFlower(el);
    else if (el.type === "butterfly") drawButterfly(el);
    else if (el.type === "vine") drawVine(el, prevEl); 
    else if (el.type === "grass") drawMagicGrass(el);
  }

  if (elements.length > 300) elements.shift();

  handleInput(); // 处理手势和引导点
  drawUI();
}

// --- ✨ 精致小星星：变小了 + 独立呼吸 ---
function drawStar(el) {
  if (!imgStar) return;
  if (el.size < el.maxSize) el.size += 0.2; // 生长速度放慢，更优雅
  
  push();
  translate(el.x - width/2, el.y - height/2, 1);
  imageMode(CENTER);
  blendMode(SCREEN); 
  
  // 呼吸 Function
  let breathe = sin(frameCount * el.blinkSpeed + el.offset);
  let alpha = map(breathe, -1, 1, 120, 255); 
  let scaleMult = map(breathe, -1, 1, 0.85, 1.15); 
  
  // 颜色在金黄与纯白间切换
  let starCol = lerpColor(color(255, 215, 0), color(255, 255, 255), map(breathe, -1, 1, 0, 1));
  
  tint(red(starCol), green(starCol), blue(starCol), alpha);
  image(imgStar, 0, 0, el.size * scaleMult, el.size * scaleMult);
  blendMode(BLEND); 
  pop();
}

// --- 🧠 核心：精准引导点与手势处理 ---
function handleInput() {
  if (handData && handData.length > 0) {
    let hand = handData[0];
    
    // 坐标校准：映射到 WEBGL 中心坐标系
    let rawX = (1 - hand[8].x) * width - width / 2;
    let rawY = hand[8].y * height - height / 2;
    let thumbX = (1 - hand[4].x) * width - width / 2;
    let thumbY = hand[4].y * height - height / 2;

    smoothX += (rawX - smoothX) * 0.25;
    smoothY += (rawY - smoothY) * 0.25;
    let isPinching = dist(rawX, rawY, thumbX, thumbY) < 40;

    // 绘制跟随手指的小点 (在最上层)
    push();
    translate(smoothX, smoothY, 130); 
    noStroke();
    if (isPinching) {
      fill(0, 255, 255); circle(0, 0, 12);
      fill(255); circle(0, 0, 6); 
    } else {
      fill(255, 180); circle(0, 0, 8);
    }
    pop();

    // 转换为 UI 检测坐标 (0-640)
    let screenX = smoothX + width / 2;
    let screenY = smoothY + height / 2;

    if (screenY < 60) {
      let idx = floor(screenX / (width / 7));
      let modes = ["grass", "flower", "vine", "butterfly", "star", "firefly", "clear"];
      if (idx === 6) { elements = []; fireflies = []; }
      else if (idx >= 0 && idx < 7) currentMode = modes[idx];
    } else {
      if (isPinching) {
        if (currentMode === "firefly" && frameCount % 8 === 0) createFirefly(screenX, screenY);
        else if (currentMode !== "flower" && frameCount % 3 === 0) createNew(screenX, screenY, currentMode);
      }
      if (wasPinching && !isPinching && currentMode === "flower") createNew(screenX, screenY, "flower");
    }
    wasPinching = isPinching;
  }
}

function createNew(x, y, type) {
  let col, targetSize, angle = 0, side = random(1), hasLeaf = true;
  let finalX = x, finalY = y;

  if (type === "star") {
    // 星星随机散开
    finalX = x + random(-50, 50);
    finalY = y + random(-50, 50);
    // 星星调小了：8 到 22 像素
    targetSize = random(8, 22); 
    col = color(255);
  } else if (type === "vine") {
    let greenPalette = [color(57, 255, 20), color(0, 255, 127), color(173, 255, 47), color(0, 255, 255), color(0, 200, 100)];
    col = random(greenPalette); targetSize = random(20, 35);
  } else if (type === "flower") {
    let palette = [color(255,0,127), color(191,0,255), color(0,255,255)];
    col = random(palette); targetSize = random(30, 50);
  } else if (type === "grass") {
    col = color(57, 255, 20); targetSize = random(40, 75);
  } else {
    col = color(255); targetSize = random(35, 50);
  }

  if (elements.length > 0) {
    let last = elements[elements.length - 1];
    angle = atan2(y - last.y, x - last.x) + HALF_PI;
  }
  
  elements.push({ 
    x: finalX, y: finalY, type: type, size: 0, maxSize: targetSize, 
    offset: random(1000), blinkSpeed: random(0.06, 0.12),
    angle: angle, c: col, hasLeaf: hasLeaf, side: side, sideOffset: random(15, 35) 
  });
}

// --- 🌿 其他绘制函数 ---
function drawMagicGrass(el) {
  if (el.size < el.maxSize) el.size += 2;
  push(); translate(el.x - width/2, el.y - height/2, 0);
  let wiggle = sin(frameCount * 0.06 + el.offset) * 6;
  noFill(); let segments = 7;
  for (let i = 0; i < segments; i++) {
    let h1 = map(i, 0, segments, 0, -el.size);
    let h2 = map(i+1, 0, segments, 0, -el.size);
    let weight = map(i, 0, segments, 4.5, 0.5); 
    let interColor = lerpColor(color(20, 0, 80), color(57, 255, 20), i/segments);
    stroke(interColor); strokeWeight(weight);
    line(pow(i/segments, 2) * wiggle, h1, pow((i+1)/segments, 2) * wiggle, h2);
  }
  pop();
}

function drawVine(el, prevEl) {
  if (prevEl && prevEl.type === "vine" && dist(el.x, el.y, prevEl.x, prevEl.y) < 65) {
    push(); stroke(0, 255, 200, 100); strokeWeight(2);
    line(prevEl.x - width/2, prevEl.y - height/2, 0, el.x - width/2, el.y - height/2, 0); pop();
  }
  if (el.hasLeaf) {
    if (el.size < el.maxSize) el.size += 2;
    push(); let offsetX = (el.side < 0.5 ? -1 : 1) * el.sideOffset;
    translate(el.x - width/2 + offsetX, el.y - height/2, 1);
    rotate(el.angle + (el.side < 0.5 ? -0.4 : 0.4)); 
    if (el.side < 0.5) scale(-1, 1);
    noStroke(); fill(red(el.c), green(el.c), blue(el.c), 220);
    beginShape(); vertex(0,0); bezierVertex(-el.size, -el.size/2, -el.size, -el.size, 0, -el.size);
    bezierVertex(el.size, -el.size, el.size, -el.size/2, 0, 0); endShape(); pop();
  }
}

function drawFlower(el) {
  if (el.size < el.maxSize) el.size += 1;
  push(); translate(el.x - width/2, el.y - height/2, 2); noStroke();
  for (let i = 0; i < 6; i++) {
    rotate(PI/3);
    for(let r = 1; r > 0; r -= 0.3) {
      fill(red(el.c)*r, 80, blue(el.c), 180 * (1-r+0.4));
      ellipse(0, (el.size * r)/2, (el.size * r)/2, el.size * r);
    }
  }
  fill(255, 255, 255); circle(0, 0, el.size/5); pop();
}

function createFirefly(x, y) {
  fireflies.push({ x: x, y: y, vx: random(-0.8, 0.8), vy: random(-0.8, 0.8), size: random(4, 7), offset: random(1000) });
}

function drawAndIdentifyFireflies() {
  push(); translate(-width/2, -height/2, 40); noStroke();
  for(let f of fireflies) {
    f.x += f.vx + sin(frameCount * 0.02 + f.offset) * 0.3;
    f.y += f.vy + cos(frameCount * 0.02 + f.offset) * 0.3;
    if (f.x < 0 || f.x > width) f.vx *= -1;
    if (f.y < 0 || f.y > height) f.vy *= -1;
    let d = dist(f.x, f.y, smoothX + width/2, smoothY + height/2);
    if (d < 70) { f.x += (f.x - (smoothX + width/2))/d * 4; f.y += (f.y - (smoothY + height/2))/d * 4; }
    blendMode(SCREEN); fill(255, 255, 100, 200); circle(f.x, f.y, f.size); blendMode(BLEND);
  }
  pop();
}

function drawButterfly(el) {
  if (!imgButterfly) return;
  if (el.size < el.maxSize) el.size += 0.5;
  el.x += sin(frameCount * 0.02 + el.offset) * 2;
  el.y -= 1;
  push(); translate(el.x - width/2, el.y - height/2, 0);
  let flap = map(sin(frameCount * 0.2 + el.offset), -1, 1, -radians(65), radians(65));
  imageMode(CENTER); blendMode(SCREEN); tint(255);
  let w = el.size * (imgButterfly.width / imgButterfly.height);
  let h = el.size;
  push(); rotateY(flap); image(imgButterfly, w/4, 0, w/2, h, imgButterfly.width/2, 0, imgButterfly.width/2, imgButterfly.height); pop();
  push(); rotateY(-flap); image(imgButterfly, -w/4, 0, w/2, h, 0, 0, imgButterfly.width/2, imgButterfly.height); pop();
  blendMode(BLEND); pop();
}

function drawUI() {
  push(); translate(-width/2, -height/2, 110); 
  let icons = ["🌱", "🌸", "🌿", "🦋", "✨", "🔥", "🗑️"];
  let labels = ["Grass", "Flower", "Vine", "Butterfly", "Star", "Firefly", "Clear"];
  let btnW = width / 7;
  for (let i = 0; i < 7; i++) {
    let isSelected = (currentMode === ["grass", "flower", "vine", "butterfly", "star", "firefly", "clear"][i]);
    fill(isSelected ? 80 : 20, 200); stroke(0, 255, 255, 100); rect(i * btnW, 0, btnW, 60);
    fill(255); noStroke(); textAlign(CENTER, CENTER); textSize(18); text(icons[i], i * btnW + btnW/2, 22);
    textSize(10); text(labels[i], i * btnW + btnW/2, 45);
  }
  pop();
}