"use strict";

const GAME_STATE = {
  START: "start",
  PLAYING: "playing",
  WIN: "win",
  LOSE: "lose"
};

const levelOne = {
  id: 1,
  name: "Level 1",
  orbs: 5
};


const PEG_SHAPES = {
  L: [
    { x: -3, y: 0 }, { x: -3, y: 1 }, { x: -3, y: 2 }, { x: -3, y: 3 }, { x: -3, y: 4 },
    { x: -2, y: 4 }, { x: -1, y: 4 }, { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 },
    { x: 3, y: 4 }, { x: -2, y: 3 }, { x: -1, y: 3 }, { x: 0, y: 3 }, { x: 1, y: 3 }
  ],
  T: [
    { x: -3, y: 0 }, { x: -2, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 },
    { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
    { x: 0, y: 4 }, { x: -1, y: 2 }, { x: 1, y: 2 }, { x: -1, y: 4 }, { x: 1, y: 4 }
  ],
  F: [
    { x: -3, y: 0 }, { x: -3, y: 1 }, { x: -3, y: 2 }, { x: -3, y: 3 }, { x: -3, y: 4 },
    { x: -2, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 },
    { x: -2, y: 2 }, { x: -1, y: 2 }, { x: 0, y: 2 },
    { x: -2, y: 4 }, { x: -1, y: 4 }
  ]
};

const ui = {
  startMenu: document.getElementById("start-menu"),
  optionsPanel: document.getElementById("options-panel"),
  playBtn: document.getElementById("play-btn"),
  settingsBtn: document.getElementById("settings-btn"),
  resetBtn: document.getElementById("reset-btn"),
  nextPlayBtn: document.getElementById("next-play-btn"),
  musicToggleBtn: document.getElementById("music-toggle-btn"),
  sfxToggleBtn: document.getElementById("sfx-toggle-btn"),
  musicStatus: document.getElementById("music-status"),
  sfxStatus: document.getElementById("sfx-status"),
  gameTitle: document.querySelector("#game-container h2"),
  canvas: document.getElementById("game-canvas")
};

const ctx = ui.canvas.getContext("2d");

const game = {
  state: GAME_STATE.START,
  levelNumber: 1,
  orbsLeft: levelOne.orbs,
  score: 0,
  musicEnabled: true,
  sfxEnabled: true,
  pegs: [],
  currentPegLayout: [],
  projectile: { x: 180, y: 70, r: 8, vx: 0, vy: 0, inMotion: false },
  bucket: { x: 140, y: 602, w: 84, h: 14, vx: 130 },
  aiming: false,
  aimPoint: { x: 180, y: 300 },
  gravity: 900,
  launchSpeed: 540,
  bounceDamping: 0.92,
  floorLine: 640,
  pegAutoRemoveMs: 5000,
  nowMs: 0,
  lastTime: 0,
  lastMessage: "Press Play to begin."
};

function resetLevel(randomizeLayout) {
  game.orbsLeft = levelOne.orbs;
  game.score = 0;
  if (randomizeLayout || game.currentPegLayout.length === 0) {
    game.currentPegLayout = createPegLayoutForLevel(game.levelNumber);
  }
  game.pegs = game.currentPegLayout.map((peg) => ({
    ...peg,
    hitThisTurn: false,
    hitAtMs: null
  }));
  game.projectile = {
    x: ui.canvas.width / 2,
    y: 68,
    r: 8,
    vx: 0,
    vy: 0,
    inMotion: false
  };
  game.aiming = false;
  game.aimPoint = { x: ui.canvas.width / 2, y: 220 };
  game.bucket = {
    x: (ui.canvas.width - 84) / 2,
    y: ui.canvas.height - 28,
    w: 84,
    h: 14,
    vx: 130
  };
  game.floorLine = ui.canvas.height;
  game.lastMessage = "Tap the board to launch the orb.";
}

function createPegLayoutForLevel(levelNumber) {
  const shapeNames = Object.keys(PEG_SHAPES);
  const shapeName = shapeNames[(levelNumber - 1) % shapeNames.length];
  const shape = PEG_SHAPES[shapeName];
  const pegCount = getPegCountForLevel(levelNumber);
  const spacing = 34;
  const centerX = ui.canvas.width / 2;
  const startY = 170;

  const rotatedShape = rotateArray(shape, levelNumber - 1).slice(0, pegCount);
  const typePool = getTypePoolForCount(rotatedShape.length);
  const pegs = [];

  for (let i = 0; i < rotatedShape.length; i += 1) {
    const point = rotatedShape[i];
    const type = typePool[i];
    pegs.push({
      x: centerX + point.x * spacing,
      y: startY + point.y * spacing,
      r: type === "normal" ? 14 : 15,
      type,
      active: true
    });
  }

  return pegs;
}

function getPegCountForLevel(levelNumber) {
  return 10 + ((levelNumber * 3) % 16);
}

function getTypePoolForCount(total) {
  let normalCount = Math.max(1, Math.round(total * 0.6));
  let targetCount = Math.max(1, Math.round(total * 0.3));
  let specialCount = total - normalCount - targetCount;

  if (specialCount < 1) {
    specialCount = 1;
  }

  while (normalCount + targetCount + specialCount > total) {
    if (normalCount >= targetCount && normalCount > 1) {
      normalCount -= 1;
    } else if (targetCount > 1) {
      targetCount -= 1;
    } else if (specialCount > 1) {
      specialCount -= 1;
    } else {
      break;
    }
  }

  const types = [
    ...Array(normalCount).fill("normal"),
    ...Array(targetCount).fill("target"),
    ...Array(specialCount).fill("special")
  ];

  // Mezcla simple para repartir colores en la forma.
  for (let i = types.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = types[i];
    types[i] = types[j];
    types[j] = temp;
  }

  return types;
}

function rotateArray(array, steps) {
  if (array.length === 0) {
    return [];
  }
  const offset = ((steps % array.length) + array.length) % array.length;
  return array.slice(offset).concat(array.slice(0, offset));
}

function setState(nextState) {
  game.state = nextState;
  updateScreenVisibility();
  updateTitleByState();
  updateActionButtons();
  render();
}

function updateScreenVisibility() {
  const showStartMenu = game.state === GAME_STATE.START;
  ui.startMenu.hidden = !showStartMenu;

  const showGame = game.state !== GAME_STATE.START;
  const gameContainer = document.getElementById("game-container");
  if (gameContainer) {
    gameContainer.hidden = !showGame;
  }
}

function updateTitleByState() {
  if (game.state === GAME_STATE.START) {
    ui.gameTitle.textContent = "Lantern Festival";
    return;
  }

  if (game.state === GAME_STATE.PLAYING) {
    ui.gameTitle.textContent = "Lantern Festival";
    return;
  }

  if (game.state === GAME_STATE.WIN) {
    ui.gameTitle.textContent = "Lantern Festival";
    return;
  }

  ui.gameTitle.textContent = "Lantern Festival";
}

function updateActionButtons() {
  if (!ui.nextPlayBtn) {
    return;
  }
  ui.nextPlayBtn.disabled = game.state !== GAME_STATE.WIN;
  ui.nextPlayBtn.textContent = `Play Again`;
}

function getRemainingSeals() {
  return game.pegs.filter((peg) => peg.active && peg.type === "target").length;
}

function getPegColor(type) {
  if (type === "normal") {
    return "#3f8cff";
  }
  if (type === "target") {
    return "#ff9b2f";
  }
  return "#35c26b";
}

function launchOrbFromPoint(x, y) {
  if (game.state !== GAME_STATE.PLAYING || game.projectile.inMotion) {
    return;
  }

  if (game.orbsLeft <= 0) {
    setState(GAME_STATE.LOSE);
    return;
  }

  const launchVector = getLaunchVector(x, y);
  if (!launchVector) {
    return;
  }

  game.projectile.vx = launchVector.vx;
  game.projectile.vy = launchVector.vy;
  game.projectile.inMotion = true;
  game.aiming = false;
  game.orbsLeft -= 1;
  game.lastMessage = "Orb launched.";
}

function getLaunchVector(x, y) {
  const dx = x - game.projectile.x;
  const dy = y - game.projectile.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) {
    return null;
  }

  const nx = dx / length;
  const ny = dy / length;
  return {
    vx: nx * game.launchSpeed,
    vy: ny * game.launchSpeed
  };
}

