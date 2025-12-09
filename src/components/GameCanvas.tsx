import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";
import { CACTUS_SPAWN_MAX, CACTUS_SPAWN_MIN, GRAVITY, GROUND_Y, H, JUMP_VELOCITY, SPEED_INC, SPEED_START, W } from "../game/constants";
import { Rect } from "../game/types";
import { drawDino } from "../game/dino";

export interface GameHandle {
  jump: () => void;
  reset: () => void;
  setDifficulty: (level: "easy" | "hard") => void;
  openPause: () => void;
  closePause: () => void;
}


const GameCanvas = forwardRef<GameHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [score, setScore] = useState(0);
  const [hi, setHi] = useState(() => Number(localStorage.getItem("hi") || 0));
  const [gameOver, setGameOver] = useState(false);

  const playing = useRef(false);
  const speed = useRef(SPEED_START);
  const tick = useRef(0);
  const raf = useRef<number | null>(null);
  const spawnCooldown = useRef(0);

  const difficulty = useRef<"easy" | "hard">("hard");
  const difficultyFactor = useRef(1.0);

  const paused = useRef(false);
  const pauseDiffAtStart = useRef<"easy" | "hard">("hard");
  const diffChangedDuringPause = useRef(false);

  const dino = useRef({
    x: 60,
    y: GROUND_Y - 44,
    w: 44,
    h: 44,
    vy: 0,
    onGround: true,
    legLeft: true,
  });

  const cacti = useRef<Rect[]>([]);
  const marks = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      x: i * 26,
      y: GROUND_Y + 2 + Math.random() * 8,
      w: 18,
      h: 2,
    }))
  );
  const clouds = useRef(
    Array.from({ length: 3 }, () => ({
      x: Math.random() * W,
      y: 30 + Math.random() * 40,
      w: 46,
      h: 16,
    }))
  );

    useImperativeHandle(ref, () => ({
    jump: () => tryJump(),
    reset: () => hardReset(),
    setDifficulty: (level: "easy" | "hard") => {
      if (!paused.current) return;

      if (difficulty.current !== level) {
        difficulty.current = level;
        difficultyFactor.current = level === "easy" ? 0.7 : 1.2;
        diffChangedDuringPause.current = true;
      }
    },
    openPause: () => {
      if (gameOver || paused.current) return;
      paused.current = true;
      pauseDiffAtStart.current = difficulty.current;
      diffChangedDuringPause.current = false;
      playing.current = false; 
    },
    closePause: () => {
      if (!paused.current) return;

      paused.current = false;

      
      if (diffChangedDuringPause.current) {
        softReset();
      }

      playing.current = true;
    },
  }));

  function tryJump() {
    const d = dino.current;
    if (d.onGround && playing.current) {
      d.vy = JUMP_VELOCITY;
      d.onGround = false;
    }
  }

  function softReset() {
    cacti.current = [];
    speed.current = SPEED_START;
    tick.current = 0;
    spawnCooldown.current = 0;
    dino.current.x = 60;
    dino.current.y = GROUND_Y - dino.current.h;
    dino.current.vy = 0;
    dino.current.onGround = true;
    setScore(0);
    setGameOver(false);

    paused.current = false;
    diffChangedDuringPause.current = false;
  }

  function hardReset() {
    softReset();
    playing.current = true;
  }

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const collide = (a: Rect, b: Rect) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    const spawnCactus = () => {
      const w = 10 + Math.floor(Math.random() * 14);
      const h = 20 + Math.floor(Math.random() * 34);
      cacti.current.push({ x: W + 10, y: GROUND_Y - h, w, h });
    };



    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#f7f7f7";
      ctx.fillRect(0, 0, W, H);

      const logicalSpeed = speed.current * difficultyFactor.current;

      ctx.fillStyle = "#e5e5e5";
      clouds.current.forEach((cl) => {
        ctx.fillRect(cl.x, cl.y, cl.w, cl.h);
        cl.x -= logicalSpeed  * 0.25;
        if (cl.x + cl.w < 0) {
          cl.x = W + Math.random() * 100;
          cl.y = 20 + Math.random() * 60;
        }
      });

      ctx.strokeStyle = "#8d8d8d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(W, GROUND_Y);
      ctx.stroke();

      ctx.fillStyle = "#d0d0d0";
      marks.current.forEach((m) => {
        ctx.fillRect(m.x, m.y, m.w, m.h);
        m.x -= logicalSpeed  * 0.6;
        if (m.x + m.w < 0) m.x = W + Math.random() * 40;
      });

      drawDino(ctx, dino.current, playing.current, tick.current);
      ctx.fillStyle = "#6e6e6e";
      cacti.current.forEach((o) => ctx.fillRect(o.x, o.y, o.w, o.h));

      ctx.fillStyle = "#666";
      ctx.font = "bold 16px ui-monospace, monospace";
      const s = String(score).padStart(5, "0");
      const h = String(hi).padStart(5, "0");
      ctx.fillText(`HI ${h}  ${s}`, W - 170, 26);

      if (paused.current) {
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "#f5f5f5";
        ctx.font = "24px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", W / 2, 80);

        ctx.font = "14px ui-sans-serif, system-ui";
        ctx.fillText(
          `Difficulty: ${difficulty.current.toUpperCase()}`,
          W / 2,
          110
        );
        ctx.fillText("Left / Right hand: change difficulty", W / 2, 140);
        ctx.fillText("Hand down: resume game", W / 2, 160);

        ctx.textAlign = "start";
      }

      if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,.05)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#777";
        ctx.font = "24px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME  OVER", W / 2, 100);
        ctx.font = "14px ui-sans-serif, system-ui";
        ctx.fillText("ENTER/CLICK für Restart", W / 2, 126);
        ctx.textAlign = "start";
      }
    };

    const loop = () => {
      raf.current = requestAnimationFrame(loop);
      if (!playing.current) {
        draw();
        return;
      }

      tick.current++;
      speed.current += SPEED_INC;

      const currentSpeed = speed.current * difficultyFactor.current;

      const d = dino.current;
      d.vy += GRAVITY;
      d.y += d.vy;
      if (d.y + d.h >= GROUND_Y) {
        d.y = GROUND_Y - d.h;
        d.vy = 0;
        d.onGround = true;
      } else {
        d.onGround = false;
      }

      cacti.current.forEach((o) => (o.x -= currentSpeed));
      cacti.current = cacti.current.filter((o) => o.x + o.w > 0);

      if (spawnCooldown.current <= 0) {
        spawnCactus();
        spawnCooldown.current =
          CACTUS_SPAWN_MIN +
          Math.floor(Math.random() * (CACTUS_SPAWN_MAX - CACTUS_SPAWN_MIN));
      } else {
        spawnCooldown.current--;
      }

      const hitbox: Rect = {
        x: d.x + 4,
        y: d.y + 4,
        w: d.w - 8,
        h: d.h - 8,
      };
      for (const o of cacti.current) {
        if (collide(hitbox, o)) {
          playing.current = false;
          setGameOver(true);
          setHi((prev) => {
            const best = Math.max(prev, score);
            localStorage.setItem("hi", String(best));
            return best;
          });
          break;
        }
      }

      setScore((s) => s + 1);

      draw();
    };

    
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") tryJump();

      if (e.code === "Enter" && !playing.current) {
        if (paused.current) {
          paused.current = false;
          playing.current = true;
        } else {
          softReset();
          playing.current = true;
        }
      }
    };
    const onClick = () => {
      if (!playing.current) {
        softReset();
        playing.current = true;
      } else {
        tryJump();
      }
    };

    window.addEventListener("keydown", onKey);
    canvasRef.current?.addEventListener("pointerdown", onClick);

    draw();
    raf.current = requestAnimationFrame(loop);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      window.removeEventListener("keydown", onKey);
      canvasRef.current?.removeEventListener("pointerdown", onClick);
    };
  }, [score, hi, gameOver]);

  return (
    <div className="game" style={{ userSelect: "none" }}>
      <canvas ref={canvasRef} width={W} height={H} />
    </div>
  );
});

export default GameCanvas;