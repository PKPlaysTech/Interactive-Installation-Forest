let handData = [];
let elements = [];
let fireflies = []; 
let currentMode = "flower";
let capture, hands, myFont;
let smoothX = 0, smoothY = 0;
let wasPinching = false;
let imgStar, imgButterfly;
let uiLayer; // 关键：独立的 UI 渲染层

function preload() {
  myFont = loadFont('https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceSansPro-Bold.otf');
  imgStar = loadImage('Star.png');
  imgButterfly = loadImage('Butterfly.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  // 创建一个专门画 UI 的 2D 图层
  uiLayer = createGraphics(windowWidth, windowHeight);
  uiLayer.textFont(myFont);

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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  uiLayer.resizeCanvas(windowWidth, windowHeight);
}

async function processVideo() {
  if (capture.elt.readyState === 4) await hands.send({ image: capture.elt });
  window.requestAnimationFrame(processVideo);
}

function draw() {
  background(5, 5, 15); 

  // 1. 绘制 3D 森林
  push();
  translate(0, 0, -500); 
  scale(-2.8, 2.8); 
  imageMode(CENTER);
  tint(100, 150, 255, 60); 
  image(capture, 0, 0);
  pop();

  drawAndIdentifyFireflies();

  for (let i = 0; i < elements.length; i++) {
    let el = elements[i];
    let prevEl = i > 0 ? elements[i-1] : null;
    if (el.type === "star") drawStar(el);
    else if (el.type === "flower") drawFlower(el);
    else if (el.type === "butterfly") drawButterfly(el);
    else if (el.type === "vine") drawVine(el, prevEl); 
    else if (el.type === "grass") drawMagicGrass(el);
  }

  handleInput(); 

  // 2. 绘制 UI (在独立的 2D 层上画完，再贴到 3D 画布最前面)
  updateUILayer();
  push();
  translate(-width/2, -height/2, 500); // 放在所有东西最前面
  image(uiLayer, 0, 0);
  pop();
}

function updateUILayer() {
  uiLayer.clear();
  let btnH = height / 7;
  let modes = ["grass", "flower", "vine", "butterfly", "star", "firefly", "clear"];
  let labels = ["GRASS", "FLOWER", "VINE", "BUTTERFLY", "STAR", "FIREFLY", "CLEAR ALL"];
  
  for (let i = 0; i < 7; i++) {
    let isSelected = (currentMode === modes[i]);
    
    // 背景框
    uiLayer.noStroke();
    uiLayer.fill(isSelected ? 'rgba(0, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.7)');
    uiLayer.rect(0, i * btnH, 120, btnH, 0, 15, 15, 0);
    
    // 文字 Label (重点修复：大写、亮色、描边)
    uiLayer.textAlign(CENTER, CENTER);
    uiLayer.stroke(0); // 黑色描边
    uiLayer.strokeWeight(3);
    uiLayer.fill(isSelected ? '#FFFF00' : '#FFFFFF'); // 选中黄色，未选中白色
    uiLayer.textSize(16);
    uiLayer.text(labels[i], 60, i * btnH + btnH/2);
    
    // 选中状态的边框
    if (isSelected) {
      uiLayer.noFill();
      uiLayer.stroke(255, 255, 0);
      uiLayer.strokeWeight(4);
      uiLayer.rect(5, i * btnH + 5, 110, btnH - 10, 10);
    }
  }
}

function handleInput() {
  if (handData && handData.length > 0) {
    let hand = handData[0];
    let rawX = (1 - hand[8].x) * width - width / 2;
    let rawY = hand[8].y * height - height / 2;
    let thumbX = (1 - hand[4].x) * width - width / 2;
    let thumbY = hand[4].y * height - height / 2;

    smoothX += (rawX - smoothX) * 0.25;
    smoothY += (rawY - smoothY) * 0.25;
    let isPinching = dist(rawX, rawY, thumbX, thumbY) < 45;

    // 手指引导球
    push();
    translate(smoothX, smoothY, 510); // 比 UI 还要靠前
    noStroke();
    fill(isPinching ? color(0, 255, 255) : color(255, 255, 0));
    circle(0, 0, 20);
    pop();

    let screenX = smoothX + width / 2;
    let screenY = smoothY + height / 2;

    if (screenX < 120) { 
      let idx = floor(screenY / (height / 7));
      let modes = ["grass", "flower", "vine", "butterfly", "star", "firefly", "clear"];
      if (idx === 6 && isPinching) { elements = []; fireflies = []; }
      else if (idx >= 0 && idx < 6) currentMode = modes[idx];
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

// ... 辅助绘制函数 (createNew, drawStar, etc.) 保持不变 ...
function createNew(x, y, type) { let col, targetSize, angle = 0, side = random(1), hasLeaf = true; let finalX = x, finalY = y; if (type === "star") { finalX = x + random(-50, 50); finalY = y + random(-50, 50); targetSize = random(8, 22); col = color(255); } else if (type === "vine") { let g = [color(57, 255, 20), color(0, 255, 127), color(173, 255, 47)]; col = random(g); targetSize = random(20, 35); } else if (type === "flower") { let p = [color(255,0,127), color(191,0,255), color(0,255,255)]; col = random(p); targetSize = random(30, 50); } else if (type === "grass") { col = color(57, 255, 20); targetSize = random(40, 75); } else { col = color(255); targetSize = random(35, 50); } if (elements.length > 0) { let last = elements[elements.length - 1]; angle = atan2(y - last.y, x - last.x) + HALF_PI; } elements.push({ x: finalX, y: finalY, type: type, size: 0, maxSize: targetSize, offset: random(1000), blinkSpeed: random(0.06, 0.12), angle: angle, c: col, hasLeaf: hasLeaf, side: side, sideOffset: random(15, 35) }); }
function drawStar(el) { if (!imgStar) return; if (el.size < el.maxSize) el.size += 0.2; push(); translate(el.x - width/2, el.y - height/2, 1); imageMode(CENTER); blendMode(SCREEN); let b = sin(frameCount * el.blinkSpeed + el.offset); tint(255, map(b, -1, 1, 100, 255)); image(imgStar, 0, 0, el.size, el.size); blendMode(BLEND); pop(); }
function drawMagicGrass(el) { if (el.size < el.maxSize) el.size += 2; push(); translate(el.x - width/2, el.y - height/2, 0); let w = sin(frameCount * 0.06 + el.offset) * 6; for (let i = 0; i < 7; i++) { let h1 = map(i, 0, 7, 0, -el.size); let h2 = map(i+1, 0, 7, 0, -el.size); stroke(lerpColor(color(20,0,80), color(57,255,20), i/7)); strokeWeight(map(i,0,7,4,1)); line(pow(i/7, 2) * w, h1, pow((i+1)/7, 2) * w, h2); } pop(); }
function drawVine(el, prevEl) { if (prevEl && prevEl.type === "vine" && dist(el.x, el.y, prevEl.x, prevEl.y) < 65) { push(); stroke(0, 255, 200, 100); strokeWeight(2); line(prevEl.x - width/2, prevEl.y - height/2, 0, el.x - width/2, el.y - height/2, 0); pop(); } if (el.hasLeaf) { if (el.size < el.maxSize) el.size += 2; push(); let off = (el.side < 0.5 ? -1 : 1) * el.sideOffset; translate(el.x - width/2 + off, el.y - height/2, 1); rotate(el.angle + (el.side < 0.5 ? -0.4 : 0.4)); if (el.side < 0.5) scale(-1, 1); noStroke(); fill(red(el.c), green(el.c), blue(el.c), 220); beginShape(); vertex(0,0); bezierVertex(-el.size, -el.size/2, -el.size, -el.size, 0, -el.size); bezierVertex(el.size, -el.size, el.size, -el.size/2, 0, 0); endShape(); pop(); } }
function drawFlower(el) { if (el.size < el.maxSize) el.size += 1; push(); translate(el.x - width/2, el.y - height/2, 2); noStroke(); for (let i = 0; i < 6; i++) { rotate(PI/3); fill(red(el.c), 80, blue(el.c), 150); ellipse(0, el.size/2, el.size/2, el.size); } fill(255); circle(0, 0, el.size/5); pop(); }
function createFirefly(x, y) { fireflies.push({ x: x, y: y, vx: random(-0.8, 0.8), vy: random(-0.8, 0.8), size: random(4, 7), offset: random(1000) }); }
function drawAndIdentifyFireflies() { push(); translate(-width/2, -height/2, 40); noStroke(); for(let f of fireflies) { f.x += f.vx + sin(frameCount * 0.02 + f.offset) * 0.3; f.y += f.vy + cos(frameCount * 0.02 + f.offset) * 0.3; if (f.x < 0 || f.x > width) f.vx *= -1; if (f.y < 0 || f.y > height) f.vy *= -1; blendMode(SCREEN); fill(255, 255, 100, 200); circle(f.x, f.y, f.size); blendMode(BLEND); } pop(); }
function drawButterfly(el) { if (!imgButterfly) return; if (el.size < el.maxSize) el.size += 0.5; el.x += sin(frameCount * 0.02 + el.offset) * 2; el.y -= 1; push(); translate(el.x - width/2, el.y - height/2, 0); let flap = map(sin(frameCount * 0.2 + el.offset), -1, 1, -radians(65), radians(65)); imageMode(CENTER); tint(255); let w = el.size * (imgButterfly.width / imgButterfly.height); push(); rotateY(flap); image(imgButterfly, w/4, 0, w/2, el.size, imgButterfly.width/2, 0, imgButterfly.width/2, imgButterfly.height); pop(); push(); rotateY(-flap); image(imgButterfly, -w/4, 0, w/2, el.size, 0, 0, imgButterfly.width/2, imgButterfly.height); pop(); pop(); }
