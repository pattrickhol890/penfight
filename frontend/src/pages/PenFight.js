import React, { useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import axios from "axios";
import { CFG, BOARD, INK, ASSETS } from "../game/constants";
import { sound } from "../game/sound";
import { drawBoard, drawPen, drawAim } from "../game/render";
import MainMenu from "../components/game/MainMenu";
import Hud from "../components/game/Hud";
import GameOverModal from "../components/game/GameOverModal";

const { Engine, World, Bodies, Body, Query, Events } = Matter;
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const speedOf = (b) => Math.hypot(b.velocity.x, b.velocity.y);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function makePen(x, y, owner) {
  const b = Bodies.rectangle(x, y, CFG.penLen, CFG.penW, {
    frictionAir: CFG.frictionAir,
    friction: 0.05,
    restitution: 0.45,
    density: 0.004,
    chamfer: { radius: CFG.penW / 2 },
  });
  Body.setAngle(b, Math.PI / 2); // point toward opponent
  b.penData = { owner, hue: owner === "p1" ? INK.p1 : INK.p2, id: Math.random().toString(36).slice(2) };
  return b;
}

export default function PenFight() {
  const canvasRef = useRef(null);
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
        if (v > 1.4) sound.play("click", v / 18);
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

    const finishGame = (w) => {
      const st = g.current;
      st.turnState = "done";
      st.phase = "gameover";
      setPhase("gameover");
      setWinner(w);
      const playerWon = st.mode === "ai" ? w === "p1" : true;
      sound.play(st.mode === "ai" && !playerWon ? "lose" : "win");
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
      Body.setVelocity(best, { x: Math.cos(ang) * speed, y: Math.sin(ang) * speed });
      Body.setAngularVelocity(best, (Math.random() * 2 - 1) * 0.05);
      sound.play("flick", speed / CFG.maxSpeed);
      st.turnState = "moving";
      st.moveStart = performance.now();
      setTurnState("moving");
    };

    const endTurn = () => {
      const st = g.current;
      const p1 = st.pens.filter((p) => p.penData.owner === "p1").length;
      const p2 = st.pens.filter((p) => p.penData.owner === "p2").length;
      if (p1 === 0 || p2 === 0) {
        finishGame(p1 === 0 ? "p2" : "p1");
        return;
      }
      const next = st.turn === "p1" ? "p2" : "p1";
      st.turn = next;
      st.turnState = "aim";
      setTurn(next);
      setTurnState("aim");
      if (st.mode === "ai" && next === "p2") setTimeout(aiMove, 750);
    };

    const checkRest = (now) => {
      const st = g.current;
      const moving = st.pens.some((p) => speedOf(p) > CFG.restThreshold);
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
    const getPoint = (e) => {
      const r = canvas.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (cx - r.left) * (canvas.width / r.width), y: (cy - r.top) * (canvas.height / r.height) };
    };

    const onDown = (e) => {
      const st = g.current;
      if (st.phase !== "playing" || st.turnState !== "aim") return;
      if (st.mode === "ai" && st.turn !== "p1") return;
      const pt = getPoint(e);
      const own = st.pens.filter((p) => p.penData.owner === st.turn);
      const hit = Query.point(own, pt)[0];
      if (!hit) return;
      st.aiming = { pen: hit, start: pt, current: pt };
      e.preventDefault();
    };
    const onMove = (e) => {
      const st = g.current;
      if (!st.aiming) return;
      st.aiming.current = getPoint(e);
      const dv = { x: st.aiming.pen.position.x - st.aiming.current.x, y: st.aiming.pen.position.y - st.aiming.current.y };
      setPower(Math.min(CFG.maxDrag, Math.hypot(dv.x, dv.y)) / CFG.maxDrag);
      e.preventDefault();
    };
    const onUp = () => {
      const st = g.current;
      if (!st.aiming) return;
      const pen = st.aiming.pen;
      const dv = { x: pen.position.x - st.aiming.current.x, y: pen.position.y - st.aiming.current.y };
      const mag = Math.min(CFG.maxDrag, Math.hypot(dv.x, dv.y));
      st.aiming = null;
      setPower(0);
      if (mag < 10) return;
      const ratio = mag / CFG.maxDrag;
      const dir = { x: dv.x / mag, y: dv.y / mag };
      const speed = ratio * CFG.maxSpeed;
      Body.setVelocity(pen, { x: dir.x * speed, y: dir.y * speed });
      Body.setAngularVelocity(pen, (Math.random() * 2 - 1) * 0.05);
      sound.play("flick", ratio);
      st.turnState = "moving";
      st.moveStart = performance.now();
      setTurnState("moving");
    };

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("touchstart", onDown);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      Events.off(engine);
      World.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, []);

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
      pens.push(makePen(x, BOARD.y + BOARD.h - 72, "p1"));
      pens.push(makePen(x, BOARD.y + 72, "p2"));
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
    setPhase("menu");
  };

  const toggleMute = () => {
    setMuted((m) => {
      sound.setMuted(!m);
      return !m;
    });
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
        <div className="relative w-full max-w-[min(94vw,calc(88vh*1.5))] aspect-[3/2]">
          <canvas
            ref={canvasRef}
            width={CFG.W}
            height={CFG.H}
            className="h-full w-full touch-none rounded-lg"
            style={{ cursor: turnState === "aim" ? "grab" : "default" }}
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
            />
          )}
        </div>
      </div>

      {phase === "menu" && <MainMenu onStart={startGame} muted={muted} onToggleMute={toggleMute} />}
      {phase === "gameover" && (
        <GameOverModal
          winner={winner}
          mode={mode}
          scores={scores}
          onReplay={() => startGame(g.current.mode, g.current.difficulty)}
          onMenu={quitToMenu}
        />
      )}
    </div>
  );
}
