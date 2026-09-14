/* CreationFirst Snake, a tiny canvas easter-egg game, v6.
   Vanilla JS, no dependencies. One self-contained instance per [data-snake-game] element,
   so it can run both as a compact homepage teaser and as the full Playground page.

   v6 adds real variety on top of the core grid-snake loop: two food dots at once past a
   score threshold, five power-ups (bonus / shield / slow-mo / speed / magnet), obstacle
   blocks that start PATROLLING the grid once the score climbs high enough, periodic
   short "RUSH" bursts (faster pace + double points) that fire on a timer regardless of
   what the player does, and a persistent on-canvas + HUD indicator for whatever effect
   is currently active so shield/slow/speed/magnet state is never invisible.

   Root cause finally found for the long-running "text overlaps in the game window" bug:
   .game-stage sets line-height:0 (to remove the canvas baseline gap), and line-height is
   an INHERITED property, so every text node inside the overlay panels silently inherited
   that 0 too, any text that wrapped onto a 2nd line rendered directly on top of the 1st.
   That's fixed in style.css (line-height reset on .game-overlay/.game-hud), not here, but
   documented here since it was repeatedly (and wrongly) suspected to be a canvas issue.

   IMPORTANT invariant learned the hard way: once the game is over, the canvas must not
   keep drawing gameplay content (snake/food/popup text) underneath the HTML "Game Over"
   overlay, any leftover animation bleeds through the overlay and visually collides with
   the overlay's own text. So render() only draws the live play field while phase is one
   of "ready" / "countdown" / "playing" / "paused", and gameOver() wipes any in-flight
   particles/timers before (optionally) spawning a fresh, non-text confetti burst. */
