"use strict";

const GAME_STATE = {
  START: "start",
  PLAYING: "playing",
  WIN: "win",
  LOSE: "lose"
};

const levelOne = { id: 1, name: "Level 1", orbs: 5 };

const PEG_SHAPES = { /* ... (sin cambios) */ };
const ui = { /* ... (sin cambios) */ };

const ctx = ui.canvas.getContext("2d");

const game = { /* ... (sin cambios hasta drawBoard) */ };

// ... (todas las funciones anteriores permanecen iguales hasta drawBoard)

function drawBoard() {
  ctx.clearRect(0, 0, ui.canvas.width, ui.canvas.height);

  // Fondo nocturno profundo
  ctx.fillStyle = "#0a0817";
  ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

  // Estrellas parpadeantes
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 40; i++) {
    const x = (i * 31) % ui.canvas.width;
    const y = (i * 19) % 320;
    ctx.globalAlpha = 0.5 + Math.sin(game.nowMs / 700 + i) * 0.5;
    ctx.fillRect(x, y, 1.8, 1.8);
  }
  ctx.globalAlpha = 1.0;

  // Niebla nocturna suave
  const fog = ctx.createLinearGradient(0, 280, 0, 640);
  fog.addColorStop(0, "transparent");
  fog.addColorStop(1, "rgba(40, 25, 70, 0.65)");
  ctx.fillStyle = fog;
  ctx.fillRect(0, 280, ui.canvas.width, 360);

  // HUD
  ctx.fillStyle = "#f8e8c8";
  ctx.font = "bold 14px Segoe UI";
  ctx.textAlign = "left";
  ctx.fillText(`Linternas: ${game.orbsLeft}`, 12, 24);
  ctx.fillText(`Objetivos: ${getRemainingSeals()}`, 12, 44);
  ctx.textAlign = "right";
  ctx.fillText(`Puntos: ${game.score}`, ui.canvas.width - 12, 24);
  ctx.textAlign = "start";

  // === LINTERNAS ===
  for (const peg of game.pegs) {
    if (!peg.active) {
      ctx.fillStyle = "#2a2538";
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.r * 0.75, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    const isTarget = peg.type === "target";
    const glow = isTarget ? "#ffcc66" : "#a0d8ff";

    // Glow exterior
    ctx.shadowColor = isTarget ? "#ffaa33" : glow;
    ctx.shadowBlur = isTarget ? 28 : 16;
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.r + (isTarget ? 6 : 3), 0, Math.PI * 2);
    ctx.fillStyle = isTarget ? "rgba(255, 180, 80, 0.4)" : "rgba(120, 180, 255, 0.25)";
    ctx.fill();

    // Cuerpo principal de la linterna
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
    ctx.fillStyle = isTarget ? "#ff9f1c" : getPegColor(peg.type);
    ctx.fill();

    // Estructura de la linterna
    ctx.strokeStyle = "#3a2a10";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.r * 0.78, 0, Math.PI * 2);
    ctx.stroke();

    // Luz interior cálida
    ctx.shadowColor = "#ffeebb";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "rgba(255, 245, 200, 0.95)";
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.r * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // Brillo superior
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.arc(peg.x - 5, peg.y - 6, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Proyectil (linterna volando)
  ctx.shadowColor = "#ffdd88";
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(game.projectile.x, game.projectile.y, game.projectile.r, 0, Math.PI * 2);
  ctx.fillStyle = "#ffcc77";
  ctx.fill();

  ctx.shadowBlur = 10;
  ctx.fillStyle = "#fff8e1";
  ctx.beginPath();
  ctx.arc(game.projectile.x - 3, game.projectile.y - 3, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  if (game.aiming && game.state === GAME_STATE.PLAYING && !game.projectile.inMotion) {
    drawPredictedTrajectory();
  }

  // Receptáculo (cesta de linternas)
  ctx.shadowColor = "#ffaa33";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#c56a1f";
  ctx.fillRect(game.bucket.x, game.bucket.y, game.bucket.w, game.bucket.h);
  
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#ffdd88";
  ctx.lineWidth = 4;
  ctx.strokeRect(game.bucket.x + 4, game.bucket.y + 3, game.bucket.w - 8, game.bucket.h - 6);
}

function renderOverlay() {
  if (game.state !== GAME_STATE.WIN && game.state !== GAME_STATE.LOSE) return;

  ctx.fillStyle = "rgba(10, 8, 23, 0.75)";
  ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

  ctx.fillStyle = "#ffdd88";
  ctx.font = "bold 32px Georgia";
  ctx.textAlign = "center";
  ctx.fillText(game.state === GAME_STATE.WIN ? "¡VICTORIA!" : "FIN DEL FESTIVAL", 
               ui.canvas.width / 2, ui.canvas.height / 2 - 10);
  
  ctx.font = "18px Segoe UI";
  ctx.fillStyle = "#e8d8b0";
  ctx.fillText(game.state === GAME_STATE.WIN ? "Las linternas brillan gracias a ti" : "Inténtalo de nuevo", 
               ui.canvas.width / 2, ui.canvas.height / 2 + 35);
  ctx.textAlign = "start";
}

// El resto del archivo (gameLoop, eventos, init, etc.) se mantiene igual
// ... (copia el resto del script.js original desde aquí hacia abajo)