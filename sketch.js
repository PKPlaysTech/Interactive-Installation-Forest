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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

async function processVideo() {
  if (capture.elt.readyState === 4) await hands.send({ image: capture.elt });
  window.requestAnimationFrame(processVideo);
}

function draw() {
  background(5, 5, 15); 

  // 1. 绘制背景视频 (放在最远处)
  push();
  translate(0, 0, -800); 
  scale(-3.5, 3.5); 
  imageMode(CENTER);
  tint(100, 150, 255, 60); 
  image(capture, 0, 0);
  pop();

  drawAndIdentifyFireflies();

  // 2. 渲染森林元素
  for (let el of elements) {
    if (el.type === "star") drawStar(el);
    else if (el.type === "flower") drawFlower(el);
    else if (el.type === "butterfly") drawButterfly(el);
    else if (el.type === "vine") drawVine(el, elements[elements.indexOf(el)-1]); 
    else if (el.type === "grass") drawMagicGrass(el);
  }

  handleInput(); 
  
  // 3. --- 核心实验：在屏幕正中间绘制一个 Label ---
  drawCenterUI();
}

function drawCenterUI() {
  push();
  // 将 UI 放在屏幕中心稍微靠上的位置，深度设为 400 (非常靠前)
  translate(0, -height/2 + 100, 400); 
  
  // 绘制半透明黑色背景矩形
  fill(0, 180);
  noStroke();
  rectMode(CENTER);
  rect(0, 0, 200, 50, 10);
  
  // 绘制文字
  textAlign(CENTER, CENTER);
  fill(255, 255, 0); // 鲜黄色
  textSize(24);
  text("MODE: " + currentMode.toUpperCase(), 0, 0);
  pop();
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

    // --- 在指尖上方也画一个 Label ---
    push();
    translate(smoothX, smoothY, 450); 
    fill(255, 255, 0);
    noStroke();
    ellipse(0, 0, 15); // 指尖小球
    
    // 指尖文字
    textSize(18);
    textAlign(CENTER);
    stroke(0);
    strokeWeight(3);
    text(currentMode.toUpperCase(), 0, -30);
    pop();

    let screenX = smoothX + width / 2;
    let screenY = smoothY + height / 2;

    // 交互逻辑：如果手指靠近屏幕底部，就切换模式
    if (screenY > height - 100 && isPinching && frameCount % 20 === 0) {
       let modes = ["grass", "flower", "vine", "butterfly", "star", "firefly"];
       let currentIdx = modes.indexOf(currentMode);
       currentMode = modes[(currentIdx + 1) % modes.length];
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

// ... 其余绘制函数（createNew, drawStar 等）请保持不变 ...
function createNew(x, y, type) { let col, targetSize, angle = 0; let finalX = x, finalY = y; if (type === "star") { finalX = x + random(-50, 50); finalY = y + random(-50, 50); targetSize = random(8, 22); col = color(255); } else if (type === "vine") { col = color(57, 255, 20); targetSize = random(20, 35); } else if (type === "flower") { col = color(255,0,127); targetSize = random(30, 50); } else if (type === "grass") { col = color(57, 255, 20); targetSize = random(40, 75); } else { col = color(255); targetSize = random(35, 50); } elements.push({ x: finalX, y: finalY, type: type, size: 0, maxSize: targetSize, offset: random(1000), blinkSpeed: random(0.06, 0.12), c: col }); }
function drawStar(el) { if (!imgStar) return; if (el.size < el.maxSize) el.size += 0.2; push(); translate(el.x - width/2, el.y - height/2, 1); imageMode(CENTER); tint(255, 200); image(imgStar, 0, 0, el.size, el.size); pop(); }
function drawMagicGrass(el) { if (el.size < el.maxSize) el.size += 2; push(); translate(el.x - width/2, el.y - height/2, 0); stroke(57, 255, 20); strokeWeight(2); line(0, 0, 0, -el.size); pop(); }
function drawVine(el, prevEl) { if (el.size < el.maxSize) el.size += 2; push(); translate(el.x - width/2, el.y - height/2, 1); noStroke(); fill(el.c); ellipse(0,0, 10, 10); pop(); }
function drawFlower(el) { if (el.size < el.maxSize) el.size += 1; push(); translate(el.x - width/2, el.y - height/2, 2); fill(el.c); noStroke(); circle(0,0, el.size); pop(); }
function createFirefly(x, y) { fireflies.push({ x: x, y: y, vx: random(-1, 1), vy: random(-1, 1), size: random(3, 6), offset: random(1000) }); }
function drawAndIdentifyFireflies() { push(); translate(-width/2, -height/2, 40); for(let f of fireflies) { f.x += f.vx; f.y += f.vy; fill(255, 255, 0, 200); noStroke(); circle(f.x, f.y, f.size); } pop(); }
function drawButterfly(el) { if (!imgButterfly) return; if (el.size < el.maxSize) el.size += 0.5; push(); translate(el.x - width/2, el.y - height/2, 0); tint(255); image(imgButterfly, 0, 0, el.size, el.size); pop(); }
