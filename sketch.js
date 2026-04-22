let handData = [];
let elements = [];
let fireflies = []; 
let currentMode = "flower";
let capture, hands, myFont;
let smoothX = 0, smoothY = 0;
let wasPinching = false;
let imgStar, imgButterfly;

function preload() {
  // 加载字体和图片资源
  myFont = loadFont('https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceSansPro-Bold.otf');
  imgStar = loadImage('Star.png');
  imgButterfly = loadImage('Butterfly.png');
}

function setup() {
  // 创建自适应全屏画布
  createCanvas(windowWidth, windowHeight, WEBGL);
  textFont(myFont);
  
  // MediaPipe 手势识别配置
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

  // 摄像头配置
  capture = createCapture(VIDEO);
  capture.size(640, 480);
  capture.hide(); // 隐藏 HTML 原始视频标签
  processVideo();
  
  // 初始化萤火虫
  for(let i=0; i<12; i++) createFirefly(random(width), random(height));
}

// 窗口大小改变时自动调整
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

async function processVideo() {
  if (capture.elt.readyState === 4) await hands.send({ image: capture.elt });
  window.requestAnimationFrame(processVideo);
}

function draw() {
  background(5, 5, 15); 

  // 1. 绘制背景视频 (推远并镜像放大)
  push();
  translate(0, 0, -500); 
  scale(-2.8, 2.8); 
  imageMode(CENTER);
  tint(100, 150, 255, 60); 
  image(capture, 0, 0);
  pop();

  drawAndIdentifyFireflies();

  // 2. 渲染所有森林元素
  for (let i = 0; i < elements.length; i++) {
    let el = elements[i];
    let prevEl = i > 0 ? elements[i-1] : null;
    if (el.type === "star") drawStar(el);
    else if (el.type === "flower") drawFlower(el);
    else if (el.type === "butterfly") drawButterfly(el);
    else if (el.type === "vine") drawVine(el, prevEl); 
    else if (el.type === "grass") drawMagicGrass(el);
  }

  // 自动清理旧元素保持流畅
  if (elements.length > 350) elements.shift();

  handleInput(); 
  drawUI(); 
}

