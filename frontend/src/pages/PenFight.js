import React, { useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import axios from "axios";
import { CFG, BOARD, INK, ASSETS, CANVAS_PAD, CANVAS_DIM, SUB_STEPS } from "../game/constants";
import { sound } from "../game/sound";
import { drawBoard, drawPen, drawAim } from "../game/render";
import { Pen3DRenderer } from "../game/Pen3DRenderer";
import MainMenu from "../components/game/MainMenu";
import Hud from "../components/game/Hud";
import GameOverModal from "../components/game/GameOverModal";
import RotateOverlay from "../components/game/RotateOverlay";
import TableJoystick from "../components/game/TableJoystick";
import { useMultiplayer } from "../hooks/useMultiplayer";
import {
  isMobileDevice,
  isPortraitMode,
  requestFullscreenAndLockLandscape,
  exitFullscreenAndUnlockOrientation,
} from "../game/fullscreenOrientation";

const { Engine, World, Bodies, Body, Query, Events } = Matter;
const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

const speedOf = (b) => Math.hypot(b.velocity.x, b.velocity.y);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function makePen(x, y, owner, id) {
  // 1. Main cylindrical barrel body
  const main = Bodies.rectangle(x, y, CFG.penLen, CFG.penW, {
    chamfer: { radius: CFG.penW / 2 },
    density: 0.0035,
    friction: 0.05,
    restitution: 0.35,
  });

  // 2. Physical protruding pocket clip (attached on the cap end along top ridge)
  const clipL = 36;
  const clipW = 4.2;
  const clip = Bodies.rectangle(
    x - CFG.penLen * 0.22,
    y - CFG.penW / 2 - clipW / 2 + 0.6,
    clipL,
    clipW,
    {
      chamfer: { radius: 1.5 },
      density: 0.0075, // Denser plastic/metal clip adds real asymmetric mass
      friction: 0.08,
      restitution: 0.42,
    }
  );

  // 3. Composite Rigid Body
  const b = Body.create({
    parts: [main, clip],
    frictionAir: CFG.frictionAir,
    friction: 0.05,
    frictionStatic: 0.3,
    restitution: 0.35,
    slop: 0.02,
  });

  Body.setAngle(b, Math.PI / 2); // point toward opponent

  b.penData = {
    owner,
    hue: owner === "p1" ? INK.p1 : INK.p2,
    id: id || Math.random().toString(36).slice(2),
    teeter: 0,
    falling: false,
    fallProgress: 0,
    fallDir: { x: 0, y: 0 },
    // 3D Z-axis height & axial roll dynamics
    rollAngle: 0, // 3D axial angle around cylinder barrel (rests flush on desk)
    rollOmega: 0, // axial roll velocity
    z: 0, // vertical height above desk surface (px)
    vz: 0, // vertical velocity in Z-axis
  };
  return b;
}

export default function PenFight() {
  const canvasRef = useRef(null);
  const webglCanvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const mp = useMultiplayer();
  const mpRef = useRef(mp);
  useEffect(() => {
    mpRef.current = mp;
  }, [mp]);

  const g = useRef({
    engine: null,
    pens: [],
    phase: "menu",
    turn: "p1",
    turnState: "aim",
    mode: "ai",
    difficulty: "medium",
    aiming: null,
    aimMode: localStorage.getItem("pf_aim_mode") || "forward",
    moveStart: 0,
    startTime: 0,
  });

  const [phase, setPhase] = useState("menu");
  const [turn, setTurn] = useState("p1");
  const [turnState, setTurnState] = useState("aim");
  const [scores, setScores] = useState({ p1: CFG.pensPerSide, p2: CFG.pensPerSide });
  const [power, setPower] = useState(0);
  const [muted, setMuted] = useState(false);
  const [aimMode, setAimMode] = useState(() => localStorage.getItem("pf_aim_mode") || "forward");
  const [mode, setMode] = useState("ai");
  const [difficulty, setDifficulty] = useState("medium");
  const [winner, setWinner] = useState(null);
  const [viewAngle, setViewAngle] = useState(0);
  const viewAngleRef = useRef(0);

  const handleRotate = (ang) => {
    setViewAngle(ang);
    viewAngleRef.current = ang;
  };

  const handleResetRotation = () => {
    setViewAngle(0);
    viewAngleRef.current = 0;
  };

  const [isForcedLandscape, setIsForcedLandscape] = useState(false);
  const isForcedLandscapeRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(() => isPortraitMode());

  const handleEnterFullscreenLandscape = async () => {
    await requestFullscreenAndLockLandscape();
    setIsFullscreen(true);
    if (isPortraitMode()) {
      setIsForcedLandscape(true);
      isForcedLandscapeRef.current = true;
    }
  };

  const handleToggleFullscreen = async () => {
    const isFs = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement
    );
    if (isFs || isFullscreen) {
      await exitFullscreenAndUnlockOrientation();
      setIsFullscreen(false);
      setIsForcedLandscape(false);
      isForcedLandscapeRef.current = false;
    } else {
      await handleEnterFullscreenLandscape();
    }
  };

  useEffect(() => {
    const handleResizeOrOrient = () => {
      const portrait = isPortraitMode();
      setIsPortrait(portrait);

      // If physical device rotates to landscape, native landscape handles it
      if (!portrait) {
        setIsForcedLandscape(false);
        isForcedLandscapeRef.current = false;
      }
    };

    const handleFullscreenChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isFs);

      if (!isFs) {
        // Exited fullscreen: unlock orientation and turn off forced landscape
        exitFullscreenAndUnlockOrientation();
        setIsForcedLandscape(false);
        isForcedLandscapeRef.current = false;
      } else {
        // Entered fullscreen on mobile: if in portrait, lock/force landscape
        if (isPortraitMode() && isMobileDevice()) {
          requestFullscreenAndLockLandscape();
          setIsForcedLandscape(true);
          isForcedLandscapeRef.current = true;
        }
      }
    };

    window.addEventListener("resize", handleResizeOrOrient);
    window.addEventListener("orientationchange", handleResizeOrOrient);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("resize", handleResizeOrOrient);
      window.removeEventListener("orientationchange", handleResizeOrOrient);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleAimMode = () => {
    setAimMode((prev) => {
      const next = prev === "slingshot" ? "forward" : "slingshot";
      localStorage.setItem("pf_aim_mode", next);
      g.current.aimMode = next;
      return next;
    });
  };

  // Auto-start online match when opponent joins
  useEffect(() => {
    if (mp.opponentJoined && phase === "menu") {
      startGame("online", null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mp.opponentJoined, phase]);

  // Handle opponent flick in online mode
  useEffect(() => {
    if (!mp.opponentFlick || mode !== "online") return;
    const st = g.current;
    const { penId, v, omega, ratio, vz, rollOmega } = mp.opponentFlick;
    const pen = st.pens.find((p) => p.penData.id === penId);
    if (pen) {
      Body.setVelocity(pen, v);
      Body.setAngularVelocity(pen, omega);
      if (vz !== undefined) pen.penData.vz = vz;
      if (rollOmega !== undefined) pen.penData.rollOmega = rollOmega;
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
    const { pens, turn: nextTurn, p1Score, p2Score, winner: syncWinner } = mp.syncedState;

    if (p1Score !== undefined && p2Score !== undefined) {
      setScores({ p1: p1Score, p2: p2Score });
    }

    if (syncWinner) {
      finishGame(syncWinner);
      return;
    }

    if (pens && Array.isArray(pens)) {
      // Remove any pens that got knocked off on the shooter's screen
      const liveIds = new Set(pens.map((p) => p.id));
      const deadPens = st.pens.filter((p) => !liveIds.has(p.penData.id));
      deadPens.forEach((p) => {
        World.remove(st.engine.world, p);
      });
      st.pens = st.pens.filter((p) => liveIds.has(p.penData.id));

      pens.forEach((pData) => {
        const localPen = st.pens.find((p) => p.penData.id === pData.id);
        if (localPen) {
          Body.setPosition(localPen, { x: pData.x, y: pData.y });
          Body.setAngle(localPen, pData.angle);
          Body.setVelocity(localPen, { x: 0, y: 0 });
          Body.setAngularVelocity(localPen, 0);
          if (pData.rollAngle !== undefined) localPen.penData.rollAngle = pData.rollAngle;
          if (pData.z !== undefined) localPen.penData.z = pData.z;
        }
      });
    }
    st.turn = nextTurn;
    st.turnState = "aim";
    setTurn(nextTurn);
    setTurnState("aim");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mp.syncedState, mode]);

  // Handle rematch trigger
  useEffect(() => {
    if (mp.rematchTrigger > 0 && mode === "online") {
      startGame("online", null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const engine = Engine.create({
      positionIterations: 16,
      velocityIterations: 12,
      constraintIterations: 4,
    });
    engine.gravity.x = 0;
    engine.gravity.y = 0;
    g.current.engine = engine;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;

    let pen3D = null;
    if (webglCanvasRef.current) {
      try {
        pen3D = new Pen3DRenderer(webglCanvasRef.current);
      } catch (e) {
        console.warn("WebGL 3D renderer init fallback:", e);
      }
    }

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
        const ang = pen.angle;
        const ux = Math.cos(ang);
        const uy = Math.sin(ang);

        // Asymmetrical Center of Mass (shifted towards the cap)
        const comX = x - ux * (CFG.comOffset * CFG.penLen);
        const comY = y - uy * (CFG.comOffset * CFG.penLen);

        // Check if Center of Mass passed outside the desk boundaries
        const isComOut =
          comX < BOARD.x ||
          comX > BOARD.x + BOARD.w ||
          comY < BOARD.y ||
          comY > BOARD.y + BOARD.h;

        // Check if extremities overhang the edge for teetering wobbles
        const nibX = x + ux * (CFG.penLen / 2);
        const nibY = y + uy * (CFG.penLen / 2);
        const capX = x - ux * (CFG.penLen / 2);
        const capY = y - uy * (CFG.penLen / 2);

        const isOverEdge =
          nibX < BOARD.x || nibX > BOARD.x + BOARD.w || nibY < BOARD.y || nibY > BOARD.y + BOARD.h ||
          capX < BOARD.x || capX > BOARD.x + BOARD.w || capY < BOARD.y || capY > BOARD.y + BOARD.h;

        if (pen.penData.falling) {
          pen.penData.fallProgress += 0.045;
          if (pen.penData.fallProgress >= 1.0) {
            World.remove(engine.world, pen);
            changed = true;
            sound.play("thud");
          } else {
            remaining.push(pen);
          }
        } else if (isComOut) {
          // Center of mass lost equilibrium: initiate 3D tumble off the table edge!
          pen.penData.falling = true;
          pen.penData.fallProgress = 0.05;
          pen.penData.fallDir = {
            x: comX < BOARD.x ? -1 : comX > BOARD.x + BOARD.w ? 1 : 0,
            y: comY < BOARD.y ? -1 : comY > BOARD.y + BOARD.h ? 1 : 0,
          };
          Body.setVelocity(pen, {
            x: pen.velocity.x * 0.35 + pen.penData.fallDir.x * 1.6,
            y: pen.velocity.y * 0.35 + pen.penData.fallDir.y * 1.6,
          });
          remaining.push(pen);
        } else {
          // Stable on table (record teeter wobble)
          pen.penData.teeter = isOverEdge ? 0.35 : 0;
          remaining.push(pen);
        }
      }

      if (changed) {
        st.pens = remaining;
        setScores({
          p1: remaining.filter((p) => p.penData.owner === "p1" && !p.penData.falling).length,
          p2: remaining.filter((p) => p.penData.owner === "p2" && !p.penData.falling).length,
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
      const nominalSpeed = CFG.maxSpeed * powerMul * (0.85 + Math.random() * 0.15);
      const ratio = nominalSpeed / CFG.maxSpeed;
      const dir = { x: Math.cos(ang), y: Math.sin(ang) };
      const m = best.mass;
      const I = best.inertia || 1;
      const offMax = CFG.penLen * 0.42 * (diff === "hard" ? 0.4 : diff === "medium" ? 0.75 : 1);
      const off = (Math.random() * 2 - 1) * offMax;
      const axis = { x: Math.cos(best.angle), y: Math.sin(best.angle) };
      const r = { x: axis.x * off, y: axis.y * off };

      const leverArm = Math.abs(r.x * dir.y - r.y * dir.x);
      const leverRatio = Math.min(1.0, leverArm / 18);

      let linearEfficiency;
      if (ratio < 0.45) {
        linearEfficiency = Math.max(0.04, Math.pow(ratio / 0.45, 2) * (1 - leverRatio * 0.92));
      } else {
        linearEfficiency = ratio * (1 - leverRatio * 0.35);
      }

      const effectiveSpeed = linearEfficiency * CFG.maxSpeed;
      const v = { x: dir.x * effectiveSpeed, y: dir.y * effectiveSpeed };

      const torqueMultiplier = 1 + leverRatio * 2.8 * (1 - Math.min(1, ratio) * 0.4);
      const cross = r.x * (dir.y * nominalSpeed) * m - r.y * (dir.x * nominalSpeed) * m;
      let omega = (cross / I) * CFG.spinFactor * torqueMultiplier;
      omega = Math.max(-CFG.maxOmega, Math.min(CFG.maxOmega, omega));

      // 3D Z-Axis Elevation & Roll Spin when striking the clip / cap end
      const rLocalX = r.x * axis.x + r.y * axis.y;
      const isClipEnd = rLocalX < -CFG.penLen * 0.12;
      const clipLeverage = isClipEnd ? 1.0 : Math.max(0.3, leverRatio);
      best.penData.vz = Math.min(3.2, ratio * 2.6 * clipLeverage);
      const rollDirection = (best.penData.rollAngle || 0) < Math.PI / 2 ? 1 : -1;
      best.penData.rollOmega = rollDirection * ratio * 0.35;

      Body.setVelocity(best, v);
      Body.setAngularVelocity(best, omega);
      sound.play("flick", ratio);
      st.turnState = "moving";
      st.moveStart = performance.now();
      setTurnState("moving");
    };

    const endTurn = () => {
      const st = g.current;
      const p1Count = st.pens.filter((p) => p.penData.owner === "p1").length;
      const p2Count = st.pens.filter((p) => p.penData.owner === "p2").length;
      if (p1Count === 0 || p2Count === 0) {
        const w = p1Count === 0 ? "p2" : "p1";
        finishGame(w);
        if (st.mode === "online") {
          mpRef.current.sendSync({
            pens: [],
            winner: w,
            turn: "done",
            p1Score: p1Count,
            p2Score: p2Count,
          });
        }
        return;
      }
      const prevTurn = st.turn;
      const next = prevTurn === "p1" ? "p2" : "p1";
      st.turn = next;
      st.turnState = "aim";
      setTurn(next);
      setTurnState("aim");

      // In online mode, the player who just took the shot syncs the settled coordinates with the opponent
      if (st.mode === "online" && prevTurn === mpRef.current.role) {
        const snapshot = st.pens.map((p) => ({
          id: p.penData.id,
          x: p.position.x,
          y: p.position.y,
          angle: p.angle,
          owner: p.penData.owner,
          rollAngle: p.penData.rollAngle,
          z: p.penData.z,
        }));
        mpRef.current.sendSync({
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
      const moving = st.pens.some(
        (p) =>
          speedOf(p) > CFG.restThreshold ||
          Math.abs(p.angularVelocity) > 0.035 ||
          (p.penData && (Math.abs(p.penData.vz) > 0.15 || Math.abs(p.penData.rollOmega) > 0.04))
      );
      const timedOut = now - st.moveStart > CFG.maxMovingMs;
      if (!moving || timedOut) {
        st.pens.forEach((p) => {
          Body.setVelocity(p, { x: 0, y: 0 });
          Body.setAngularVelocity(p, 0);
          if (p.penData) {
            p.penData.vz = 0;
            p.penData.rollOmega = 0;
          }
        });
        if (st.mode === "online") {
          // In online mode, only the player whose turn it was ends the turn & broadcasts sync!
          if (st.turn === mpRef.current.role) {
            endTurn();
          }
        } else {
          endTurn();
        }
      }
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, CANVAS_DIM.w, CANVAS_DIM.h);
      const ang = viewAngleRef.current;
      ctx.save();
      // Center table in expanded drawing buffer and rotate around center (100% full scale):
      ctx.translate(CANVAS_DIM.w / 2, CANVAS_DIM.h / 2);
      if (ang) ctx.rotate(ang);
      ctx.translate(-CFG.W / 2, -CFG.H / 2);

      drawBoard(ctx);
      const st = g.current;

      // Real 3D Meshy AI Pen Renderer (Three.js WebGL)
      if (pen3D && pen3D.loaded) {
        pen3D.update(st.pens, ang, 1.0);
      } else {
        // High-fidelity procedural 2D fallback
        for (const pen of st.pens) drawPen(ctx, pen);
      }

      if (st.aiming) drawAim(ctx, st.aiming);

      // Draw real-time opponent aim arrow in online mode
      const oppAim = mpRef.current.opponentAim;
      if (st.mode === "online" && oppAim) {
        const oppPen = st.pens.find((p) => p.penData.id === oppAim.penId);
        if (oppPen) {
          drawAim(ctx, {
            pen: oppPen,
            start: oppAim.start,
            current: oppAim.current,
            aimMode: oppAim.aimMode || "forward",
          });
        }
      }
      ctx.restore();
    };

    const loop = (now) => {
      const st = g.current;
      if (st.phase === "playing" || st.phase === "gameover") {
        const subDt = 16.666 / SUB_STEPS;
        const subSlideFriction = CFG.slideFriction / SUB_STEPS;
        const subRollFriction = CFG.rollFriction / SUB_STEPS;
        const subAngularDamping = CFG.angularDamping / SUB_STEPS;
        const subGravityZ = CFG.gravityZ / SUB_STEPS;

        for (let step = 0; step < SUB_STEPS; step++) {
          // 1. Anisotropic Rolling vs Sliding Friction & Angular Resistance
          for (const pen of st.pens) {
            if (pen.penData.falling) continue;
            const ang = pen.angle;
            const ux = Math.cos(ang);
            const uy = Math.sin(ang);
            const rx = -uy;
            const ry = ux;

            const vx = pen.velocity.x;
            const vy = pen.velocity.y;

            // Project velocity into sliding (along barrel) and rolling (across width)
            const vSlide = vx * ux + vy * uy;
            const vRoll = vx * rx + vy * ry;

            // Apply physical damping separately
            const vSlideNew = vSlide * (1 - subSlideFriction);
            const vRollNew = vRoll * (1 - subRollFriction);

            let nextVx = vSlideNew * ux + vRollNew * rx;
            let nextVy = vSlideNew * uy + vRollNew * ry;

            // Desk Static Friction Lock:
            // If linear translation is small but pen is rotating (like a soft clip flick),
            // the heavy barrel contact area stays locked to the desk while rotation whips freely!
            const linearSpeed = Math.hypot(nextVx, nextVy);
            if (linearSpeed < 0.45 && Math.abs(pen.angularVelocity) > 0.025) {
              const lockFactor = Math.pow(0.6, 1 / SUB_STEPS);
              nextVx *= lockFactor;
              nextVy *= lockFactor;
            }

            // 3D Axial Rolling & Solid Desk Contact (Strictly Z >= 0, No -Z Penetration):
            const pd = pen.penData;
            if (pd.rollAngle === undefined) pd.rollAngle = 0;
            if (pd.rollOmega === undefined) pd.rollOmega = 0;
            if (pd.z === undefined) pd.z = 0;
            if (pd.vz === undefined) pd.vz = 0;

            const rollSpeed = Math.abs(vRoll);
            const radius = CFG.penW / 2;
            const targetRollOmega = (vRoll / radius) * 0.5;

            // Rolling contact drives roll angle
            if (pd.z < 0.6) {
              const omegaBlend = 0.25 / SUB_STEPS;
              pd.rollOmega = pd.rollOmega * (1 - omegaBlend) + targetRollOmega * omegaBlend;
            } else {
              pd.rollOmega *= Math.pow(0.98, 1 / SUB_STEPS);
            }

            pd.rollAngle += pd.rollOmega / SUB_STEPS;

            // SOLID WOOD DESK FLOOR CONSTRAINT:
            // The desk is at Z=0. The clip cannot pass through the desk into -Z.
            // When the clip strikes the table surface at rollAngle <= 0 or >= Math.PI:
            if (pd.rollAngle <= 0) {
              pd.rollAngle = 0;
              if (Math.abs(pd.rollOmega) > 0.04) {
                sound.play("clack", Math.min(0.35, Math.abs(pd.rollOmega) * 1.5));
                // Fast impact on desk kicks cap up into +Z
                if (rollSpeed > 0.6 && pd.z < 0.2) {
                  pd.vz = Math.min(3.0, rollSpeed * 0.6);
                }
              }
              pd.rollOmega = -pd.rollOmega * 0.3; // Rebound off desk surface
            } else if (pd.rollAngle >= Math.PI) {
              pd.rollAngle = Math.PI;
              if (Math.abs(pd.rollOmega) > 0.04) {
                sound.play("clack", Math.min(0.35, Math.abs(pd.rollOmega) * 1.5));
                // Fast impact on desk kicks cap up into +Z
                if (rollSpeed > 0.6 && pd.z < 0.2) {
                  pd.vz = Math.min(3.0, rollSpeed * 0.6);
                }
              }
              pd.rollOmega = -pd.rollOmega * 0.3; // Rebound off desk surface
            }

            // Vertical Z Gravity & Floor Collision (Z is strictly non-negative)
            pd.vz -= subGravityZ;
            pd.z += pd.vz / SUB_STEPS;
            if (pd.z <= 0) {
              pd.z = 0;
              if (pd.vz < -0.8) {
                sound.play("clack", Math.min(0.4, -pd.vz / 5.5));
              }
              pd.vz = -pd.vz * CFG.bounceZ;
              if (Math.abs(pd.vz) < 0.18) pd.vz = 0;
            }

            Body.setVelocity(pen, { x: nextVx, y: nextVy });

            // Angular surface resistance
            pen.angularVelocity *= (1 - subAngularDamping);
          }

          Engine.update(engine, subDt);
        }

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
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      let rawX, rawY;

      if (isForcedLandscapeRef.current && window.innerHeight > window.innerWidth) {
        // In CSS 90-degree forced landscape:
        // The container is rotated 90deg clockwise around the center of the screen.
        const r = wrap.getBoundingClientRect();
        const centerX = r.left + r.width / 2;
        const centerY = r.top + r.height / 2;

        const dx = cx - centerX;
        const dy = cy - centerY;

        // Inverse rotate by -90deg to map back to unrotated element space:
        // (dx_local, dy_local) = (dy, -dx)
        const localW = wrap.offsetWidth;
        const localH = wrap.offsetHeight;
        const localX = localW / 2 + dy;
        const localY = localH / 2 - dx;

        rawX = localX * (CFG.W / localW);
        rawY = localY * (CFG.H / localH);
      } else {
        const r = wrap.getBoundingClientRect();
        rawX = (cx - r.left) * (CFG.W / r.width);
        rawY = (cy - r.top) * (CFG.H / r.height);
      }

      const ang = viewAngleRef.current;
      if (!ang) return { x: rawX, y: rawY };
      const rawDx = rawX - CFG.W / 2;
      const rawDy = rawY - CFG.H / 2;
      const cos = Math.cos(-ang);
      const sin = Math.sin(-ang);
      const unrotX = rawDx * cos - rawDy * sin;
      const unrotY = rawDx * sin + rawDy * cos;
      return {
        x: CFG.W / 2 + unrotX,
        y: CFG.H / 2 + unrotY,
      };
    };
    const setZoom = (z) => {
      canvas.style.transform = `scale(${z})`;
      if (webglCanvasRef.current) {
        webglCanvasRef.current.style.transform = `scale(${z})`;
      }
    };

    const onDown = (e) => {
      const st = g.current;
      if (st.phase !== "playing" || st.turnState !== "aim") return;
      if (st.mode === "ai" && st.turn !== "p1") return;
      // In online mode, restrict input to the player's own turn
      if (st.mode === "online" && st.turn !== mpRef.current.role) return;

      const pt = getPoint(e);
      const own = st.pens.filter((p) => p.penData.owner === st.turn);
      let hit = Query.point(own, pt)[0];
      if (!hit) {
        // Proximity fallback to make pen grabbing responsive
        hit = own.find((p) => dist(p.position, pt) < CFG.penLen / 2 + 18);
      }
      if (!hit) return;
      const r = wrap.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const now = performance.now();
      st.aiming = {
        pen: hit,
        start: pt,
        current: pt,
        startClient: { x: cx, y: cy },
        baseScale: CFG.W / r.width,
        aimMode: st.aimMode || "forward",
        samples: [{ x: cx, y: cy, t: now }],
      };
      sound.play("grab");
      e.preventDefault();
    };

    const onMove = (e) => {
      const st = g.current;
      if (!st.aiming) return;
      const pt = getPoint(e);
      const dx = pt.x - st.aiming.start.x;
      const dy = pt.y - st.aiming.start.y;
      const rawMag = Math.hypot(dx, dy);
      const isForward = st.aiming.aimMode === "forward";
      const maxDistance = isForward ? 110 : CFG.maxDrag;
      const cap = Math.min(rawMag, maxDistance);
      const nx = rawMag > 0 ? dx / rawMag : 0;
      const ny = rawMag > 0 ? dy / rawMag : 0;
      st.aiming.current = { x: st.aiming.start.x + nx * cap, y: st.aiming.start.y + ny * cap };

      const powerRatio = cap / maxDistance;
      setPower(powerRatio);
      const targetZoom = Math.max(CFG.zoomMin, 1 - CFG.zoomAmt * powerRatio);
      setZoom(targetZoom);

      // Broadcast live aim to opponent in online mode
      if (st.mode === "online") {
        mpRef.current.sendAim({
          penId: st.aiming.pen.penData.id,
          start: st.aiming.start,
          current: st.aiming.current,
          aimMode: st.aiming.aimMode,
        });
      }
      e.preventDefault();
    };

    const onUp = () => {
      const st = g.current;
      if (!st.aiming) return;
      const pen = st.aiming.pen;
      const grab = st.aiming.start;
      const isForward = st.aiming.aimMode === "forward";

      // In forward mode: drag forward from strike point
      // In slingshot mode: pull backwards from strike point
      const dv = isForward
        ? { x: st.aiming.current.x - grab.x, y: st.aiming.current.y - grab.y }
        : { x: grab.x - st.aiming.current.x, y: grab.y - st.aiming.current.y };

      const rawMag = Math.hypot(dv.x, dv.y);
      const maxDist = isForward ? 110 : CFG.maxDrag;

      st.aiming = null;
      setPower(0);
      setZoom(1);

      if (st.mode === "online") {
        mpRef.current.sendAim(null);
      }

      if (rawMag < 6) return;

      const mag = Math.min(maxDist, rawMag);
      const ratio = mag / maxDist;
      const dir = { x: dv.x / rawMag, y: dv.y / rawMag };
      const nominalSpeed = ratio * CFG.maxSpeed;

      // Vector from Center of Mass to hit contact point
      const r = { x: grab.x - pen.position.x, y: grab.y - pen.position.y };
      const m = pen.mass;
      const I = pen.inertia || 1;

      // Perpendicular lever arm relative to flick direction
      const leverArm = Math.abs(r.x * dir.y - r.y * dir.x);
      const leverRatio = Math.min(1.0, leverArm / 18);

      // Desk Static Friction & Linear Partitioning:
      // If hit is gentle and on an off-center lever (like the clip),
      // static friction anchors the heavy barrel, suppressing linear slide
      // while channeling energy into pure rotation around the barrel pivot!
      let linearEfficiency;
      if (ratio < 0.45) {
        // Soft hit: barrel static friction holds firm against translation
        linearEfficiency = Math.max(0.04, Math.pow(ratio / 0.45, 2) * (1 - leverRatio * 0.92));
      } else {
        // Harder hit: overcomes static friction and slides
        linearEfficiency = ratio * (1 - leverRatio * 0.35);
      }

      const effectiveSpeed = linearEfficiency * CFG.maxSpeed;
      const v = { x: dir.x * effectiveSpeed, y: dir.y * effectiveSpeed };

      // Torque & Rotational Whipping:
      // When striking the clip, the barrel acts as a compass pivot, boosting angular snap
      const torqueMultiplier = 1 + leverRatio * 2.8 * (1 - Math.min(1, ratio) * 0.4);
      const cross = r.x * (dir.y * nominalSpeed) * m - r.y * (dir.x * nominalSpeed) * m;
      let omega = (cross / I) * CFG.spinFactor * torqueMultiplier;
      omega = Math.max(-CFG.maxOmega, Math.min(CFG.maxOmega, omega));

      // 3D Z-Axis Elevation & Roll Spin when striking the clip / cap end:
      const penUx = Math.cos(pen.angle);
      const penUy = Math.sin(pen.angle);
      const rLocalX = r.x * penUx + r.y * penUy;
      const isClipEnd = rLocalX < -CFG.penLen * 0.12;
      const clipLeverage = isClipEnd ? 1.0 : Math.max(0.3, leverRatio);
      pen.penData.vz = Math.min(3.5, ratio * 3.0 * clipLeverage);
      const rollDirection = (pen.penData.rollAngle || 0) < Math.PI / 2 ? 1 : -1;
      pen.penData.rollOmega = rollDirection * ratio * 0.45;

      Body.setVelocity(pen, v);
      Body.setAngularVelocity(pen, omega);
      sound.play("flick", ratio);
      st.turnState = "moving";
      st.moveStart = performance.now();
      setTurnState("moving");

      // Broadcast flick impulse to opponent
      if (st.mode === "online") {
        mpRef.current.sendFlick({
          penId: pen.penData.id,
          v,
          omega,
          ratio,
          grab,
          vz: pen.penData.vz,
          rollOmega: pen.penData.rollOmega,
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
      if (pen3D) pen3D.destroy();
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
      pens.push(makePen(x, BOARD.y + BOARD.h - 85, "p1", `p1_pen_${i}`));
      pens.push(makePen(x, BOARD.y + 85, "p2", `p2_pen_${i}`));
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
    handleResetRotation();
  };

  const quitToMenu = () => {
    const st = g.current;
    World.clear(st.engine.world, false);
    st.pens = [];
    st.phase = "menu";
    st.aiming = null;
    handleResetRotation();
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
      className="overflow-hidden select-none"
      style={
        isForcedLandscape && isPortrait
          ? {
              position: "fixed",
              left: "50%",
              top: "50%",
              width: "100vh",
              height: "100vw",
              transform: "translate(-50%, -50%) rotate(90deg)",
              transformOrigin: "center center",
              backgroundImage: `url(${ASSETS.desk})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {
              position: "relative",
              width: "100vw",
              height: "100vh",
              backgroundImage: `url(${ASSETS.desk})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
      }
      data-testid="penfight-app"
    >
      <RotateOverlay
        isForcedLandscape={isForcedLandscape}
        onEnterFullscreenLandscape={handleEnterFullscreenLandscape}
      />
      <div className="absolute inset-0 bg-[#1a0f08]/45" />

      {/* Game canvas */}
      <div className="absolute inset-0 flex items-center justify-center p-0.5 sm:p-2">
        <div
          ref={wrapperRef}
          className="relative w-full aspect-[3/2]"
          style={
            isForcedLandscape && isPortrait
              ? {
                  maxWidth: "min(98vh, calc(96vw * 1.5))",
                  maxHeight: "96%",
                }
              : {
                  maxWidth: "min(99vw, calc(98vh * 1.5))",
                  maxHeight: "98%",
                }
          }
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_DIM.w}
            height={CANVAS_DIM.h}
            className="touch-none"
            style={{
              position: "absolute",
              left: `calc(-100% * ${CANVAS_PAD.x} / ${CFG.W})`,
              top: `calc(-100% * ${CANVAS_PAD.y} / ${CFG.H})`,
              width: `calc(100% * ${CANVAS_DIM.w} / ${CFG.W})`,
              height: `calc(100% * ${CANVAS_DIM.h} / ${CFG.H})`,
              cursor: turnState === "aim" && (mode !== "online" || turn === mp.role) ? "grab" : "default",
              transformOrigin: "center center",
              transition: "transform 0.14s ease-out",
              willChange: "transform",
            }}
            data-testid="game-canvas"
          />
          <canvas
            ref={webglCanvasRef}
            width={CANVAS_DIM.w}
            height={CANVAS_DIM.h}
            className="pointer-events-none"
            style={{
              position: "absolute",
              left: `calc(-100% * ${CANVAS_PAD.x} / ${CFG.W})`,
              top: `calc(-100% * ${CANVAS_PAD.y} / ${CFG.H})`,
              width: `calc(100% * ${CANVAS_DIM.w} / ${CFG.W})`,
              height: `calc(100% * ${CANVAS_DIM.h} / ${CFG.H})`,
              transformOrigin: "center center",
              transition: "transform 0.14s ease-out",
              willChange: "transform",
            }}
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
              aimMode={aimMode}
              onToggleAimMode={toggleAimMode}
              onToggleMute={toggleMute}
              onQuit={quitToMenu}
              mp={mp}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
            />
          )}
        </div>
      </div>

      {phase === "menu" && (
        <MainMenu
          onStart={startGame}
          muted={muted}
          onToggleMute={toggleMute}
          aimMode={aimMode}
          onToggleAimMode={toggleAimMode}
          mp={mp}
        />
      )}
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

      {phase === "playing" && (
        <TableJoystick
          viewAngle={viewAngle}
          onRotate={handleRotate}
          onReset={handleResetRotation}
        />
      )}
    </div>
  );
}
