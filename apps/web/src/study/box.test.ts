import { describe, expect, it } from "vitest";
import {
  type Box,
  clampBox,
  MIN_H,
  MIN_W,
  movedBox,
  readBox,
  resizedBox,
  startBox,
} from "./box.ts";

const view = { w: 1000, h: 700 };
const box: Box = { x: 100, y: 100, w: 384, h: null };

describe("the study menu's window", () => {
  it("opens under its button, their right edges together, and on screen", () => {
    expect(startBox({ right: 900, bottom: 80 }, view)).toEqual({ x: 516, y: 86, w: 384, h: null });
    // A button near the left edge can't pull it off screen.
    expect(startBox({ right: 100, bottom: 80 }, view).x).toBe(8);
  });

  it("fits a phone: no wider than the screen less its margins", () => {
    const phone = { w: 360, h: 640 };
    expect(startBox({ right: 330, bottom: 80 }, phone)).toMatchObject({ x: 8, w: 344 });
  });

  it("is dragged by the point held, and kept wholly on screen", () => {
    const grab = { x: 20, y: 10 };
    expect(movedBox(box, grab, { x: 320, y: 210 }, view)).toMatchObject({ x: 300, y: 200 });
    expect(movedBox(box, grab, { x: -500, y: -500 }, view)).toMatchObject({ x: 8, y: 8 });
    const far = movedBox(box, grab, { x: 5000, y: 5000 }, view);
    expect(far.x).toBe(1000 - 384 - 8);
    // At least its smallest height fits below it.
    expect(far.y).toBe(700 - MIN_H - 8);
  });

  it("is made shorter when it's moved down, so its bottom stays on screen", () => {
    const tall = { x: 100, y: 100, w: 384, h: 600 };
    expect(clampBox(tall, view)).toMatchObject({ y: 100, h: 592 });
    expect(clampBox({ ...tall, y: 400 }, view)).toMatchObject({ y: 400, h: 292 });
  });

  it("is resized from its corner, within its smallest size and the window's edges", () => {
    const from = { w: 384, h: 300 };
    expect(resizedBox(box, from, 100, 50, view)).toMatchObject({ w: 484, h: 350 });
    expect(resizedBox(box, from, -1000, -1000, view)).toMatchObject({ w: MIN_W, h: MIN_H });
    const big = resizedBox(box, from, 5000, 5000, view);
    expect(big.x + big.w).toBeLessThanOrEqual(1000 - 8);
    expect((big.h ?? 0) + big.y).toBeLessThanOrEqual(700 - 8);
  });

  it("is pulled back in when the screen gets smaller", () => {
    expect(clampBox({ x: 900, y: 600, w: 384, h: 500 }, { w: 500, h: 400 })).toEqual({
      x: 108,
      y: 264,
      w: 384,
      h: 128,
    });
  });

  it("reads a saved window, and nothing else", () => {
    expect(readBox('{"x":10,"y":20,"w":300,"h":200}')).toEqual({ x: 10, y: 20, w: 300, h: 200 });
    expect(readBox('{"x":10,"y":20,"w":300,"h":null}')).toEqual({ x: 10, y: 20, w: 300, h: null });
    expect(readBox('{"x":"10"}')).toBeNull();
    expect(readBox("not json")).toBeNull();
    expect(readBox(null)).toBeNull();
  });
});
