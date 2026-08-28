import React, { useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import axios from "axios";
import { CFG, BOARD, INK, ASSETS } from "../game/constants";
import { sound } from "../game/sound";
import { drawBoard, drawPen, drawAim } from "../game/render";
import MainMenu from "../components/game/MainMenu";
import Hud from "../components/game/Hud";
import GameOverModal from "../components/game/GameOverModal";
import { useMultiplayer } from "../hooks/useMultiplayer";

const { Engine, World, Bodies, Body, Query, Events } = Matter;
const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

const speedOf = (b) => Math.hypot(b.velocity.x, b.velocity.y);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function makePen(x, y, owner, id) {
  const b = Bodies.rectangle(x, y, CFG.penLen, CFG.penW, {
    frictionAir: CFG.frictionAir,
    friction: 0.08,
    frictionStatic: 0.5,
    restitution: 0.32,
    density: 0.004,
    chamfer: { radius: CFG.penW / 2 },
    slop: 0.02,
  });
  Body.setAngle(b, Math.PI / 2); // point toward opponent
  b.penData = { owner, hue: owner === "p1" ? INK.p1 : INK.p2, id: id || Math.random().toString(36).slice(2) };
  return b;
}

export default function PenFight() {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const mp = useMultiplayer();

  const g = useRef({
    engine: null,
    pens: [],
    phase: "menu",
    turn: "p1",
    turnState: "aim",
    mode: "ai",
    difficulty: "medium",
    aiming: null,
    moveStart: 0,
    startTime: 0,
  });

  const [phase, setPhase] = useState("menu");
  const [turn, setTurn] = useState("p1");
  const [turnState, setTurnState] = useState("aim");
  const [scores, setScores] = useState({ p1: CFG.pensPerSide, p2: CFG.pensPerSide });
  const [power, setPower] = useState(0);
  const [muted, setMuted] = useState(false);
  const [mode, setMode] = useState("ai");
  const [difficulty, setDifficulty] = useState("medium");
  const [winner, setWinner] = useState(null);

  // Auto-start online match when opponent joins
  useEffect(() => {
    if (mp.opponentJoined && phase === "menu") {
      startGame("online", null);
    }
  }, [mp.opponentJoined, phase]);

  // Handle opponent flick in online mode
  useEffect(() => {
    if (!mp.opponentFlick || mode !== "online") return;
    const st = g.current;
    const { penId, v, omega, ratio } = mp.opponentFlick;
    const pen = st.pens.find((p) => p.penData.id === penId);
    if (pen) {
      Body.setVelocity(pen, v);
      Body.setAngularVelocity(pen, omega);
      sound.play("flick", ratio || 0.8);
      st.turnState = "moving";
      st.moveStart = performance.now();
      setTurnState("moving");
    }
  }, [mp.opponentFlick, mode]);

  // Handle state sync from opponent
  useEffect(() => {
    if (!mp.syncedState || mode !== "online") return;
    const st = g.current;
    const { pens, turn: nextTurn, p1Score, p2Score } = mp.syncedState;

    if (pens && Array.isArray(pens)) {
      pens.forEach((pData) => {
        const localPen = st.pens.find((p) => p.penData.id === pData.id);
        if (localPen) {
          Body.setPosition(localPen, { x: pData.x, y: pData.y });
          Body.setAngle(localPen, pData.angle);
          Body.setVelocity(localPen, { x: 0, y: 0 });
          Body.setAngularVelocity(localPen, 0);
        }
      });
    }
    st.turn = nextTurn;
    st.turnState = "aim";
    setTurn(nextTurn);
    setTurnState("aim");
    if (p1Score !== undefined && p2Score !== undefined) {
      setScores({ p1: p1Score, p2: p2Score });
    }
  }, [mp.syncedState, mode]);

  // Handle rematch trigger
  useEffect(() => {
    if (mp.rematchTrigger > 0 && mode === "online") {
      startGame("online", null);
    }
  }, [mp.rematchTrigger, mode]);

  // Handle opponent disconnection
  useEffect(() => {
    if (mp.opponentLeft && phase === "playing" && mode === "online") {
      finishGame(mp.role || "p1");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mp.opponentLeft, phase, mode, mp.role]);

  const finishGame = (w) => {
    const st = g.current;
    st.turnState = "done";
    st.phase = "gameover";
    setPhase("gameover");
    setWinner(w);
    const playerWon = st.mode === "ai" ? w === "p1" : st.mode === "online" ? w === mp.role : true;
    sound.play(!playerWon ? "lose" : "win");

    const body = {
      mode: st.mode,
      difficulty: st.mode === "ai" ? st.difficulty : null,
      winner: w,
      p1_pens_left: st.pens.filter((p) => p.penData.owner === "p1").length,
      p2_pens_left: st.pens.filter((p) => p.penData.owner === "p2").length,
      duration_sec: Math.round((Date.now() - st.startTime) / 1000),
    };
    axios.post(`${API}/matches`, body).catch(() => {});
  };

  useEffect(() => {
    const engine = Engine.create();
    engine.gravity.x = 0;
    engine.gravity.y = 0;
    g.current.engine = engine;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;

    Events.on(engine, "collisionStart", (e) => {
      for (const p of e.pairs) {
        const v = Math.max(speedOf(p.bodyA), speedOf(p.bodyB));
        if (v > 0.6) sound.play("clack", Math.min(1, v / 16));
      }
    });

    const handleEliminations = () => {
      const st = g.current;
      if (!st.pens.length) return;
      const remaining = [];
      let changed = false;
      for (const pen of st.pens) {
        const { x, y } = pen.position;
        if (x < BOARD.x || x > BOARD.x + BOARD.w || y < BOARD.y || y > BOARD.y + BOARD.h) {
          World.remove(engine.world, pen);
          changed = true;
          sound.play("thud");
        } else remaining.push(pen);
      }
      if (changed) {
        st.pens = remaining;
        setScores({
          p1: remaining.filter((p) => p.penData.owner === "p1").length,
          p2: remaining.filter((p) => p.penData.owner === "p2").length,
        });
      }
    };

    const aiMove = () => {
      const st = g.current;
      if (st.phase !== "playing" || st.turn !== "p2") return;
      const mine = st.pens.filter((p) => p.penData.owner === "p2");
      const foes = st.pens.filter((p) => p.penData.owner === "p1");
      if (!mine.length || !foes.length) return;
      let best = null,
        bestD = Infinity,
        target = null;
      for (const m of mine)
        for (const f of foes) {
          const d = dist(m.position, f.position);
          if (d < bestD) {
            bestD = d;
            best = m;
            target = f;
          }
        }
      const diff = st.difficulty;
      const jitter = diff === "easy" ? 0.3 : diff === "hard" ? 0.05 : 0.15;
      const powerMul = diff === "easy" ? 0.72 : diff === "hard" ? 1.0 : 0.9;
      let ang = Math.atan2(target.position.y - best.position.y, target.position.x - best.position.x);
      ang += (Math.random() * 2 - 1) * jitter;
      const speed = CFG.maxSpeed * powerMul * (0.85 + Math.random() * 0.15);
      const v = { x: Math.cos(ang) * speed, y: Math.sin(ang) * speed };
      const m = best.mass;
      const I = best.inertia || 1;
      const offMax = CFG.penLen * 0.42 * (diff === "hard" ? 0.4 : diff === "medium" ? 0.75 : 1);
      const off = (Math.random() * 2 - 1) * offMax;
      const axis = { x: Math.cos(best.angle), y: Math.sin(best.angle) };
      const r = { x: axis.x * off, y: axis.y * off };
      const cross = r.x * v.y * m - r.y * v.x * m;
      let omega = (cross / I) * CFG.spinFactor;
      omega = Math.max(-CFG.maxOmega, Math.min(CFG.maxOmega, omega));
      Body.setVelocity(best, v);
      Body.setAngularVelocity(best, omega);
      sound.play("flick", speed / CFG.maxSpeed);
      st.turnState = "moving";
      st.moveStart = performance.now();
      setTurnState("moving");
    };

    const endTurn = () => {
      const st = g.current;
      const p1Count = st.pens.filter((p) => p.penData.owner === "p1").length;
      const p2Count = st.pens.filter((p) => p.penData.owner === "p2").length;
      if (p1Count === 0 || p2Count === 0) {
        finishGame(p1Count === 0 ? "p2" : "p1");
        return;
      }
      const next = st.turn === "p1" ? "p2" : "p1";
      st.turn = next;
      st.turnState = "aim";
      setTurn(next);
      setTurnState("aim");

      // In online mode, the active player syncs the final settled coordinates with opponent
      if (st.mode === "online" && st.turn === mp.role) {
        const snapshot = st.pens.map((p) => ({
          id: p.penData.id,
          x: p.position.x,
          y: p.position.y,
          angle: p.angle,
          owner: p.penData.owner,
        }));
        mp.sendSync({
          pens: snapshot,
          turn: next,
          p1Score: p1Count,
          p2Score: p2Count,
        });
      }

      if (st.mode === "ai" && next === "p2") setTimeout(aiMove, 750);
    };

    const checkRest = (now) => {
      const st = g.current;
      const moving = st.pens.some((p) => speedOf(p) > CFG.restThreshold || Math.abs(p.angularVelocity) > 0.035);
      const timedOut = now - st.moveStart > CFG.maxMovingMs;
      if (!moving || timedOut) {
        st.pens.forEach((p) => {
          Body.setVelocity(p, { x: 0, y: 0 });
          Body.setAngularVelocity(p, 0);
        });
        endTurn();
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, CFG.W, CFG.H);
      drawBoard(ctx);
      const st = g.current;
      for (const pen of st.pens) drawPen(ctx, pen);
      if (st.aiming) drawAim(ctx, st.aiming);

      // Draw real-time opponent aim arrow in online mode
      if (st.mode === "online" && mp.opponentAim) {
        const oppPen = st.pens.find((p) => p.penData.id === mp.opponentAim.penId);
        if (oppPen) {
          drawAim(ctx, {
            pen: oppPen,
            start: mp.opponentAim.start,
            current: mp.opponentAim.current,
          });
        }
      }
    };

    const loop = (now) => {
      const st = g.current;
      if (st.phase === "playing" || st.phase === "gameover") {
        Engine.update(engine, 16.666);
        handleEliminations();
        if (st.turnState === "moving") checkRest(now);
      }
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // ---- Pointer / touch input ----
    const wrap = wrapperRef.current;
    const getPoint = (e) => {
      const r = wrap.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (cx - r.left) * (CFG.W / r.width), y: (cy - r.top) * (CFG.H / r.height) };
    };
    const setZoom = (z) => {
      canvas.style.transform = scale();
    };

    const onDown = (e) => {
      const st = g.current;
      if (st.phase !== "playing" || st.turnState !== "aim") return;
      if (st.mode === "ai" && st.turn !== "p1") return;
      // In online mode, restrict input to the player's own turn
      if (st.mode === "online" && st.turn !== mp.role) return;

      const pt = getPoint(e);
      const own = st.pens.filter((p) => p.penData.owner === st.turn);
      const hit = Query.point(own, pt)[0];
      if (!hit) return;
      const r = wrap.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      st.aiming = { pen: hit, start: pt, current: pt, startClient: { x: cx, y: cy }, baseScale: CFG.W / r.width };
      sound.play("grab");
      e.preventDefault();
    };

    const onMove = (e) => {
      const st = g.current;
      if (!st.aiming) return;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const bs = st.aiming.baseScale;
      const logdx = (cx - st.aiming.startClient.x) * bs;
      const logdy = (cy - st.aiming.startClient.y) * bs;
      const rawMag = Math.hypot(logdx, logdy);
      const cap = Math.min(rawMag, CFG.maxDrag);
      const nx = rawMag > 0 ? logdx / rawMag : 0;
      const ny = rawMag > 0 ? logdy / rawMag : 0;
      st.aiming.current = { x: st.aiming.start.x + nx * cap, y: st.aiming.start.y + ny * cap };
      setPower(cap / CFG.maxDrag);
      const zr = Math.min(1.8, rawMag / CFG.maxDrag);
      setZoom(Math.max(CFG.zoomMin, 1 - CFG.zoomAmt * zr));

      // Broadcast live aim to opponent in online mode
      if (st.mode === "online") {
        mp.sendAim({
          penId: st.aiming.pen.penData.id,
          start: st.aiming.start,
          current: st.aiming.current,
        });
      }
      e.preventDefault();
    };

    const onUp = () => {
      const st = g.current;
      if (!st.aiming) return;
      const pen = st.aiming.pen;
      const grab = st.aiming.start;
      const dv = { x: grab.x - st.aiming.current.x, y: grab.y - st.aiming.current.y };
      const rawMag = Math.hypot(dv.x, dv.y);
      st.aiming = null;
      setPower(0);
      setZoom(1);

      if (st.mode === "online") {
        mp.sendAim(null);
      }

      if (rawMag < 10) return;
      const mag = Math.min(CFG.maxDrag, rawMag);
      const ratio = mag / CFG.maxDrag;
      const dir = { x: dv.x / rawMag, y: dv.y / rawMag };
      const speed = ratio * CFG.maxSpeed;
      const v = { x: dir.x * speed, y: dir.y * speed };
      const m = pen.mass;
      const I = pen.inertia || 1;
      const r = { x: grab.x - pen.position.x, y: grab.y - pen.position.y };
      const cross = r.x * v.y * m - r.y * v.x * m;
      let omega = (cross / I) * CFG.spinFactor;
      omega = Math.max(-CFG.maxOmega, Math.min(CFG.maxOmega, omega));

      Body.setVelocity(pen, v);
      Body.setAngularVelocity(pen, omega);
      sound.play("flick", ratio);
      st.turnState = "moving";
      st.moveStart = performance.now();
      setTurnState("moving");

      // Broadcast flick impulse to opponent
      if (st.mode === "online") {
        mp.sendFlick({
          penId: pen.penData.id,
          v,
          omega,
          ratio,
          grab,
        });
      }
    };

    wrap.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    wrap.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      wrap.removeEventListener("touchstart", onDown);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      Events.off(engine);
      World.clear(engine.world, false);
      Engine.clear(engine);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mp.role]);

  const startGame = (m, diff) => {
    sound.ensure();
    const st = g.current;
    const engine = st.engine;
    World.clear(engine.world, false);
    const pens = [];
    const n = CFG.pensPerSide;
    const spacing = BOARD.w / (n + 1);
    for (let i = 0; i < n; i++) {
      const x = BOARD.x + spacing * (i + 1);
      pens.push(makePen(x, BOARD.y + BOARD.h - 72, "p1", p1_pen_));
      pens.push(makePen(x, BOARD.y + 72, "p2", p2_pen_));
    }
    World.add(engine.world, pens);
    Object.assign(st, {
      pens,
      phase: "playing",
      turn: "p1",
      turnState: "aim",
      mode: m,
      difficulty: diff,
      startTime: Date.now(),
      aiming: null,
    });
    setPhase("playing");
    setTurn("p1");
    setTurnState("aim");
    setMode(m);
    setDifficulty(diff);
    setScores({ p1: n, p2: n });
    setWinner(null);
    setPower(0);
  };

  const quitToMenu = () => {
    const st = g.current;
    World.clear(st.engine.world, false);
    st.pens = [];
    st.phase = "menu";
    st.aiming = null;
    if (st.mode === "online") {
      mp.leaveRoom();
    }
    setPhase("menu");
  };

  const toggleMute = () => {
    setMuted((m) => {
      sound.setMuted(!m);
      return !m;
    });
  };

  const handleReplay = () => {
    if (mode === "online") {
      mp.sendRematch();
    } else {
      startGame(g.current.mode, g.current.difficulty);
    }
  };

  return (
    <div
      className="relative h-screen w-screen overflow-hidden select-none"
      style={{ backgroundImage: `url(${ASSETS.desk})`, backgroundSize: "cover", backgroundPosition: "center" }}
      data-testid="penfight-app"
    >
      <div className="absolute inset-0 bg-[#1a0f08]/45" />

      {/* Game canvas */}
      <div className="absolute inset-0 flex items-center justify-center p-3">
        <div ref={wrapperRef} className="relative w-full max-w-[min(94vw,calc(88vh*1.5))] aspect-[3/2]">
          <canvas
            ref={canvasRef}
            width={CFG.W}
            height={CFG.H}
            className="h-full w-full touch-none rounded-lg"
            style={{
              cursor: turnState === "aim" && (mode !== "online" || turn === mp.role) ? "grab" : "default",
              transformOrigin: "center center",
              transition: "transform 0.14s ease-out",
              willChange: "transform",
            }}
            data-testid="game-canvas"
          />
          {phase === "playing" && (
            <Hud
              scores={scores}
              turn={turn}
              turnState={turnState}
              mode={mode}
              difficulty={difficulty}
              muted={muted}
              power={power}
              onToggleMute={toggleMute}
              onQuit={quitToMenu}
              mp={mp}
            />
          )}
        </div>
      </div>

      {phase === "menu" && <MainMenu onStart={startGame} muted={muted} onToggleMute={toggleMute} mp={mp} />}
      {phase === "gameover" && (
        <GameOverModal
          winner={winner}
          mode={mode}
          scores={scores}
          onReplay={handleReplay}
          onMenu={quitToMenu}
          mp={mp}
        />
      )}
    </div>
  );
}