(function () {
  "use strict";

  var COLORS = {
    bg1: "#1c2340",
    bg2: "#0a0e1a",
    head1: "#22d3ee",
    head2: "#4f46e5",
    food: "#22d3ee",
    bonus: "#f5b400",
    shield: "#4f9eff",
    slow: "#7df0d2",
    speed: "#ff5da2",
    magnet: "#b18cff",
    obstacle: "#f97362"
  };
  var CONFETTI_COLORS = ["#22d3ee", "#4f46e5", "#f5b400", "#f97362", "#7df0d2", "#ffffff"];

  var BEST_KEY = "creationfirst_snake_best";
  var DEFAULT_LB_KEY = "creationfirst_snake_leaderboard";
  var INITIALS_KEY = "creationfirst_snake_initials";
  var MUTED_KEY = "creationfirst_snake_muted";
  var LB_SIZE = 10;
  var MILESTONE_STEP = 100;
  var COMBO_WINDOW = 2200;
  var COMBO_MAX = 5;
  var POWERUP_EVERY = 3;       // spawn a power-up every Nth food eaten
  var POWERUP_LIFETIME = 6200; // ms before an uncollected power-up disappears
  var POWERUP_TYPES = ["bonus", "shield", "slow", "speed", "magnet"];
  var OBSTACLE_START_SCORE = 90;
  var OBSTACLE_SCORE_STEP = 120;
  var OBSTACLE_MAX = 8;
  var OBSTACLE_MOVE_SCORE = 240; // obstacles spawned after this score patrol the grid
  var DOUBLE_FOOD_SCORE = 160;   // a 2nd food dot appears once score crosses this
  var COUNTDOWN_STEP_MS = 650;
  var SLOWMO_DURATION = 5000;
  var SLOWMO_FACTOR = 1.7;
  var SPEED_DURATION = 4500;
  var SPEED_FACTOR = 0.6;
  var MAGNET_DURATION = 5500;
  var MAGNET_RADIUS = 9;
  var MAGNET_PULL_CHANCE = 0.65;
  var RUSH_INTERVAL = 17000;
  var RUSH_JITTER = 5000;
  var RUSH_DURATION = 4500;
  var RUSH_SPEED_FACTOR = 0.65;
  var RUSH_SCORE_MULT = 2;

  /* ---------- shared, lazily-created audio engine (one AudioContext per page) ---------- */
  var audioCtx = null;
  var mutedGlobal = false;
  try { mutedGlobal = localStorage.getItem(MUTED_KEY) === "1"; } catch (e) { mutedGlobal = false; }

  function getAudioCtx() {
    if (audioCtx) return audioCtx;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try { audioCtx = new Ctx(); } catch (e) { audioCtx = null; }
    return audioCtx;
  }
  function playTone(freqStart, freqEnd, duration, type, volume, delay) {
    if (mutedGlobal) return;
    var ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") { ctx.resume().catch(function () {}); }
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || "sine";
      var now = ctx.currentTime + (delay || 0);
      osc.frequency.setValueAtTime(freqStart, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), now + duration);
      gain.gain.setValueAtTime(volume || 0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (e) { /* ignore audio errors */ }
  }
  var sfx = {
    eat: function (streak) { playTone(460 + streak * 30, 740 + streak * 30, 0.1, "sine", 0.1); },
    bonus: function () { playTone(600, 1300, 0.22, "triangle", 0.12); },
    shield: function () { playTone(300, 700, 0.18, "square", 0.1); },
    shieldBreak: function () { playTone(500, 150, 0.22, "sawtooth", 0.12); },
    slow: function () { playTone(700, 260, 0.28, "sine", 0.1); },
    speed: function () { playTone(500, 1150, 0.16, "square", 0.11); },
    magnet: function () { playTone(340, 640, 0.18, "sine", 0.1); playTone(640, 440, 0.18, "sine", 0.08, 0.09); },
    rush: function () { playTone(200, 900, 0.32, "sawtooth", 0.15); },
    turn: function () { playTone(220, 260, 0.03, "square", 0.018); },
    hit: function () { playTone(180, 40, 0.32, "sawtooth", 0.14); },
    milestone: function () { playTone(500, 1400, 0.35, "triangle", 0.12); },
    countdown: function () { playTone(400, 500, 0.08, "square", 0.08); },
    go: function () { playTone(500, 1000, 0.18, "triangle", 0.12); },
    fanfare: function () {
      playTone(520, 780, 0.16, "triangle", 0.12, 0);
      playTone(660, 990, 0.16, "triangle", 0.12, 0.12);
      playTone(880, 1320, 0.24, "triangle", 0.12, 0.24);
    },
    pause: function () { playTone(400, 260, 0.1, "sine", 0.08); }
  };

  function initGame(wrap) {
    var canvas = wrap.querySelector(".game-canvas");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");

    var startOverlay = wrap.querySelector(".game-overlay-start");
    var overOverlay = wrap.querySelector(".game-overlay-over");
    var scoreEl = wrap.querySelector(".game-score-value");
    var bestEls = wrap.querySelectorAll(".game-best-value");
    var finalScoreEl = wrap.querySelector(".game-final-score-value");
    var newBestEl = wrap.querySelector(".game-new-best");
    var startBtn = wrap.querySelector(".game-start-btn");
    var restartBtn = wrap.querySelector(".game-restart-btn");
    var dpadBtns = wrap.querySelectorAll(".game-dpad-btn");
    var soundBtn = wrap.querySelector(".game-sound-btn");
    var initialsForm = wrap.querySelector(".game-initials-form");
    var initialsInput = wrap.querySelector(".game-initials-input");
    var saveScoreBtn = wrap.querySelector(".game-save-score-btn");
    var leaderboardList = wrap.querySelector(".game-leaderboard-list");
    var effectBadgeEl = wrap.querySelector(".game-effect-badge");
    var fullscreenBtn = wrap.querySelector(".game-fullscreen-btn");
    var gameControls = wrap.querySelector(".game-controls");

    var LB_KEY = wrap.dataset.leaderboardKey || DEFAULT_LB_KEY;
    var LB_EMPTY_TEXT = wrap.dataset.leaderboardEmpty || "No entries yet.";
    var RANK_PREFIX = wrap.dataset.rankPrefix || "#";
    var PAUSED_LABEL = wrap.dataset.pausedLabel || "Paused";

    function setBest(value) {
      bestEls.forEach(function (el) { el.textContent = value; });
    }
    function showOverlay(el, show) {
      if (el) el.classList.toggle("is-active", !!show);
    }

    var best = 0;
    try { best = parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { best = 0; }
    setBest(best);

    if (soundBtn) {
      soundBtn.classList.toggle("is-muted", mutedGlobal);
      soundBtn.setAttribute("aria-label", mutedGlobal ? (soundBtn.dataset.offAria || "") : (soundBtn.dataset.onAria || ""));
      soundBtn.addEventListener("click", function () {
        mutedGlobal = !mutedGlobal;
        try { localStorage.setItem(MUTED_KEY, mutedGlobal ? "1" : "0"); } catch (e) { /* ignore */ }
        soundBtn.classList.toggle("is-muted", mutedGlobal);
        soundBtn.setAttribute("aria-label", mutedGlobal ? (soundBtn.dataset.offAria || "") : (soundBtn.dataset.onAria || ""));
      });
    }

    /* ---------- leaderboard (localStorage, per device) ---------- */
    function loadLeaderboard() {
      try {
        var raw = JSON.parse(localStorage.getItem(LB_KEY));
        if (Array.isArray(raw)) return raw.filter(function (e) { return e && typeof e.score === "number"; });
      } catch (e) { /* ignore */ }
      return [];
    }
    function saveLeaderboard(list) {
      try { localStorage.setItem(LB_KEY, JSON.stringify(list.slice(0, LB_SIZE))); } catch (e) { /* ignore */ }
    }
    function qualifies(score, list) {
      if (score <= 0) return false;
      if (list.length < LB_SIZE) return true;
      return score > list[list.length - 1].score;
    }
    function renderLeaderboard(list, highlightEntry) {
      if (!leaderboardList) return;
      leaderboardList.innerHTML = "";
      if (!list.length) {
        var empty = document.createElement("li");
        empty.className = "game-leaderboard-empty";
        empty.textContent = LB_EMPTY_TEXT;
        leaderboardList.appendChild(empty);
        return;
      }
      list.forEach(function (entry, idx) {
        var li = document.createElement("li");
        if (highlightEntry && entry === highlightEntry) li.classList.add("is-you");
        var rank = document.createElement("span");
        rank.className = "lb-rank";
        rank.title = RANK_PREFIX + " " + (idx + 1);
        rank.textContent = (idx + 1) + ".";
        var name = document.createElement("span");
        name.className = "lb-name";
        name.textContent = entry.name || "???";
        var score = document.createElement("span");
        score.className = "lb-score";
        score.textContent = entry.score;
        li.appendChild(rank);
        li.appendChild(name);
        li.appendChild(score);
        leaderboardList.appendChild(li);
      });
    }

    var W = 0, H = 0, dpr = 1;
    var isInView = true;
    var cell = 18, cols = 10, rows = 10, offsetX = 0, offsetY = 0;

    function resize() {
      var rect = wrap.getBoundingClientRect();
      var cssWidth = Math.max(280, Math.round(rect.width));
      var cssHeight = parseInt(wrap.dataset.height, 10) || 300;
      dpr = window.devicePixelRatio || 1;
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
      canvas.style.width = cssWidth + "px";
      canvas.style.height = cssHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      W = cssWidth;
      H = cssHeight;
      var targetCols = 24;
      cell = Math.max(12, Math.min(24, Math.floor(W / targetCols)));
      cols = Math.max(10, Math.floor(W / cell));
      rows = Math.max(10, Math.floor(H / cell));
      offsetX = Math.floor((W - cols * cell) / 2);
      offsetY = Math.floor((H - rows * cell) / 2);
    }

    /* ---------- state ---------- */
    var phase = "ready"; // ready | countdown | playing | paused | over
    var snake, prevSnake, dir, pendingDir, foods, powerUp, obstacles;
    var score, foodEaten, tickInterval, tickTimer;
    var particles, flashes, shakeTime;
    var milestoneLevel;
    var comboCount, comboTimer;
    var shieldActive, slowTimer, speedTimer, magnetTimer;
    var rushActive, rushTimer, rushCooldown;
    var countdownValue, countdownTimer;
    var pendingLeaderboardScore = null;

    function randCell() {
      return { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    }
    function cellTaken(c) {
      for (var i = 0; i < snake.length; i++) { if (snake[i].x === c.x && snake[i].y === c.y) return true; }
      for (var j = 0; j < obstacles.length; j++) { if (obstacles[j].x === c.x && obstacles[j].y === c.y) return true; }
      for (var k = 0; k < foods.length; k++) { if (foods[k].x === c.x && foods[k].y === c.y) return true; }
      if (powerUp.active && powerUp.x === c.x && powerUp.y === c.y) return true;
      return false;
    }
    function spawnOneFood() {
      var c, tries = 0;
      do { c = randCell(); tries++; } while (cellTaken(c) && tries < 300);
      foods.push({ x: c.x, y: c.y });
    }
    function ensureFoodCount() {
      var target = score >= DOUBLE_FOOD_SCORE ? 2 : 1;
      var guard = 0;
      while (foods.length < target && guard < 10) { spawnOneFood(); guard++; }
    }
    function maybeSpawnPowerUp() {
      if (powerUp.active) return;
      if (foodEaten > 0 && foodEaten % POWERUP_EVERY === 0) {
        var c, tries = 0;
        do { c = randCell(); tries++; } while (cellTaken(c) && tries < 300);
        powerUp.active = true;
        powerUp.type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        powerUp.x = c.x;
        powerUp.y = c.y;
        powerUp.life = POWERUP_LIFETIME;
        powerUp.maxLife = POWERUP_LIFETIME;
      }
    }
    function maybeSpawnObstacles() {
      if (score < OBSTACLE_START_SCORE) return;
      var target = Math.min(OBSTACLE_MAX, Math.floor((score - OBSTACLE_START_SCORE) / OBSTACLE_SCORE_STEP) + 1);
      var head = snake[0];
      var guard = 0;
      while (obstacles.length < target && guard < 20) {
        guard++;
        var c = randCell();
        if (cellTaken(c)) continue;
        if (Math.abs(c.x - head.x) <= 2 && Math.abs(c.y - head.y) <= 2) continue;
        var moving = score >= OBSTACLE_MOVE_SCORE;
        var interval = 2 + Math.floor(Math.random() * 2);
        obstacles.push({ x: c.x, y: c.y, moving: moving, moveInterval: interval, moveTimer: interval });
      }
    }
    function moveObstacles() {
      for (var i = 0; i < obstacles.length; i++) {
        var ob = obstacles[i];
        if (!ob.moving) continue;
        ob.moveTimer--;
        if (ob.moveTimer > 0) continue;
        ob.moveTimer = ob.moveInterval;
        var dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        for (var s = dirs.length - 1; s > 0; s--) {
          var r = Math.floor(Math.random() * (s + 1));
          var tmp = dirs[s]; dirs[s] = dirs[r]; dirs[r] = tmp;
        }
        for (var d = 0; d < dirs.length; d++) {
          var nx = ob.x + dirs[d].x, ny = ob.y + dirs[d].y;
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          var blocked = false;
          for (var j = 0; j < obstacles.length; j++) {
            if (j !== i && obstacles[j].x === nx && obstacles[j].y === ny) { blocked = true; break; }
          }
          if (!blocked) {
            for (var k = 0; k < foods.length; k++) {
              if (foods[k].x === nx && foods[k].y === ny) { blocked = true; break; }
            }
          }
          if (blocked) continue;
          ob.x = nx; ob.y = ny;
          break;
        }
      }
    }
    function applyMagnet() {
      if (magnetTimer <= 0 || !foods.length) return;
      var head = snake[0];
      for (var i = 0; i < foods.length; i++) {
        var f = foods[i];
        var ddx = head.x - f.x, ddy = head.y - f.y;
        var dist = Math.abs(ddx) + Math.abs(ddy);
        if (dist === 0 || dist > MAGNET_RADIUS) continue;
        if (Math.random() > MAGNET_PULL_CHANCE) continue;
        var nx = f.x, ny = f.y;
        if (Math.abs(ddx) >= Math.abs(ddy)) nx += ddx > 0 ? 1 : -1;
        else ny += ddy > 0 ? 1 : -1;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        var blocked = false;
        for (var j = 0; j < obstacles.length; j++) { if (obstacles[j].x === nx && obstacles[j].y === ny) { blocked = true; break; } }
        if (!blocked) {
          for (var k = 0; k < foods.length; k++) { if (k !== i && foods[k].x === nx && foods[k].y === ny) { blocked = true; break; } }
        }
        if (blocked) continue;
        f.x = nx; f.y = ny;
      }
    }

    function resetState() {
      var startX = Math.max(3, Math.floor(cols / 4));
      var startY = Math.floor(rows / 2);
      snake = [
        { x: startX + 2, y: startY },
        { x: startX + 1, y: startY },
        { x: startX, y: startY }
      ];
      prevSnake = snake.slice();
      dir = { x: 1, y: 0 };
      pendingDir = { x: 1, y: 0 };
      obstacles = [];
      powerUp = { active: false, type: null, x: 0, y: 0, life: 0, maxLife: POWERUP_LIFETIME };
      foods = [];
      score = 0;
      ensureFoodCount();
      foodEaten = 0;
      tickInterval = 138;
      tickTimer = 0;
      particles = [];
      flashes = [];
      shakeTime = 0;
      milestoneLevel = 0;
      comboCount = 0;
      comboTimer = 0;
      shieldActive = false;
      slowTimer = 0;
      speedTimer = 0;
      magnetTimer = 0;
      rushActive = false;
      rushTimer = 0;
      rushCooldown = RUSH_INTERVAL + Math.random() * RUSH_JITTER;
      countdownValue = 3;
      countdownTimer = COUNTDOWN_STEP_MS;
      pendingLeaderboardScore = null;
      if (initialsForm) initialsForm.classList.remove("is-active");
      if (scoreEl) scoreEl.textContent = "0";
    }

    function setPhase(next) {
      phase = next;
      showOverlay(startOverlay, next === "ready");
      showOverlay(overOverlay, next === "over");
    }

    function queueDirection(nd) {
      if (phase !== "playing") return;
      if (snake.length > 1 && nd.x === -dir.x && nd.y === -dir.y) return;
      if (nd.x === pendingDir.x && nd.y === pendingDir.y) return;
      pendingDir = nd;
      sfx.turn();
    }

    function togglePause() {
      if (phase === "playing") { setPhase("paused"); sfx.pause(); }
      else if (phase === "paused") { setPhase("playing"); sfx.pause(); }
    }

    function beginCountdown() {
      resetState();
      setPhase("countdown");
    }

    function handlePrimaryInput() {
      if (phase === "ready" || phase === "over") beginCountdown();
    }

    function cellCenter(c) {
      return { x: offsetX + c.x * cell + cell / 2, y: offsetY + c.y * cell + cell / 2 };
    }
    function burst(cx, cy, color, count, life) {
      var n = count || 10;
      for (var i = 0; i < n; i++) {
        var ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
        var sp = 0.05 + Math.random() * 0.08;
        particles.push({ x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: life || 420, maxLife: life || 420, color: color });
      }
    }
    function burstConfetti(cx, cy) {
      for (var i = 0; i < 34; i++) {
        var ang = Math.random() * Math.PI * 2;
        var sp = 0.04 + Math.random() * 0.14;
        particles.push({
          x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 0.05,
          gravity: 0.00025, life: 1100, maxLife: 1100,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
        });
      }
    }
    function popupText(cx, cy, text, color, size) {
      particles.push({ x: cx, y: cy, vx: 0, vy: -0.045, life: 700, maxLife: 700, text: text, color: color, size: size || 14 });
    }
    function addFlash(cx, cy, color) {
      flashes.push({ x: cx, y: cy, life: 320, maxLife: 320, color: color || "#ffffff" });
    }

    function consumeShield(cx, cy) {
      shieldActive = false;
      shakeTime = 140;
      addFlash(cx, cy, COLORS.shield);
      burst(cx, cy, COLORS.shield, 14);
      popupText(cx, cy - 18, "-1 SHIELD", COLORS.shield, 12);
      sfx.shieldBreak();
    }

    function triggerRush() {
      rushActive = true;
      rushTimer = RUSH_DURATION;
      shakeTime = Math.max(shakeTime, 160);
      var hc = cellCenter(snake[0]);
      addFlash(hc.x, hc.y, "#ff3860");
      popupText(hc.x, hc.y - 30, "RUSH!", "#ff3860", 20);
      sfx.rush();
    }
    function endRush() {
      rushActive = false;
      rushCooldown = RUSH_INTERVAL + (Math.random() * RUSH_JITTER - RUSH_JITTER / 2);
    }

    function computeEffectiveInterval() {
      var factor = 1;
      if (slowTimer > 0) factor *= SLOWMO_FACTOR;
      if (speedTimer > 0) factor *= SPEED_FACTOR;
      if (rushActive) factor *= RUSH_SPEED_FACTOR;
      return tickInterval * factor;
    }

    function tick() {
      dir = pendingDir;
      moveObstacles();
      var head = snake[0];
      // All four edges wrap around (teleport to the opposite side) instead of killing
      // you, there is no more "hitWall" death at all; self-collision and obstacles are
      // the only things that end a run now (the shield still protects against those).
      var rawX = head.x + dir.x;
      var rawY = head.y + dir.y;
      var wrappedX = false, wrappedY = false;
      var newX = rawX, newY = rawY;
      if (rawX < 0) { newX = cols - 1; wrappedX = true; }
      else if (rawX >= cols) { newX = 0; wrappedX = true; }
      if (rawY < 0) { newY = rows - 1; wrappedY = true; }
      else if (rawY >= rows) { newY = 0; wrappedY = true; }
      var newHead = { x: newX, y: newY };
      var hc = cellCenter(newHead);

      var ateFood = false, ateFoodIndex = -1, ateType = null;
      for (var fIdx = 0; fIdx < foods.length; fIdx++) {
        if (foods[fIdx].x === newHead.x && foods[fIdx].y === newHead.y) { ateFood = true; ateFoodIndex = fIdx; break; }
      }
      if (powerUp.active && newHead.x === powerUp.x && newHead.y === powerUp.y) ateType = powerUp.type;
      var growing = ateFood || !!ateType;

      var hitSelf = false, hitObstacle = false;
      var bodyToCheck = growing ? snake : snake.slice(0, snake.length - 1);
      for (var i = 0; i < bodyToCheck.length; i++) {
        if (bodyToCheck[i].x === newHead.x && bodyToCheck[i].y === newHead.y) { hitSelf = true; break; }
      }
      for (var j = 0; j < obstacles.length; j++) {
        if (obstacles[j].x === newHead.x && obstacles[j].y === newHead.y) { hitObstacle = true; break; }
      }

      if (hitSelf || hitObstacle) {
        if (shieldActive) { consumeShield(hc.x, hc.y); return; }
        gameOver();
        return;
      }

      var oldSnake = snake;
      var newSnake = [newHead].concat(oldSnake);
      if (!growing) newSnake.pop();
      prevSnake = growing ? oldSnake.concat([oldSnake[oldSnake.length - 1]]) : oldSnake;
      snake = newSnake;

      if (wrappedX || wrappedY) {
        // render() interpolates every segment with wraparound-aware ("shortest path
        // around the edge") lerping, so no manual snap is needed here, just a little
        // flash at the entry point so the teleport reads as intentional.
        var wrapPoint = cellCenter(newHead);
        addFlash(wrapPoint.x, wrapPoint.y, COLORS.food);
      }

      if (ateFood) {
        foodEaten++;
        comboCount = comboTimer > 0 ? Math.min(comboCount + 1, COMBO_MAX) : 1;
        comboTimer = COMBO_WINDOW;
        var mult = rushActive ? RUSH_SCORE_MULT : 1;
        var gained = 10 * comboCount * mult;
        score += gained;
        var eatenFood = foods[ateFoodIndex];
        var fc = cellCenter(eatenFood);
        burst(fc.x, fc.y, COLORS.food);
        popupText(fc.x, fc.y - 4, "+" + gained, COLORS.food);
        if (comboCount >= 2) popupText(fc.x, fc.y - 22, "x" + comboCount, "#f5b400", 12);
        sfx.eat(comboCount);
        foods.splice(ateFoodIndex, 1);
        maybeSpawnPowerUp();
        tickInterval = Math.max(62, 138 - foodEaten * 5);
      }
      if (ateType) {
        var pc = cellCenter({ x: newHead.x, y: newHead.y });
        powerUp.active = false;
        var rMult = rushActive ? RUSH_SCORE_MULT : 1;
        if (ateType === "bonus") {
          score += 50 * rMult;
          burst(pc.x, pc.y, COLORS.bonus, 18);
          popupText(pc.x, pc.y - 4, "+" + (50 * rMult), COLORS.bonus, 16);
          sfx.bonus();
        } else if (ateType === "shield") {
          shieldActive = true;
          score += 5;
          burst(pc.x, pc.y, COLORS.shield, 16);
          popupText(pc.x, pc.y - 4, "SHIELD", COLORS.shield, 13);
          sfx.shield();
        } else if (ateType === "slow") {
          slowTimer = SLOWMO_DURATION;
          score += 5;
          burst(pc.x, pc.y, COLORS.slow, 16);
          popupText(pc.x, pc.y - 4, "SLOW-MO", COLORS.slow, 13);
          sfx.slow();
        } else if (ateType === "speed") {
          speedTimer = SPEED_DURATION;
          score += 15;
          burst(pc.x, pc.y, COLORS.speed, 16);
          popupText(pc.x, pc.y - 4, "SPEED", COLORS.speed, 13);
          sfx.speed();
        } else if (ateType === "magnet") {
          magnetTimer = MAGNET_DURATION;
          score += 15;
          burst(pc.x, pc.y, COLORS.magnet, 16);
          popupText(pc.x, pc.y - 4, "MAGNET", COLORS.magnet, 13);
          sfx.magnet();
        }
      }

      applyMagnet();
      maybeSpawnObstacles();
      ensureFoodCount();

      var level = Math.floor(score / MILESTONE_STEP);
      if (level > milestoneLevel) {
        milestoneLevel = level;
        var mc = cellCenter(newHead);
        addFlash(mc.x, mc.y);
        burst(mc.x, mc.y, "#ffffff", 16);
        popupText(mc.x, mc.y - 26, (milestoneLevel * MILESTONE_STEP) + "!", "#ffffff", 16);
        sfx.milestone();
      }

      if (scoreEl) scoreEl.textContent = score;
    }

    function gameOver() {
      setPhase("over");
      shakeTime = 220;
      particles = [];
      flashes = [];
      rushActive = false;
      slowTimer = 0;
      speedTimer = 0;
      magnetTimer = 0;
      sfx.hit();
      var finalScore = score;
      var isNew = finalScore > best;
      if (isNew) {
        best = finalScore;
        try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* ignore */ }
        var hc = cellCenter(snake[0]);
        burstConfetti(hc.x, hc.y);
        sfx.fanfare();
      }
      if (finalScoreEl) finalScoreEl.textContent = finalScore;
      setBest(best);
      if (newBestEl) newBestEl.classList.toggle("is-active", isNew);

      var list = loadLeaderboard();
      list.sort(function (a, b) { return b.score - a.score; });
      if (qualifies(finalScore, list)) {
        pendingLeaderboardScore = finalScore;
        if (initialsForm) {
          initialsForm.classList.add("is-active");
          var lastInitials = "";
          try { lastInitials = localStorage.getItem(INITIALS_KEY) || ""; } catch (e) { /* ignore */ }
          if (initialsInput) {
            initialsInput.value = lastInitials;
            setTimeout(function () { initialsInput.focus(); initialsInput.select(); }, 50);
          }
        }
      } else {
        pendingLeaderboardScore = null;
        if (initialsForm) initialsForm.classList.remove("is-active");
      }
      renderLeaderboard(list);
    }

    function saveScore() {
      if (pendingLeaderboardScore == null) return;
      var raw = (initialsInput && initialsInput.value ? initialsInput.value : "YOU").toUpperCase().replace(/[^A-Z0-9]/g, "");
      var name = (raw || "YOU").slice(0, 3);
      try { localStorage.setItem(INITIALS_KEY, name); } catch (e) { /* ignore */ }
      var list = loadLeaderboard();
      var entry = { name: name, score: pendingLeaderboardScore };
      list.push(entry);
      list.sort(function (a, b) { return b.score - a.score; });
      list = list.slice(0, LB_SIZE);
      saveLeaderboard(list);
      renderLeaderboard(list, entry);
      pendingLeaderboardScore = null;
      if (initialsForm) initialsForm.classList.remove("is-active");
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    function lerp(a, b, t) { return a + (b - a) * t; }
    // Shortest-path ("circular") interpolation for a wrapping grid axis: if the naive
    // straight-line distance between two grid coordinates is more than half the board,
    // it's actually shorter to go the other way around the wrap, this is what makes a
    // wrap-teleport look instant instead of like the segment slid across the entire
    // board. Without this, the lag/smear the user reported keeps recurring for several
    // ticks after every wrap, because the prev/cur pair for a body segment can straddle
    // the wrap point for as many ticks as there are segments behind the head.
    function lerpWrapped(prevCoord, curCoord, size, t) {
      var d = curCoord - prevCoord;
      if (d > size / 2) d -= size;
      else if (d < -size / 2) d += size;
      var v = prevCoord + d * t;
      v = ((v % size) + size) % size;
      return v;
    }

    function updateEffectBadge() {
      if (!effectBadgeEl) return;
      var label = "", cls = "";
      if (rushActive) { label = "🔥 RUSH " + Math.max(0, Math.ceil(rushTimer / 1000)) + "s"; cls = "is-rush"; }
      else if (shieldActive) { label = "🛡 SHIELD"; cls = "is-shield"; }
      else if (speedTimer > 0) { label = "⚡ SPEED " + Math.max(0, Math.ceil(speedTimer / 1000)) + "s"; cls = "is-speed"; }
      else if (magnetTimer > 0) { label = "🧲 MAGNET " + Math.max(0, Math.ceil(magnetTimer / 1000)) + "s"; cls = "is-magnet"; }
      else if (slowTimer > 0) { label = "🐢 SLOW-MO " + Math.max(0, Math.ceil(slowTimer / 1000)) + "s"; cls = "is-slow"; }
      if (label) {
        if (effectBadgeEl.textContent !== label) effectBadgeEl.textContent = label;
        var wantClass = "game-effect-badge is-active " + cls;
        if (effectBadgeEl.className !== wantClass) effectBadgeEl.className = wantClass;
      } else if (effectBadgeEl.className !== "game-effect-badge") {
        effectBadgeEl.textContent = "";
        effectBadgeEl.className = "game-effect-badge";
      }
    }

    function update(dt) {
      if (phase === "countdown") {
        countdownTimer -= dt;
        if (countdownTimer <= 0) {
          countdownValue--;
          if (countdownValue <= 0) { setPhase("playing"); sfx.go(); }
          else { countdownTimer += COUNTDOWN_STEP_MS; sfx.countdown(); }
        }
      } else if (phase === "playing") {
        if (slowTimer > 0) slowTimer -= dt;
        if (speedTimer > 0) speedTimer -= dt;
        if (magnetTimer > 0) magnetTimer -= dt;
        if (!rushActive) {
          rushCooldown -= dt;
          if (rushCooldown <= 0) triggerRush();
        } else {
          rushTimer -= dt;
          if (rushTimer <= 0) endRush();
        }
        tickTimer += dt;
        var guard = 0;
        var effectiveInterval = computeEffectiveInterval();
        while (tickTimer >= effectiveInterval && guard < 5) {
          tickTimer -= effectiveInterval;
          tick();
          guard++;
          if (phase !== "playing") break;
          effectiveInterval = computeEffectiveInterval();
        }
        if (powerUp.active) {
          powerUp.life -= dt;
          if (powerUp.life <= 0) powerUp.active = false;
        }
        if (comboTimer > 0) {
          comboTimer -= dt;
          if (comboTimer <= 0) comboCount = 0;
        }
      }

      for (var k = particles.length - 1; k >= 0; k--) {
        var p = particles[k];
        p.life -= dt;
        if (p.gravity) p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.life <= 0) particles.splice(k, 1);
      }
      for (var f = flashes.length - 1; f >= 0; f--) {
        flashes[f].life -= dt;
        if (flashes[f].life <= 0) flashes.splice(f, 1);
      }
      if (shakeTime > 0) shakeTime -= dt;
    }

    function render() {
      updateEffectBadge();
      var tLinear = phase === "playing" ? Math.min(1, tickTimer / tickInterval) : 1;
      // Smoothstep easing instead of a linear lerp: movement now eases in/out of each
      // grid step rather than sliding at a constant rate, which reads as noticeably
      // smoother/less "robotic" for the same underlying grid-step logic.
      var t = tLinear * tLinear * (3 - 2 * tLinear);

      ctx.save();
      if (shakeTime > 0) {
        var sx = (Math.random() - 0.5) * 6;
        var sy = (Math.random() - 0.5) * 6;
        ctx.translate(sx, sy);
      }

      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, COLORS.bg1);
      g.addColorStop(1, COLORS.bg2);
      ctx.fillStyle = g;
      ctx.fillRect(-10, -10, W + 20, H + 20);

      if (phase !== "over") {
        // subtle grid texture within the play field
        ctx.strokeStyle = "rgba(255,255,255.045)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var gx = 0; gx <= cols; gx++) {
          var lx = offsetX + gx * cell + 0.5;
          ctx.moveTo(lx, offsetY);
          ctx.lineTo(lx, offsetY + rows * cell);
        }
        for (var gy = 0; gy <= rows; gy++) {
          var ly = offsetY + gy * cell + 0.5;
          ctx.moveTo(offsetX, ly);
          ctx.lineTo(offsetX + cols * cell, ly);
        }
        ctx.stroke();

        // obstacles (static or, past OBSTACLE_MOVE_SCORE, slowly patrolling)
        for (var o = 0; o < obstacles.length; o++) {
          var ob = obstacles[o];
          var oc = cellCenter(ob);
          ctx.fillStyle = COLORS.obstacle;
          roundRect(oc.x - cell * 0.42, oc.y - cell * 0.42, cell * 0.84, cell * 0.84, cell * 0.16);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255.5)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(oc.x - cell * 0.2, oc.y - cell * 0.2);
          ctx.lineTo(oc.x + cell * 0.2, oc.y + cell * 0.2);
          ctx.moveTo(oc.x + cell * 0.2, oc.y - cell * 0.2);
          ctx.lineTo(oc.x - cell * 0.2, oc.y + cell * 0.2);
          ctx.stroke();
          if (ob.moving) {
            var spin = (performance.now() * 0.004) % (Math.PI * 2);
            ctx.strokeStyle = "rgba(255,255,255.85)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(oc.x, oc.y, cell * 0.58, spin, spin + Math.PI * 1.15);
            ctx.stroke();
          }
        }

        // food (one or two dots depending on score)
        for (var fdIdx = 0; fdIdx < foods.length; fdIdx++) {
          var fc2 = cellCenter(foods[fdIdx]);
          var pulse = Math.sin(performance.now() * 0.006 + fdIdx) * 1.5;
          var rg = ctx.createRadialGradient(fc2.x, fc2.y, 0, fc2.x, fc2.y, cell * 0.55 + pulse);
          rg.addColorStop(0, "rgba(34,211,238.9)");
          rg.addColorStop(1, "rgba(34,211,238,0)");
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(fc2.x, fc2.y, cell * 0.55 + pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#e6fdff";
          ctx.beginPath();
          ctx.arc(fc2.x, fc2.y, cell * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }

        // magnet pull lines from head to nearby food
        if (magnetTimer > 0 && foods.length) {
          var mHead = cellCenter(snake[0]);
          ctx.strokeStyle = "rgba(177,140,255.55)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          for (var mfi = 0; mfi < foods.length; mfi++) {
            var mfc = cellCenter(foods[mfi]);
            ctx.beginPath();
            ctx.moveTo(mHead.x, mHead.y);
            ctx.lineTo(mfc.x, mfc.y);
            ctx.stroke();
          }
          ctx.setLineDash([]);
        }

        // power-up
        if (powerUp.active) {
          var puc = cellCenter(powerUp);
          var pcol = powerUp.type === "bonus" ? COLORS.bonus :
            powerUp.type === "shield" ? COLORS.shield :
            powerUp.type === "slow" ? COLORS.slow :
            powerUp.type === "speed" ? COLORS.speed : COLORS.magnet;
          var bpulse = Math.sin(performance.now() * 0.012) * 1.5;
          var brg = ctx.createRadialGradient(puc.x, puc.y, 0, puc.x, puc.y, cell * 0.7 + bpulse);
          brg.addColorStop(0, pcol + "d9");
          brg.addColorStop(1, pcol + "00");
          ctx.fillStyle = brg;
          ctx.beginPath();
          ctx.arc(puc.x, puc.y, cell * 0.7 + bpulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.save();
          ctx.translate(puc.x, puc.y);
          ctx.fillStyle = "#fff6da";
          if (powerUp.type === "bonus") {
            ctx.rotate(Math.PI / 4);
            var s = cell * 0.32;
            ctx.fillRect(-s, -s, s * 2, s * 2);
          } else if (powerUp.type === "shield") {
            roundRect(-cell * 0.3, -cell * 0.34, cell * 0.6, cell * 0.68, cell * 0.14);
            ctx.fill();
          } else if (powerUp.type === "slow") {
            ctx.beginPath();
            ctx.arc(0, 0, cell * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = pcol;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -cell * 0.22);
            ctx.stroke();
          } else if (powerUp.type === "speed") {
            ctx.beginPath();
            ctx.moveTo(-cell * 0.12, -cell * 0.32);
            ctx.lineTo(cell * 0.12, -cell * 0.04);
            ctx.lineTo(-cell * 0.02, -cell * 0.04);
            ctx.lineTo(cell * 0.14, cell * 0.32);
            ctx.lineTo(-cell * 0.16, cell * 0.02);
            ctx.lineTo(cell * 0.02, cell * 0.02);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.strokeStyle = "#fff6da";
            ctx.lineWidth = cell * 0.14;
            ctx.beginPath();
            ctx.arc(0, cell * 0.04, cell * 0.26, Math.PI * 0.15, Math.PI * 0.85, false);
            ctx.stroke();
            ctx.fillRect(-cell * 0.30, -cell * 0.22, cell * 0.12, cell * 0.22);
            ctx.fillRect(cell * 0.18, -cell * 0.22, cell * 0.12, cell * 0.22);
          }
          ctx.restore();
          var frac = Math.max(0, powerUp.life / powerUp.maxLife);
          ctx.strokeStyle = "rgba(255,255,255.85)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(puc.x, puc.y, cell * 0.9, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
          ctx.stroke();
        }

        // snake body (tail -> head so head overlaps neck neatly)
        var len = snake.length;
        for (var i = len - 1; i >= 0; i--) {
          var cur = snake[i];
          var prev = prevSnake[i] || cur;
          var gx = lerpWrapped(prev.x, cur.x, cols, t);
          var gy = lerpWrapped(prev.y, cur.y, rows, t);
          var px = offsetX + gx * cell + cell / 2;
          var py = offsetY + gy * cell + cell / 2;
          var isHead = i === 0;
          var frac2 = 1 - i / Math.max(1, len - 1);
          var size = (isHead ? cell * 0.86 : cell * (0.62 + frac2 * 0.2));
          if (isHead) {
            var hg = ctx.createLinearGradient(px - size / 2, py - size / 2, px + size / 2, py + size / 2);
            hg.addColorStop(0, COLORS.head1);
            hg.addColorStop(1, COLORS.head2);
            ctx.fillStyle = hg;
          } else {
            ctx.globalAlpha = 0.55 + frac2 * 0.45;
            ctx.fillStyle = COLORS.head2;
          }
          roundRect(px - size / 2, py - size / 2, size, size, size * 0.32);
          ctx.fill();
          ctx.globalAlpha = 1;

          if (isHead) {
            var ex = dir.x * cell * 0.16;
            var ey = dir.y * cell * 0.16;
            var perpX = -dir.y * cell * 0.16;
            var perpY = dir.x * cell * 0.16;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(px + ex + perpX, py + ey + perpY, cell * 0.09, 0, Math.PI * 2);
            ctx.arc(px + ex - perpX, py + ey - perpY, cell * 0.09, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#0a0e1a";
            ctx.beginPath();
            ctx.arc(px + ex * 1.6 + perpX, py + ey * 1.6 + perpY, cell * 0.045, 0, Math.PI * 2);
            ctx.arc(px + ex * 1.6 - perpX, py + ey * 1.6 - perpY, cell * 0.045, 0, Math.PI * 2);
            ctx.fill();
            if (shieldActive) {
              ctx.strokeStyle = "rgba(79,158,255.85)";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(px, py, size * 0.72, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }

        // full-field border glow while an effect that changes the rules is active , 
        // this is the "make it unmistakable" fix for the shield feeling invisible.
        if (shieldActive) {
          var shieldPulse = 0.45 + Math.sin(performance.now() * 0.006) * 0.3;
          ctx.save();
          ctx.strokeStyle = "rgba(79,158,255," + shieldPulse.toFixed(2) + ")";
          ctx.lineWidth = 4;
          ctx.strokeRect(2, 2, W - 4, H - 4);
          ctx.restore();
        }
        if (rushActive) {
          var rushPulse = 0.4 + Math.sin(performance.now() * 0.012) * 0.3;
          ctx.save();
          ctx.strokeStyle = "rgba(255,56,96," + rushPulse.toFixed(2) + ")";
          ctx.lineWidth = 4;
          ctx.strokeRect(2, 2, W - 4, H - 4);
          ctx.restore();
        } else if (speedTimer > 0) {
          ctx.save();
          ctx.strokeStyle = "rgba(255,93,162.35)";
          ctx.lineWidth = 3;
          ctx.strokeRect(2, 2, W - 4, H - 4);
          ctx.restore();
        }

        var fontFamily = (typeof getComputedStyle === "function" ? getComputedStyle(document.body).fontFamily : "") || "sans-serif";

        if (phase === "countdown") {
          var stepFrac = 1 - countdownTimer / COUNTDOWN_STEP_MS;
          var scale = 1.3 - stepFrac * 0.3;
          ctx.save();
          ctx.globalAlpha = Math.min(1, stepFrac * 3);
          ctx.translate(W / 2, H / 2);
          ctx.scale(scale, scale);
          ctx.fillStyle = "#ffffff";
          ctx.font = "800 60px " + fontFamily;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(countdownValue), 0, 0);
          ctx.restore();
        }

        if (phase === "paused") {
          ctx.fillStyle = "rgba(6,9,18.55)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#ffffff";
          ctx.font = "800 26px " + fontFamily;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(PAUSED_LABEL, W / 2, H / 2);
        }
      }

      // milestone / shield-break / rush flashes
      for (var fl = 0; fl < flashes.length; fl++) {
        var flash = flashes[fl];
        var ft = flash.life / flash.maxLife;
        ctx.globalAlpha = ft * 0.6;
        ctx.strokeStyle = flash.color || "#ffffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, (1 - ft) * 90, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // particles (bursts, confetti, score popups), safe during every phase since
      // gameOver() wipes stale particles before spawning a fresh confetti burst.
      for (var k = 0; k < particles.length; k++) {
        var p = particles[k];
        var pt = p.life / p.maxLife;
        if (p.text) {
          ctx.globalAlpha = pt;
          ctx.fillStyle = p.color || "#22d3ee";
          ctx.font = "800 " + (p.size || 14) + "px " + (typeof getComputedStyle === "function" ? getComputedStyle(document.body).fontFamily : "sans-serif");
          ctx.textAlign = "center";
          ctx.fillText(p.text, p.x, p.y);
          ctx.globalAlpha = 1;
        } else {
          ctx.globalAlpha = pt;
          ctx.fillStyle = p.color || "#fff";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3 * pt, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      ctx.restore();
    }

    var raf = null;
    var lastTs = 0;
    function loop(ts) {
      var dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      update(dt);
      render();
      raf = requestAnimationFrame(loop);
    }

    /* ---------- input ---------- */
    var KEY_DIRS = {
      ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 }
    };

    window.addEventListener("keydown", function (e) {
      if (!isInView) return;
      var kd = KEY_DIRS[e.code];
      if (kd) {
        e.preventDefault();
        queueDirection(kd);
        return;
      }
      if (e.code === "Space") {
        if (document.activeElement === initialsInput) return;
        e.preventDefault();
        if (phase === "playing" || phase === "paused") togglePause();
        else handlePrimaryInput();
        return;
      }
      if (e.code === "Enter") {
        if (document.activeElement === initialsInput) return;
        e.preventDefault();
        handlePrimaryInput();
      }
    });

    var swipeStartX = 0, swipeStartY = 0, swiping = false;
    canvas.addEventListener("pointerdown", function (e) {
      swipeStartX = e.clientX;
      swipeStartY = e.clientY;
      swiping = true;
    });
    canvas.addEventListener("pointerup", function (e) {
      if (!swiping) return;
      swiping = false;
      var dx = e.clientX - swipeStartX;
      var dy = e.clientY - swipeStartY;
      var adx = Math.abs(dx), ady = Math.abs(dy);
      if (Math.max(adx, ady) < 20) {
        if (phase === "playing" || phase === "paused") togglePause();
        else handlePrimaryInput();
        return;
      }
      if (adx > ady) queueDirection({ x: dx > 0 ? 1 : -1, y: 0 });
      else queueDirection({ x: 0, y: dy > 0 ? 1 : -1 });
    });

    // Belt-and-braces on top of `touch-action: none` in CSS: some mobile browsers still
    // let a fast swipe over a canvas bubble up into a page scroll gesture, which is
    // exactly the "I keep losing by accident because the page scrolled" complaint , 
    // explicitly swallowing touchstart/touchmove on the canvas closes that gap for good.
    canvas.addEventListener("touchstart", function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    canvas.addEventListener("touchmove", function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });

    /* ---------- fullscreen ----------
       Prefers the real browser Fullscreen API so the game takes over the actual physical
       display it's opened on, no address bar, no tabs, just the game, adapting to
       whatever screen/resolution the visitor has (the "like Netflix" behavior that was
       asked for). Falls back to the earlier CSS-only fixed-overlay approach only where
       the native API is unavailable for arbitrary elements (mainly iOS Safari). */
    var storedHeight = wrap.dataset.height;
    var isFullscreen = false;
    var usingNativeFullscreen = false;

    function nativeRequestFullscreen(el) {
      return el.requestFullscreen ? el.requestFullscreen()
        : el.webkitRequestFullscreen ? el.webkitRequestFullscreen()
        : null;
    }
    function nativeExitFullscreen() {
      return document.exitFullscreen ? document.exitFullscreen()
        : document.webkitExitFullscreen ? document.webkitExitFullscreen()
        : null;
    }
    function nativeFullscreenElement() {
      return document.fullscreenElement || document.webkitFullscreenElement || null;
    }
    function supportsNativeFullscreen() {
      return !!(wrap.requestFullscreen || wrap.webkitRequestFullscreen);
    }

    function applyFullscreenSize() {
      var controlsH = gameControls ? gameControls.getBoundingClientRect().height : 60;
      var viewportH = usingNativeFullscreen ? window.innerHeight : (window.visualViewport ? window.visualViewport.height : window.innerHeight);
      var h = Math.max(240, Math.round(viewportH - controlsH));
      wrap.dataset.height = String(h);
      resize();
    }
    function restoreSize() {
      wrap.dataset.height = storedHeight;
      resize();
    }
    function enterFullscreenUI() {
      isFullscreen = true;
      wrap.classList.add("is-fullscreen");
      if (fullscreenBtn) {
        fullscreenBtn.classList.add("is-active");
        fullscreenBtn.setAttribute("aria-label", fullscreenBtn.dataset.offAria || "");
      }
      try { document.documentElement.style.overflow = "hidden"; } catch (e) { /* ignore */ }
      try { document.body.style.overflow = "hidden"; } catch (e) { /* ignore */ }
      applyFullscreenSize();
      // grid dimensions just changed; restart cleanly rather than risk stale state.
      if (phase === "playing" || phase === "paused" || phase === "countdown") {
        resetState();
        setPhase("ready");
      }
    }
    function exitFullscreenUI() {
      isFullscreen = false;
      usingNativeFullscreen = false;
      wrap.classList.remove("is-fullscreen");
      if (fullscreenBtn) {
        fullscreenBtn.classList.remove("is-active");
        fullscreenBtn.setAttribute("aria-label", fullscreenBtn.dataset.onAria || "");
      }
      try { document.documentElement.style.overflow = ""; } catch (e) { /* ignore */ }
      try { document.body.style.overflow = ""; } catch (e) { /* ignore */ }
      restoreSize();
      if (phase === "playing" || phase === "paused" || phase === "countdown") {
        resetState();
        setPhase("ready");
      }
    }
    function setFullscreen(next) {
      if (next === isFullscreen) return;
      if (next) {
        // Some mobile WebKit builds (notably iOS Safari) expose `webkitRequestFullscreen`
        // on arbitrary elements as a leftover of the <video>-only fullscreen API, but
        // calling it on a non-video element throws SYNCHRONOUSLY rather than returning a
        // rejected promise. An unguarded call there aborts this whole click handler with
        // nothing else running, which reads to the visitor as "the button does nothing".
        // Wrapping in try/catch guarantees the CSS-only fallback always kicks in instead.
        var usedNative = false;
        if (supportsNativeFullscreen()) {
          try {
            var req = nativeRequestFullscreen(wrap);
            if (req && typeof req.then === "function") {
              usingNativeFullscreen = true;
              usedNative = true;
              req.then(enterFullscreenUI).catch(function () { usingNativeFullscreen = false; enterFullscreenUI(); });
            } else if (nativeFullscreenElement()) {
              // older, non-promise-based fullscreen implementations resolve synchronously
              usingNativeFullscreen = true;
              usedNative = true;
              enterFullscreenUI();
            }
          } catch (e) {
            usedNative = false;
          }
        }
        if (!usedNative) {
          usingNativeFullscreen = false;
          enterFullscreenUI();
        }
      } else if (usingNativeFullscreen && nativeFullscreenElement()) {
        try { nativeExitFullscreen(); } catch (e) { exitFullscreenUI(); }
        // exitFullscreenUI() otherwise runs via the fullscreenchange listener below once the browser confirms.
      } else {
        exitFullscreenUI();
      }
    }
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener("click", function () { setFullscreen(!isFullscreen); });
    }
    ["fullscreenchange", "webkitfullscreenchange"].forEach(function (evt) {
      document.addEventListener(evt, function () {
        if (isFullscreen && usingNativeFullscreen && nativeFullscreenElement() !== wrap) {
          // left fullscreen via Escape / swipe-gesture / browser UI rather than our own button
          exitFullscreenUI();
        } else if (nativeFullscreenElement() === wrap) {
          applyFullscreenSize();
        }
      });
    });
    window.addEventListener("keydown", function (e) {
      if (e.code === "Escape" && isFullscreen && !usingNativeFullscreen) setFullscreen(false);
    });
    window.addEventListener("resize", function () {
      if (isFullscreen) applyFullscreenSize();
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", function () {
        if (isFullscreen) applyFullscreenSize();
      });
    }

    dpadBtns.forEach(function (btn) {
      var map = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
      var d = map[btn.dataset.dir];
      btn.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        if (phase === "playing") queueDirection(d);
        else if (phase !== "paused") handlePrimaryInput();
      });
    });

    if (startBtn) startBtn.addEventListener("click", handlePrimaryInput);
    if (restartBtn) restartBtn.addEventListener("click", handlePrimaryInput);
    if (saveScoreBtn) saveScoreBtn.addEventListener("click", saveScore);
    if (initialsInput) {
      initialsInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); saveScore(); }
      });
      initialsInput.addEventListener("input", function () {
        initialsInput.value = initialsInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
      });
    }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          isInView = entries[0].isIntersecting;
          if (!isInView && phase === "playing") togglePause();
        },
        { threshold: 0.3 }
      );
      io.observe(wrap);
    }

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        resize();
        if (phase === "playing" || phase === "paused" || phase === "countdown") {
          // grid dimensions changed mid-run; restart cleanly rather than risk an
          // out-of-bounds snake/food/obstacle position on the new grid.
          resetState();
          setPhase("ready");
        } else {
          resetState();
        }
      }, 150);
    });

    resize();
    resetState();
    setPhase("ready");
    renderLeaderboard(loadLeaderboard());
    lastTs = performance.now();
    raf = requestAnimationFrame(loop);

    /* Opt-in test seam: completely inert in production (no template ever sets
       data-test-hooks), only used by the headless harness to deterministically
       drive collisions/shield-consumption without depending on animation-frame
       timing or Math.random, this is what finally lets us assert (not just
       hope) that "wall kills you" and "shield blocks exactly one hit" actually
       hold, instead of relying on code review alone. */
    if (wrap.dataset.testHooks === "1") {
      wrap.__test = {
        getPhase: function () { return phase; },
        getScore: function () { return score; },
        getCols: function () { return cols; },
        getRows: function () { return rows; },
        getShieldActive: function () { return shieldActive; },
        setShieldActive: function (v) { shieldActive = !!v; },
        setDir: function (nd) { dir = nd; pendingDir = nd; },
        skipToPlaying: function () { setPhase("playing"); },
        forceTick: function () { tick(); },
        getHead: function () { return { x: snake[0].x, y: snake[0].y }; },
        setSnake: function (arr) {
          snake = arr.map(function (c) { return { x: c.x, y: c.y }; });
          prevSnake = snake.slice();
        }
      };
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-snake-game]").forEach(initGame);
  });
})();