// --- 🧠 核心：手势交互与菜单检测 ---
function handleInput() {
  if (handData && handData.length > 0) {
    let hand = handData[0];
    
    // 映射手部坐标到 WEBGL 画布
    let rawX = (1 - hand[8].x) * width - width / 2;
    let rawY = hand[8].y * height - height / 2;
    let thumbX = (1 - hand[4].x) * width - width / 2;
    let thumbY = hand[4].y * height - height / 2;

    smoothX += (rawX - smoothX) * 0.25;
    smoothY += (rawY - smoothY) * 0.25;
    let isPinching = dist(rawX, rawY, thumbX, thumbY) < 45;

    // 绘制指尖引导点 (深度设为 250 确保置顶)
    push();
    translate(smoothX, smoothY, 250); 
    noStroke();
    if (isPinching) {
      fill(0, 255, 255); circle(0, 0, 16);
      fill(255); circle(0, 0, 8); 
    } else {
      fill(255, 200); circle(0, 0, 12);
    }
    pop();

    // 转换为屏幕坐标用于菜单检测
    let screenX = smoothX + width / 2;
    let screenY = smoothY + height / 2;

    // 修改：将菜单感应高度增加到 140 像素，方便触碰
    if (screenY < 140) { 
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

// --- 🌿 UI 菜单：拉低位置以确保可见 ---
function drawUI() {
  push(); 
  // 关键：将 Y 轴向下偏移 40 像素，Z 轴设为 300
  translate(-width/2, -height/2 + 40, 300); 
  
  let icons = ["🌱", "🌸", "🌿", "🦋", "✨", "🔥", "🗑️"];
  let labels = ["Grass", "Flower", "Vine", "Butterfly", "Star", "Firefly", "Clear"];
  let btnW = width / 7;
  
  for (let i = 0; i < 7; i++) {
    let isSelected = (currentMode === ["grass", "flower", "vine", "butterfly", "star", "firefly", "clear"][i]);
    
    // 绘制按钮背景
    fill(isSelected ? 50 : 25, 230); 
    stroke(0, 255, 255, 180); 
    strokeWeight(1.5);
    rect(i * btnW, 0, btnW, 95, 0, 0, 15, 15); // 加大圆角
    
    // 绘制图标
    fill(255); 
    noStroke(); 
    textAlign(CENTER, CENTER); 
    textSize(28); 
    text(icons[i], i * btnW + btnW/2, 35);
    
    // 绘制文字
    textSize(13); 
    text(labels[i], i * btnW + btnW/2, 70);
    
    // 选中后的高亮条
    if(isSelected) {
      fill(0, 255, 255);
      rect(i * btnW, 90, btnW, 5);
    }
  }
  pop();
}

// --- 元素绘制逻辑 (保持原有精华) ---
function createNew(x, y, type) {
  let col, targetSize, angle = 0, side = random(1), hasLeaf = true;
  let finalX = x, finalY = y;
  if (type === "star") { 
    finalX = x + random(-50, 50); finalY = y + random(-50, 50); 
    targetSize = random(8, 22); col = color(255); 
  } else if (type === "vine") { 
    let g = [color(57, 255, 20), color(0, 255, 127), color(173, 255, 47)]; 
    col = random(g); targetSize = random(20, 35); 
  } else if (type === "flower") { 
    let p = [color(255,0,127), color(191,0,255), color(0,255,255)]; 
    col = random(p); targetSize = random(30, 50); 
  } else if (type === "grass") { 
    col = color(57, 255, 20); targetSize = random(40, 75); 
  } else { 
    col = color(255); targetSize = random(35, 50); 
  }
  if (elements.length > 0) { 
    let last = elements[elements.length - 1]; 
    angle = atan2(y - last.y, x - last.x) + HALF_PI; 
  }
  elements.push({ x: finalX, y: finalY, type: type, size: 0, maxSize: targetSize, offset: random(1000), blinkSpeed: random(0.06, 0.12), angle: angle, c: col, hasLeaf: hasLeaf, side: side, sideOffset: random(15, 35) });
}

function drawStar(el) { 
  if (!imgStar) return; if (el.size < el.maxSize) el.size += 0.2; 
  push(); translate(el.x - width/2, el.y - height/2, 1); imageMode(CENTER); blendMode(SCREEN); 
  let b = sin(frameCount * el.blinkSpeed + el.offset); 
  tint(255, map(b, -1, 1, 100, 255)); image(imgStar, 0, 0, el.size, el.size); 
  blendMode(BLEND); pop(); 
}

function drawMagicGrass(el) { 
  if (el.size < el.maxSize) el.size += 2; 
  push(); translate(el.x - width/2, el.y - height/2, 0); 
  let w = sin(frameCount * 0.06 + el.offset) * 6; 
  for (let i = 0; i < 7; i++) { 
    let h1 = map(i, 0, 7, 0, -el.size); let h2 = map(i+1, 0, 7, 0, -el.size); 
    stroke(lerpColor(color(20,0,80), color(57,255,20), i/7)); strokeWeight(map(i,0,7,4,1)); 
    line(pow(i/7, 2) * w, h1, pow((i+1)/7, 2) * w, h2); 
  } pop(); 
}

function drawVine(el, prevEl) { 
  if (prevEl && prevEl.type === "vine" && dist(el.x, el.y, prevEl.x, prevEl.y) < 65) { 
    push(); stroke(0, 255, 200, 100); strokeWeight(2); 
    line(prevEl.x - width/2, prevEl.y - height/2, 0, el.x - width/2, el.y - height/2, 0); pop(); 
  } 
  if (el.hasLeaf) { 
    if (el.size < el.maxSize) el.size += 2; 
    push(); let off = (el.side < 0.5 ? -1 : 1) * el.sideOffset; 
    translate(el.x - width/2 + off, el.y - height/2, 1); rotate(el.angle + (el.side < 0.5 ? -0.4 : 0.4)); 
    if (el.side < 0.5) scale(-1, 1); noStroke(); fill(red(el.c), green(el.c), blue(el.c), 220); 
    beginShape(); vertex(0,0); bezierVertex(-el.size, -el.size/2, -el.size, -el.size, 0, -el.size); 
    bezierVertex(el.size, -el.size, el.size, -el.size/2, 0, 0); endShape(); pop(); 
  } 
}

function drawFlower(el) { 
  if (el.size < el.maxSize) el.size += 1; 
  push(); translate(el.x - width/2, el.y - height/2, 2); noStroke(); 
  for (let i = 0; i < 6; i++) { 
    rotate(PI/3); fill(red(el.c), 80, blue(el.c), 150); 
    ellipse(0, el.size/2, el.size/2, el.size); 
  } fill(255); circle(0, 0, el.size/5); pop(); 
}

function createFirefly(x, y) { 
  fireflies.push({ x: x, y: y, vx: random(-0.8, 0.8), vy: random(-0.8, 0.8), size: random(4, 7), offset: random(1000) }); 
}

function drawAndIdentifyFireflies() { 
  push(); translate(-width/2, -height/2, 40); noStroke(); 
  for(let f of fireflies) { 
    f.x += f.vx + sin(frameCount * 0.02 + f.offset) * 0.3; 
    f.y += f.vy + cos(frameCount * 0.02 + f.offset) * 0.3; 
    if (f.x < 0 || f.x > width) f.vx *= -1; if (f.y < 0 || f.y > height) f.vy *= -1; 
    blendMode(SCREEN); fill(255, 255, 100, 200); circle(f.x, f.y, f.size); blendMode(BLEND); 
  } pop(); 
}

function drawButterfly(el) { 
  if (!imgButterfly) return; if (el.size < el.maxSize) el.size += 0.5; 
  el.x += sin(frameCount * 0.02 + el.offset) * 2; el.y -= 1; 
  push(); translate(el.x - width/2, el.y - height/2, 0); 
  let flap = map(sin(frameCount * 0.2 + el.offset), -1, 1, -radians(65), radians(65)); 
  imageMode(CENTER); tint(255); let w = el.size * (imgButterfly.width / imgButterfly.height); 
  push(); rotateY(flap); image(imgButterfly, w/4, 0, w/2, el.size, imgButterfly.width/2, 0, imgButterfly.width/2, imgButterfly.height); pop(); 
  push(); rotateY(-flap); image(imgButterfly, -w/4, 0, w/2, el.size, 0, 0, imgButterfly.width/2, imgButterfly.height); pop(); pop(); 
}
