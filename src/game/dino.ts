import { DinoState } from "./types";
import { GROUND_Y } from "./constants";


export function drawDino(
  ctx: CanvasRenderingContext2D,
  dino: DinoState,
  playing: boolean,
  tick: number
) {
  const bodyWidth = dino.w;
  const legHeight = 10;
  const bodyHeight = dino.h - legHeight;

  const bodyX = dino.x;
  const bodyY = dino.y;
  const bodyBottomY = bodyY + bodyHeight;

  ctx.fillStyle = "#2b2b2b";
  ctx.fillRect(bodyX, bodyY, bodyWidth, bodyHeight);

  ctx.fillStyle = "#111";
  ctx.fillRect(bodyX + bodyWidth - 10, bodyY + 8, 6, 6);

  const legY = GROUND_Y - legHeight;

  if (dino.onGround && playing) {
    if (tick % 14 === 0) dino.legLeft = !dino.legLeft;
    const off = dino.legLeft ? 8 : bodyWidth - 18;

    ctx.fillStyle = "#2b2b2b";
    ctx.fillRect(bodyX + off, legY, 10, legHeight);
  } else if (dino.vy < 0) {
    ctx.fillStyle = "#2b2b2b";
    ctx.fillRect(bodyX + 6, bodyBottomY - 2, 8, 6);
  }
}