function evaluateRoundResult() {
  const remaining = getRemainingSeals();
  if (remaining === 0) {
    game.lastMessage = "Victory: all target pegs cleared.";
    setState(GAME_STATE.WIN);
    return;
  }

  if (game.orbsLeft <= 0) {
    game.lastMessage = "Defeat: you ran out of orbs.";
    setState(GAME_STATE.LOSE);
  }
}

function getPointerPosition(event) {
  const rect = ui.canvas.getBoundingClientRect();
  const touch = event.touches && event.touches[0] ? event.touches[0] : event;
  const scaleX = ui.canvas.width / rect.width;
  const scaleY = ui.canvas.height / rect.height;
  return {
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top) * scaleY
  };
}

function updatePhysics(dt) {
  updateBucket(dt);
  removeExpiredHitPegs();

  const orb = game.projectile;
  if (!orb.inMotion) {
    return;
  }

  orb.vy += game.gravity * dt;
  orb.x += orb.vx * dt;
  orb.y += orb.vy * dt;

  handleWallBounce(orb);
  handlePegCollisions(orb);

  if (isOrbInsideBucket(orb)) {
    endTurn(true);
    return;
  }

  if (orb.y - orb.r > game.floorLine) {
    endTurn(false);
  }
}

function handleWallBounce(orb) {
  if (orb.x - orb.r <= 0) {
    orb.x = orb.r;
    orb.vx = Math.abs(orb.vx) * game.bounceDamping;
  }

  if (orb.x + orb.r >= ui.canvas.width) {
    orb.x = ui.canvas.width - orb.r;
    orb.vx = -Math.abs(orb.vx) * game.bounceDamping;
  }

  if (orb.y - orb.r <= 0) {
    orb.y = orb.r;
    orb.vy = Math.abs(orb.vy) * game.bounceDamping;
  }
}

function handlePegCollisions(orb) {
  resolvePegCollisions(orb, game.pegs, true);
}

function resolvePegCollisions(orb, pegs, markHit) {
  for (const peg of pegs) {
    if (!peg.active) {
      continue;
    }

    const dx = orb.x - peg.x;
    const dy = orb.y - peg.y;
    const distance = Math.hypot(dx, dy);
    const minDistance = orb.r + peg.r;

    if (distance >= minDistance) {
      continue;
    }

    if (markHit) {
      peg.hitThisTurn = true;
      if (peg.hitAtMs === null) {
        peg.hitAtMs = game.nowMs;
      }
    }

    const nx = distance === 0 ? 1 : dx / distance;
    const ny = distance === 0 ? 0 : dy / distance;
    const overlap = minDistance - distance;

    orb.x += nx * overlap;
    orb.y += ny * overlap;

    const dot = orb.vx * nx + orb.vy * ny;
    orb.vx = (orb.vx - 2 * dot * nx) * game.bounceDamping;
    orb.vy = (orb.vy - 2 * dot * ny) * game.bounceDamping;
  }
}

function updateBucket(dt) {
  const bucket = game.bucket;
  bucket.x += bucket.vx * dt;

  if (bucket.x <= 0) {
    bucket.x = 0;
    bucket.vx = Math.abs(bucket.vx);
  }

  if (bucket.x + bucket.w >= ui.canvas.width) {
    bucket.x = ui.canvas.width - bucket.w;
    bucket.vx = -Math.abs(bucket.vx);
  }
}

function isOrbInsideBucket(orb) {
  const bucket = game.bucket;
  const orbBottom = orb.y + orb.r;
  const isAtBucketHeight = orbBottom >= bucket.y && orb.y - orb.r <= bucket.y + bucket.h;
  const isInsideX = orb.x >= bucket.x && orb.x <= bucket.x + bucket.w;
  const goingDown = orb.vy > 0;
  return isAtBucketHeight && isInsideX && goingDown;
}

function endTurn(bucketCatch) {
  const turnScore = clearHitPegsAndScore();
  resetProjectile();

  if (bucketCatch) {
    game.orbsLeft += 1;
    game.lastMessage = `Receptáculo rúnico: recuperaste 1 tiro. +${turnScore} pts`;
  } else if (turnScore > 0) {
    game.lastMessage = `Fin de turno: +${turnScore} puntos.`;
  } else {
    game.lastMessage = "End of turn: no pegs hit.";
  }

  evaluateRoundResult();
}

function clearHitPegsAndScore() {
  let earned = 0;
  for (const peg of game.pegs) {
    if (peg.hitThisTurn) {
      peg.active = false;
      peg.hitThisTurn = false;
      peg.hitAtMs = null;
      earned += getPegPoints(peg.type);
    }
  }
  game.score += earned;
  return earned;
}

function removeExpiredHitPegs() {
  for (const peg of game.pegs) {
    if (!peg.active || !peg.hitThisTurn || peg.hitAtMs === null) {
      continue;
    }
    if (game.nowMs - peg.hitAtMs >= game.pegAutoRemoveMs) {
      peg.active = false;
      peg.hitThisTurn = false;
      peg.hitAtMs = null;
    }
  }
}

function getPegPoints(type) {
  if (type === "normal") {
    return 10;
  }
  if (type === "target") {
    return 50;
  }
  return 25;
}

function resetProjectile() {
  game.projectile.x = ui.canvas.width / 2;
  game.projectile.y = 68;
  game.projectile.vx = 0;
  game.projectile.vy = 0;
  game.projectile.inMotion = false;
  game.aiming = false;
}

function drawBoard() {
  ctx.clearRect(0, 0, ui.canvas.width, ui.canvas.height);

  ctx.fillStyle = "#10101a";
  ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

  ctx.fillStyle = "#b7bbcc";
  ctx.font = "bold 14px Segoe UI";
  ctx.textAlign = "left";
  ctx.fillText(`Shots: ${game.orbsLeft}`, 12, 24);
  ctx.fillText(`Targets: ${getRemainingSeals()}`, 12, 44);
  ctx.textAlign = "right";
  ctx.fillText(`Score: ${game.score}`, ui.canvas.width - 12, 24);
  ctx.textAlign = "start";

  for (const peg of game.pegs) {
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
    ctx.fillStyle = peg.active ? getPegColor(peg.type) : "#3a3d4f";
    ctx.fill();
    ctx.closePath();

    if (peg.hitThisTurn && peg.active) {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.r + 3, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.closePath();
    }
  }

  ctx.beginPath();
  ctx.arc(game.projectile.x, game.projectile.y, game.projectile.r, 0, Math.PI * 2);
  ctx.fillStyle = "#f0f1f6";
  ctx.fill();
  ctx.closePath();

  if (game.aiming && game.state === GAME_STATE.PLAYING && !game.projectile.inMotion) {
    drawPredictedTrajectory();
  }

  ctx.fillStyle = "#d4b06a";
  ctx.fillRect(game.bucket.x, game.bucket.y, game.bucket.w, game.bucket.h);
  ctx.strokeStyle = "#f0d28f";
  ctx.lineWidth = 2;
  ctx.strokeRect(game.bucket.x, game.bucket.y, game.bucket.w, game.bucket.h);
}

function drawPredictedTrajectory() {
  const launchVector = getLaunchVector(game.aimPoint.x, game.aimPoint.y);
  if (!launchVector) {
    return;
  }

  const virtualOrb = {
    x: game.projectile.x,
    y: game.projectile.y,
    r: game.projectile.r,
    vx: launchVector.vx,
    vy: launchVector.vy
  };

  const points = [{ x: virtualOrb.x, y: virtualOrb.y }];
  const step = 1 / 120;
  const maxSteps = 220;

  for (let i = 0; i < maxSteps; i += 1) {
    virtualOrb.vy += game.gravity * step;
    virtualOrb.x += virtualOrb.vx * step;
    virtualOrb.y += virtualOrb.vy * step;

    points.push({ x: virtualOrb.x, y: virtualOrb.y });

    if (hasWallCollision(virtualOrb) || hasPegCollision(virtualOrb, game.pegs)) {
      break;
    }

    if (virtualOrb.y - virtualOrb.r > game.floorLine) {
      break;
    }
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = "#f0f1f6";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.closePath();
}

function hasWallCollision(orb) {
  return (
    orb.x - orb.r <= 0 ||
    orb.x + orb.r >= ui.canvas.width ||
    orb.y - orb.r <= 0
  );
}

function hasPegCollision(orb, pegs) {
  for (const peg of pegs) {
    if (!peg.active) {
      continue;
    }
    const dx = orb.x - peg.x;
    const dy = orb.y - peg.y;
    if (Math.hypot(dx, dy) <= orb.r + peg.r) {
      return true;
    }
  }
  return false;
}

function renderOverlay() {
  if (game.state !== GAME_STATE.WIN && game.state !== GAME_STATE.LOSE) {
    return;
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText(game.state === GAME_STATE.WIN ? "VICTORY" : "DEFEAT", ui.canvas.width / 2, ui.canvas.height / 2 - 8);
  ctx.font = "16px Segoe UI";
  ctx.fillText("Press Play Again to retry", ui.canvas.width / 2, ui.canvas.height / 2 + 26);
  ctx.textAlign = "start";
}

function render() {
  drawBoard();
  renderOverlay();
}

function gameLoop(timestamp) {
  game.nowMs = timestamp;
  const rawDt = (timestamp - game.lastTime) / 1000;
  const dt = Math.min(rawDt || 0, 0.033);
  game.lastTime = timestamp;

  if (game.state === GAME_STATE.PLAYING) {
    updatePhysics(dt);
  }

  render();
  requestAnimationFrame(gameLoop);
}

function toggleOptions() {
  const isHidden = ui.optionsPanel.hidden;
  ui.optionsPanel.hidden = !isHidden;
  ui.settingsBtn.setAttribute("aria-expanded", String(isHidden));
}

function updateAudioSettingsUI() {
  ui.musicStatus.textContent = `Music: ${game.musicEnabled ? "ON" : "OFF"}`;
  ui.sfxStatus.textContent = `Effects: ${game.sfxEnabled ? "ON" : "OFF"}`;
}

function toggleMusic() {
  game.musicEnabled = !game.musicEnabled;
  updateAudioSettingsUI();
}

function toggleSfx() {
  game.sfxEnabled = !game.sfxEnabled;
  updateAudioSettingsUI();
}

function startGame() {
  game.levelNumber = 1;
  resetLevel(true);
  game.lastMessage = "Stage 1 started.";
  setState(GAME_STATE.PLAYING);
}

function resetGame() {
  resetLevel(false);
  game.lastMessage = `Nivel ${game.levelNumber} reiniciado.`;
  setState(GAME_STATE.PLAYING);
}

function playNextLevel() {
  if (game.state !== GAME_STATE.WIN) {
    return;
  }
  game.levelNumber += 1;
  resetLevel(true);
  game.lastMessage = `Nivel ${game.levelNumber} iniciado.`;
  setState(GAME_STATE.PLAYING);
}

function handlePointerDown(event) {
  if (game.state !== GAME_STATE.PLAYING || game.projectile.inMotion) {
    return;
  }
  const pointer = getPointerPosition(event);
  game.aiming = true;
  game.aimPoint = pointer;
}

function handlePointerMove(event) {
  if (!game.aiming || game.projectile.inMotion) {
    return;
  }
  game.aimPoint = getPointerPosition(event);
}

function handlePointerUp(event) {
  if (!game.aiming || game.projectile.inMotion) {
    return;
  }
  const pointer = getPointerPosition(event);
  launchOrbFromPoint(pointer.x, pointer.y);
}

function bindEvents() {
  ui.playBtn.addEventListener("click", startGame);
  ui.resetBtn.addEventListener("click", resetGame);
  ui.nextPlayBtn.addEventListener("click", playNextLevel);
  ui.settingsBtn.addEventListener("click", toggleOptions);
  ui.musicToggleBtn.addEventListener("click", toggleMusic);
  ui.sfxToggleBtn.addEventListener("click", toggleSfx);
  ui.canvas.addEventListener("pointerdown", handlePointerDown);
  ui.canvas.addEventListener("pointermove", handlePointerMove);
  ui.canvas.addEventListener("pointerup", handlePointerUp);
  ui.canvas.addEventListener("pointercancel", () => {
    game.aiming = false;
  });
}

function init() {
  resetLevel(true);
  bindEvents();
  updateAudioSettingsUI();
  setState(GAME_STATE.START);
  requestAnimationFrame(gameLoop);
}

init();
