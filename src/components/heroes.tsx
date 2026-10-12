"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { HandLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { createHero } from "./hero-model";

// Hand tracking runs in the browser: the runtime and model are downloaded once,
// camera frames never leave the device.
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"; // keep in step with package.json
const HAND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const SIZE = 180; // css px of each hero's canvas, room to rotate and for the flames; they're ~110px tall
const TAU = Math.PI * 2;
// MediaPipe hand landmarks: finger chains and the palm, for the hand outline in the camera box.
const FINGERS = [[0, 1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
const PALM = [0, 1, 5, 9, 13, 17];
const BOX_W = 192; // camera box, css px (4:3)
const BOX_H = 144;

type Lines = Record<"hi" | "scroll" | "cross" | "poke" | "dodge" | "hot" | "caught" | "free", string[]>;
type Spec = { name: string; model: string; jets: number[][]; cruise: number; lines: Lines };

// The cast. Models are credited in the footer.
const HEROES: Spec[] = [
  {
    name: "Iron Man",
    model: "/models/iron-man.glb",
    // Thrusters in model units: boot soles, then palm repulsors.
    jets: [[-210, 0, 0, 1], [210, 0, 0, 1], [-498, 1039, 58, 0.55], [498, 1039, 58, 0.55]],
    cruise: 650, // px/s around the margins
    lines: {
      hi: [
        "Poke me. I dare you.", "Pick me up. Bet you can't.", "Shouldn't you be in college?",
        "Don't you have homework?", "Still here? Get a job.", "Best thing on this site. Obviously.",
      ],
      scroll: ["Whoa, warn me before you scroll.", "Slow down, I'm not a scroll bar.", "Wait up!"],
      cross: ["This side's boring.", "Better view over here."],
      poke: ["Oh, it's on.", "You'll regret that.", "Catch me if you can, slowpoke."],
      dodge: ["Nope.", "Too slow!", "My grandma's faster.", "Is that a hand or a potato?", "JARVIS, evasive."],
      hot: ["Running hot…", "Uh, JARVIS?", "Thrusters overheating!"],
      caught: ["Hey! Hands off the suit.", "Lucky grab. Don't get used to it.", "Okay, okay. You got me."],
      free: ["Rude.", "Wheee!", "Do that again and I'm calling Pepper."],
    },
  },
  {
    name: "Batman",
    model: "/models/batman.glb",
    jets: [], // no thrusters: he glides on the cape
    cruise: 420,
    lines: {
      hi: ["I work alone.", "Shouldn't you be asleep?", "Stop staring.", "Poke me and find out.", "Go home. It's late."],
      scroll: ["Scrolling won't save you.", "I see you scrolling."],
      cross: ["This side's darker. Better.", "I prefer the shadows."],
      poke: ["Bad move.", "You have my attention.", "I'm Batman. You're not."],
      dodge: ["Predictable.", "Too slow.", "Not even close.", "I've trained for this."],
      hot: ["Need a second.", "Cape's tangled."],
      caught: ["…Fine. You got me.", "Don't tell anyone about this."],
      free: ["Never again.", "That was unnecessary."],
    },
  },
];
// Back-and-forth between the two: [who starts, line, reply].
const BANTER: [number, string, string][] = [
  [0, "Nice cape, Bats.", "Nice tin can."],
  [1, "Do you ever stop talking?", "No."],
  [0, "I can fly, you know.", "I can fall. With style."],
  [1, "Money isn't a superpower.", "Says the billionaire."],
];
// Remarks to the visitor about whatever they point at, first match wins.
const REMARKS: [string, string[]][] = [
  ['a[href*="github"]', ["Gonna read code? Nerd.", "Checking the code? Brave of you."]],
  ['a[href*="linkedin"]', ["LinkedIn? How corporate of you.", "Networking? Cute."]],
  ['a[href^="mailto:"]', ["Writing an email? Use spellcheck.", "Gonna email? Be nice."]],
  ['a[href^="/writing"]', ["You read? Look at you.", "Reading? In this economy?"]],
  ['[aria-label^="Open "]', ["You read books? Bold claim.", "Judging a book by its cover? Classic you."]],
  ["img", ["Like what you see?", "Do you like it? Be honest."]],
  ["button", ["Click it. Live a little.", "Go on, press it. Coward."]],
  ["a", ["Leaving already? Rude.", "Where you going? We're the main attraction."]],
];

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

type Mode = "pet" | "fly" | "hot" | "held" | "tossed";

// Iron Man lives in the page's side margin; Batman joins him in the other one
// when summoned (the footer's bat). They watch your cursor, heckle what you point
// at and each other, swap sides now and then, and get left behind when you
// scroll. Poke one and the page becomes the playground. Only a real hand (webcam)
// can catch them: pinch right on him to grab, let go to toss.
export function Heroes({ batman }: { batman: boolean }) {
  const [playing, setPlaying] = useState<string | null>(null); // who's being chased
  const [caught, setCaught] = useState(0);
  const figRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const pokeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const bubbleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handRef = useRef<HTMLCanvasElement>(null);
  const hintRef = useRef<HTMLSpanElement>(null);
  const game = useRef<{ start: (i: number) => void; stop: () => void; setBatman: (on: boolean) => void }>({
    start: () => {},
    stop: () => {},
    setBatman: () => {},
  });

  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && game.current.stop();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [playing]);

  useEffect(() => {
    const cv = overlayRef.current!;
    const ctx = cv.getContext("2d")!;
    const video = videoRef.current!;
    const hcv = handRef.current!;
    const hctx = hcv.getContext("2d")!;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const M = 45; // how close to the edges they fly
    const dpr = Math.min(devicePixelRatio, 2);
    let W = 0;
    let H = 0;
    const resize = () => {
      W = innerWidth;
      H = innerHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
    };
    resize();
    addEventListener("resize", resize);
    hcv.width = BOX_W * dpr;
    hcv.height = BOX_H * dpr;

    const start0 = performance.now();
    // Iron Man starts low on the right; Batman waits offstage until summoned.
    const heroes = HEROES.map((spec, i) => ({
      spec, i, on: i === 0, leaving: false, loading: false,
      fig: figRefs.current[i]!, poke: pokeRefs.current[i]!, bubble: bubbleRefs.current[i]!,
      gl: undefined as Awaited<ReturnType<typeof createHero>> | undefined,
      x: i ? -SIZE : W + SIZE, y: H * (i ? 0.18 : 0.82), vx: 0, vy: 0, mode: "pet" as Mode, until: 0,
      tx: 0, ty: 0, retarget: 0, react: 0, heat: 0, homeY: H * (i ? 0.18 : 0.82), wander: start0 + rand(5000, 9000),
      lean: 0, turn: 0, flip: 0, roll: 0, spin: 0, quipUntil: 0, bubbleW: 0,
    }));
    type Hero = (typeof heroes)[number];

    let alive = true;
    const load = (h: Hero) => {
      if (h.loading) return;
      h.loading = true;
      import("./hero-model")
        .then(({ createHero }) => createHero(h.fig, SIZE, h.spec))
        .then((gl) => (alive ? (h.gl = gl) : gl.dispose()));
    };
    load(heroes[0]);

    const cursor = { x: -1, y: -1, movedAt: -1e9 };
    const hand = {
      x: 0, y: 0, lastX: 0, lastY: 0, vx: 0, vy: 0, seenAt: -1e9, pinch: false, pinchAt: 0,
      lm: null as NormalizedLandmark[] | null,
    };
    const bits: { x: number; y: number; vx: number; vy: number; t: number; life: number; c: string; s: number }[] = [];
    let target: Hero | undefined; // the one being chased
    let score = 0;
    let hint = "";
    let side = 1; // Iron Man's side of the page; Batman takes the other
    let sideAt = 0;
    let remarkAt = 0;
    const chat = { next: start0 + 4000, reply: null as { h: Hero; line: string; at: number } | null };
    let entrance = false; // Batman just arrived: Iron Man gets a comeback

    const say = (h: Hero, lines: string[], now: number, chance = 1) => {
      if (Math.random() > chance) return;
      h.bubble.textContent = pick(lines);
      h.bubbleW = h.bubble.offsetWidth;
      h.bubble.style.opacity = "1";
      h.quipUntil = now + 1800;
    };
    const idle = () => heroes.filter((h) => h.on && !h.leaving && h.mode === "pet");

    // Pointer: they watch it, and heckle what it points at.
    const onWindowPointer = (e: PointerEvent) => {
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      if (e.pointerType === "mouse") cursor.movedAt = e.timeStamp; // touch taps aren't something to watch
    };
    addEventListener("pointermove", onWindowPointer, { passive: true });
    addEventListener("pointerdown", onWindowPointer, { passive: true });
    const remarkable = REMARKS.map(([sel]) => sel).join(",");
    let pointedAt: Element | null = null;
    const onOver = (e: PointerEvent) => {
      const el = (e.target as Element).closest?.(remarkable);
      if (target || !el || el === pointedAt || heroes.some((h) => h.poke === el) || e.timeStamp < remarkAt) return;
      pointedAt = el;
      const dist = (h: Hero) => Math.hypot(h.x - e.clientX, h.y - e.clientY);
      const h = idle().sort((a, b) => dist(a) - dist(b))[0]; // whoever's closer chimes in
      if (!h) return;
      say(h, REMARKS.find(([sel]) => el.matches(sel))![1], e.timeStamp);
      remarkAt = e.timeStamp + 3500;
      chat.next = Math.max(chat.next, e.timeStamp + 8000);
    };
    addEventListener("pointerover", onOver, { passive: true });

    // Scrolling moves the page under them: they're left behind, then fly back to their spot.
    let lastScroll = scrollY;
    const onScroll = () => {
      const dy = scrollY - lastScroll;
      lastScroll = scrollY;
      if (still) return;
      for (const h of idle()) h.y = clamp(h.y - dy * 0.7, -SIZE, H + SIZE);
      const now = performance.now();
      if (Math.abs(dy) > 60 && now > chat.next && idle().length) {
        const h = pick(idle());
        say(h, h.spec.lines.scroll, now, 0.6);
        chat.next = now + 7000;
      }
    };
    addEventListener("scroll", onScroll, { passive: true });

    const setPinch = (on: boolean, now: number) => {
      if (on && !hand.pinch) hand.pinchAt = now;
      hand.pinch = on;
    };

    let session = 0;
    let camFailed = false;
    let stream: MediaStream | undefined;
    let tracker: HandLandmarker | undefined;

    const start = (i: number) => {
      if (target) return;
      if (!heroes[i].on || heroes[i].leaving) return;
      const h = (target = heroes[i]);
      const id = ++session;
      const now = performance.now();
      score = 0;
      camFailed = false;
      setCaught(0);
      setPlaying(h.spec.name);
      root.style.overflow = "hidden";
      Object.assign(hand, { pinch: false, seenAt: -1e9, lm: null });
      Object.assign(h, { mode: "fly", react: 0, heat: 0 });
      say(h, h.spec.lines.poke, now);
      (async () => {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
          if (id !== session) return s.getTracks().forEach((t) => t.stop());
          stream = s;
          video.srcObject = s;
          await video.play();
          const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
          const files = await FilesetResolver.forVisionTasks(WASM);
          const make = (delegate: "GPU" | "CPU") =>
            HandLandmarker.createFromOptions(files, {
              baseOptions: { modelAssetPath: HAND_MODEL, delegate },
              runningMode: "VIDEO",
              numHands: 1,
            });
          const t = await make("GPU").catch(() => make("CPU"));
          if (id !== session) return t.close();
          tracker = t;
        } catch {
          if (id !== session) return;
          stream?.getTracks().forEach((t) => t.stop());
          camFailed = true;
        }
      })();
    };

    const stop = () => {
      if (!target) return;
      target.mode = "pet";
      target = undefined;
      session++;
      stream?.getTracks().forEach((t) => t.stop());
      stream = undefined;
      tracker?.close();
      tracker = undefined;
      hand.lm = null;
      bits.length = 0;
      root.style.overflow = overflow;
      setPlaying(null);
    };
    // The footer's bat: Batman glides in from his side, or says goodbye and flies off.
    const setBatman = (on: boolean) => {
      const b = heroes[1], now = performance.now();
      if (on === (b.on && !b.leaving)) return;
      if (on) {
        load(b);
        if (!b.on) Object.assign(b, { x: side > 0 ? -SIZE : W + SIZE, y: H * 0.18, vx: 0, vy: 0, homeY: H * 0.18 });
        Object.assign(b, { on: true, leaving: false, mode: "pet" });
        chat.reply = { h: b, line: "You found the signal.", at: now + 1200 };
        entrance = true;
        chat.next = Math.max(chat.next, now + 10000);
      } else {
        if (target === b) stop();
        b.leaving = true;
        say(b, ["I was never here."], now);
      }
    };
    game.current = { start, stop, setBatman };

    let lastFrame = -1;
    const track = (now: number) => {
      if (!tracker || video.readyState < 2 || video.currentTime === lastFrame) return;
      lastFrame = video.currentTime;
      const lm = tracker.detectForVideo(video, now).landmarks[0];
      hand.lm = lm ?? null;
      if (!lm) return;
      const a = video.videoWidth / video.videoHeight;
      const gap = (i: number, j: number) => Math.hypot((lm[i].x - lm[j].x) * a, lm[i].y - lm[j].y);
      // Aim with the point between thumb and index tips. Mirrored, and the middle
      // of the frame is stretched over the screen so the edges are reachable.
      const x = clamp((0.85 - (lm[4].x + lm[8].x) / 2) / 0.7, 0, 1) * W;
      const y = clamp(((lm[4].y + lm[8].y) / 2 - 0.15) / 0.65, 0, 1) * H;
      const fresh = now - hand.seenAt > 300; // hand just came into view: jump, don't glide
      hand.x = fresh ? x : hand.x + (x - hand.x) * 0.55;
      hand.y = fresh ? y : hand.y + (y - hand.y) * 0.55;
      hand.seenAt = now;
      // Pinch = fingertips close relative to palm size, with hysteresis so it doesn't flicker.
      const ratio = gap(4, 8) / gap(0, 9);
      setPinch(hand.pinch ? ratio < 0.45 : ratio < 0.3, now);
    };

    const burst = (h: Hero, n: number) => {
      for (let i = 0; i < n; i++) {
        const a = rand(0, TAU), v = rand(150, 520);
        bits.push({ x: h.x, y: h.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: performance.now(), life: 600, c: i % 2 ? "#f0b13a" : "#c3141f", s: 4 });
      }
    };
    const REACH = 56; // grab radius around his centre, in px

    // Try 16 escape directions; take the one that ends farthest from where the
    // hand is heading without running into a wall (so he doesn't get cornered).
    const dodge = (h: Hero, now: number, level: number) => {
      const hx = hand.x + hand.vx * 0.15, hy = hand.y + hand.vy * 0.15;
      let best = 0;
      let bestScore = -Infinity;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        const x = h.x + Math.cos(a) * 220, y = h.y + Math.sin(a) * 220;
        const outside = Math.max(0, M - x, x - W + M) + Math.max(0, M - y, y - H + M);
        const score = Math.hypot(x - hx, y - hy) - outside * 4 + Math.random() * 80;
        if (score > bestScore) [best, bestScore] = [a, score];
      }
      h.vx = Math.cos(best) * 950 * level;
      h.vy = Math.sin(best) * 950 * level;
      h.react = now + 260 / level;
      if (Math.random() < 0.45) h.roll = TAU * (Math.random() < 0.5 ? 1 : -1); // barrel roll
      // Dodging wears him out; too many in a row and he stalls. That's your window.
      if (++h.heat >= 5) {
        h.mode = "hot";
        h.until = now + 1500;
        say(h, h.spec.lines.hot, now);
      } else say(h, h.spec.lines.dodge, now, 0.3);
    };

    // Off duty: keep to his side margin (the empty space beside the page's content
    // column on wide screens, the edge otherwise), mostly up top or down low.
    const pet = (h: Hero, now: number, dt: number) => {
      if (h.leaving && (h.x < -SIZE / 2 || h.x > W + SIZE / 2)) [h.on, h.leaving] = [false, false];
      if (!still && now > h.wander) {
        const r = Math.random();
        h.homeY = r < 0.45 ? rand(H * 0.12, H * 0.22) : r < 0.9 ? rand(H * 0.78, H * 0.88) : rand(H * 0.4, H * 0.6);
        h.wander = now + rand(4000, 9000);
      }
      const gutter = (W - 900) / 2; // page content is ~900px wide and centred
      const edge = gutter > 140 ? gutter / 2 : M;
      h.tx = (h.i ? -side : side) > 0 ? (h.leaving ? W + SIZE : W - edge) : h.leaving ? -SIZE : edge;
      h.ty = still ? H * (h.i ? 0.18 : 0.82) : h.homeY;
      // Spring towards the spot, a little underdamped so he overshoots and settles.
      h.vx += ((h.tx - h.x) * 6 - h.vx * 4) * dt;
      h.vy += ((h.ty - h.y) * 6 - h.vy * 4) * dt;
      const sp = Math.hypot(h.vx, h.vy);
      if (sp > h.spec.cruise) [h.vx, h.vy] = [(h.vx / sp) * h.spec.cruise, (h.vy / sp) * h.spec.cruise];
      h.x += h.vx * dt;
      h.y += h.vy * dt;
    };

    // On the run: dodge the hand, coast, cruise, stall when worn out, get grabbed and tossed.
    const chased = (h: Hero, now: number, dt: number, visible: boolean) => {
      const level = 1 + Math.min(score, 10) * 0.08; // a little quicker after every catch
      const dx = h.x - hand.x, dy = h.y - hand.y, d = Math.hypot(dx, dy) || 1;
      const drag = (k: number) => {
        h.vx *= Math.exp(-k * dt);
        h.vy *= Math.exp(-k * dt);
      };

      // A grab only counts if the pinch closes on him, not if you sweep a closed hand through.
      if (h.mode !== "held" && visible && hand.pinch && now - hand.pinchAt < 350 && d < REACH) {
        h.mode = "held";
        h.roll = 0;
        setCaught(++score);
        say(h, h.spec.lines.caught, now);
        burst(h, 24);
      }

      if (h.mode === "held") {
        // Dangles from your pinch by the head.
        h.x += (hand.x - h.x) * 0.5;
        h.y += (hand.y + 50 - h.y) * 0.5;
        if (!hand.pinch) {
          h.mode = "tossed";
          h.until = now + 900;
          h.vx = clamp(hand.vx, -1800, 1800);
          h.vy = clamp(hand.vy, -1800, 1800);
          h.spin = clamp(Math.hypot(hand.vx, hand.vy) / 150, 4, 14) * (hand.vx < 0 ? -1 : 1);
          h.heat = 0;
        }
        return;
      }
      if (h.mode === "tossed") {
        h.flip += h.spin * dt; // tumbling head over heels
        drag(1.2);
        if (now > h.until) {
          h.mode = "fly";
          h.react = 0;
          say(h, h.spec.lines.free, now, 0.6);
        }
      } else if (h.mode === "hot") {
        h.vy += 500 * dt; // sinks while he catches his breath
        drag(2);
        if (h.spec.jets.length && Math.random() < 0.5)
          bits.push({ x: h.x + rand(-8, 8), y: h.y + 55, vx: rand(-30, 30), vy: rand(-90, -40), t: now, life: 800, c: "#8a8a8a", s: 6 });
        if (now > h.until) {
          h.mode = "fly";
          h.heat = 0;
        }
      } else if (visible && d < 170 && now > h.react) {
        dodge(h, now, level);
      } else if (now < h.react) {
        drag(2.5); // coasting out of a dash
      } else {
        // Cruise between random waypoints, and drift away from a hand that's getting close.
        if (now > h.retarget || Math.hypot(h.tx - h.x, h.ty - h.y) < 40) {
          h.tx = rand(M, W - M);
          h.ty = rand(M, H - M);
          h.retarget = now + rand(1500, 3500);
        }
        const tl = Math.hypot(h.tx - h.x, h.ty - h.y) || 1;
        const sx = ((h.tx - h.x) / tl) * 240 * level - h.vx, sy = ((h.ty - h.y) / tl) * 240 * level - h.vy;
        const sl = Math.hypot(sx, sy) || 1, max = 700 * level * dt;
        h.vx += (sx / sl) * Math.min(sl, max);
        h.vy += (sy / sl) * Math.min(sl, max);
        if (visible && d < 380) {
          h.vx += (dx / d) * 900 * dt;
          h.vy += (dy / d) * 900 * dt;
        }
      }
      h.heat = Math.max(0, h.heat - 0.8 * dt);
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      if (h.x < M || h.x > W - M) [h.x, h.vx] = [clamp(h.x, M, W - M), -h.vx * 0.6];
      if (h.y < M || h.y > H - M) [h.y, h.vy] = [clamp(h.y, M, H - M), -h.vy * 0.6];
    };

    const update = (now: number, dt: number) => {
      const visible = now - hand.seenAt < 400;
      if (!visible) hand.pinch = false;
      if (dt > 0) {
        hand.vx += ((hand.x - hand.lastX) / dt - hand.vx) * 0.3;
        hand.vy += ((hand.y - hand.lastY) / dt - hand.vy) * 0.3;
      }
      hand.lastX = hand.x;
      hand.lastY = hand.y;

      // Every so often they swap sides, crossing past each other.
      if (!still && now > sideAt) {
        if (sideAt && idle().length) {
          side = -side;
          const h = pick(idle());
          say(h, h.spec.lines.cross, now, 0.5);
        }
        sideAt = now + rand(15000, 30000);
      }
      // Chatter when things are quiet: banter with each other, or heckle the visitor.
      if (now > chat.next && idle().length) {
        const [who, line, reply] = pick(BANTER);
        if (!target && idle().length === 2 && Math.random() < 0.35) {
          say(heroes[who], [line], now);
          chat.reply = { h: heroes[1 - who], line: reply, at: now + 1800 };
        } else {
          const h = pick(idle());
          say(h, h.spec.lines.hi, now);
        }
        chat.next = now + rand(12000, 20000);
      }
      if (chat.reply && now > chat.reply.at) {
        say(chat.reply.h, [chat.reply.line], now);
        chat.reply = entrance ? { h: heroes[0], line: "Took you long enough.", at: now + 1800 } : null;
        entrance = false;
      }

      for (const h of heroes) {
        if (!h.on) continue;
        if (h.mode === "pet") pet(h, now, dt);
        else chased(h, now, dt, visible);

        // Pose: lean head-first into fast flight, turn to face where he's going (or
        // the cursor), spin out of rolls and tumbles. Batman sways on his cape.
        const k = Math.min(1, 10 * dt);
        const peek = h.mode === "pet" && now - cursor.movedAt < 5000 ? clamp((cursor.x - h.x) / 400, -1, 1) : 0;
        const sway = h.spec.jets.length ? 0 : Math.sin(now / 700 + h.i) * 0.08;
        const lean = h.mode === "held" ? Math.sin(now / 110) * 0.4 : h.mode === "hot" ? Math.sin(now / 90) * 0.3 : clamp(h.vx / 600, -1, 1) * 1.3 + sway;
        h.lean += (lean - h.lean) * k;
        h.turn += (clamp(h.vx / 600, -1, 1) * 0.6 + peek * 0.5 - h.turn) * k;
        h.roll -= Math.sign(h.roll) * Math.min(Math.abs(h.roll), 14 * dt);
        if (h.mode !== "tossed") h.flip += (Math.round(h.flip / TAU) * TAU - h.flip) * k;
      }

      for (const b of bits) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vx *= 0.95;
        b.vy *= 0.95;
      }
      for (let i = bits.length - 1; i >= 0; i--) if (now - bits[i].t > bits[i].life) bits.splice(i, 1);

      const next = !tracker ? (camFailed ? "no camera · hands only" : "starting camera…")
        : !hand.lm ? "show your hand to the camera" : hand.pinch ? "pinching" : "pinch to grab";
      if (next !== hint && hintRef.current) hintRef.current.textContent = hint = next;
    };

    const draw = (now: number) => {
      for (const h of heroes) {
        if (!h.on) {
          h.fig.style.transform = h.poke.style.transform = "translate(-999px, -999px)";
          h.bubble.style.opacity = "0";
          continue;
        }
        const speed = Math.hypot(h.vx, h.vy);
        const thrust = h.mode === "hot" ? (Math.random() < 0.25 ? 0.4 : 0) : h.mode === "held" ? rand(0.6, 1.3) : 0.4 + Math.min(speed, 1200) / 1000;
        const glide = !h.spec.jets.length;
        const bob = still || (h.mode !== "pet" && h.mode !== "fly") ? 0 : glide ? Math.sin(now / 600 + 1) * 6 : Math.sin(now / 300) * 3;
        const x = h.x, y = h.y + bob;
        h.gl?.render({ lean: h.lean, turn: h.turn + h.roll, flip: h.flip, thrust });
        h.fig.style.transform = `translate(${x - SIZE / 2}px, ${y - SIZE / 2}px)`;
        h.poke.style.transform = `translate(${x - 32}px, ${y - 32}px)`;
        if (now > h.quipUntil) h.bubble.style.opacity = "0";
        const by = y - 92 < 8 ? y + 62 : y - 92;
        h.bubble.style.transform = `translate(${clamp(x - h.bubbleW / 2, 8, W - h.bubbleW - 8)}px, ${by}px)`;
      }

      if (!target) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (const b of bits) {
        ctx.globalAlpha = 1 - (now - b.t) / b.life;
        ctx.fillStyle = b.c;
        ctx.fillRect(b.x - b.s / 2, b.y - b.s / 2, b.s, b.s);
      }
      ctx.globalAlpha = 1;

      if (now - hand.seenAt < 400) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = hand.pinch ? "#ef4444" : "#f0b13a";
        ctx.setLineDash(hand.pinch ? [] : [5, 6]);
        ctx.beginPath();
        ctx.arc(hand.x, hand.y, hand.pinch ? REACH * 0.55 : REACH, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillRect(hand.x - 2, hand.y - 2, 4, 4);
      }

      // Camera box: no video of you, just the outline of your hand. Draw the hand
      // fat, then cut the same shape out a little thinner: only the boundary is left.
      hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      hctx.clearRect(0, 0, BOX_W, BOX_H);
      if (!hand.lm) return;
      const pts = hand.lm.map((p) => [(1 - p.x) * BOX_W, p.y * BOX_H] as const);
      const finger = Math.hypot(pts[0][0] - pts[9][0], pts[0][1] - pts[9][1]) * 0.28;
      const shape = (width: number) => {
        hctx.lineWidth = width;
        hctx.beginPath();
        for (const chain of FINGERS) chain.forEach((i, n) => (n ? hctx.lineTo : hctx.moveTo).call(hctx, ...pts[i]));
        hctx.stroke();
        hctx.beginPath();
        PALM.forEach((i, n) => (n ? hctx.lineTo : hctx.moveTo).call(hctx, ...pts[i]));
        hctx.closePath();
        hctx.fill();
        hctx.stroke();
      };
      hctx.lineCap = hctx.lineJoin = "round";
      hctx.strokeStyle = hctx.fillStyle = "#ef4444";
      shape(finger + 4);
      hctx.globalCompositeOperation = "destination-out";
      shape(finger);
      hctx.globalCompositeOperation = "source-over";
      if (hand.pinch) {
        hctx.globalAlpha = 0.3;
        shape(finger);
        hctx.globalAlpha = 1;
      }
    };

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      track(now);
      update(now, dt);
      draw(now);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      stop();
      for (const h of heroes) h.gl?.dispose();
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onWindowPointer);
      removeEventListener("pointerdown", onWindowPointer);
      removeEventListener("pointerover", onOver);
      removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => game.current.setBatman(batman), [batman]);

  return (
    <>
      {HEROES.map((h, i) => (
        <Fragment key={h.name}>
          <button
            ref={(el) => {
              pokeRefs.current[i] = el;
            }}
            type="button"
            aria-label={`Poke ${h.name} to play catch`}
            onClick={() => game.current.start(i)}
            hidden={playing === h.name || (i === 1 && !batman)}
            className="fixed top-0 left-0 z-40 size-16 cursor-pointer rounded-full"
            style={{ transform: "translate(-999px, -999px)" }}
          />
          <canvas
            ref={(el) => {
              figRefs.current[i] = el;
            }}
            aria-hidden
            className="pointer-events-none fixed top-0 left-0 z-[55] drop-shadow-[0_10px_8px_rgb(0_0_0/0.35)]"
            style={{ width: SIZE, height: SIZE, transform: "translate(-999px, -999px)" }}
          />
          <div
            ref={(el) => {
              bubbleRefs.current[i] = el;
            }}
            aria-live="polite"
            className="pointer-events-none fixed top-0 left-0 z-[56] rounded-full bg-neutral-950 px-3 py-1 text-[13px] whitespace-nowrap text-white opacity-0 transition-opacity dark:bg-white dark:text-neutral-950"
          />
        </Fragment>
      ))}
      {/* absolute: out of the nav's flex flow, without trapping the z-indexes below */}
      <div role="dialog" aria-modal="true" aria-label={`Catch ${playing}`} hidden={!playing} className="absolute">
        <canvas ref={overlayRef} className="fixed inset-0 z-50 size-full bg-black/5 dark:bg-black/30" />
        <figure className="fixed right-4 bottom-4 z-[60]" style={{ width: BOX_W }}>
          <div className="relative border border-white/80 bg-black" style={{ height: BOX_H }}>
            {/* the video feeds the tracker but is never shown */}
            <video ref={videoRef} playsInline muted className="absolute inset-0 size-full opacity-0" />
            <canvas ref={handRef} className="absolute inset-0 size-full" />
            {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-r-2 border-b-2"].map((c) => (
              <span key={c} className={`absolute -m-1 size-3 border-red-500 ${c}`} />
            ))}
          </div>
          <span ref={hintRef} className="block border-x border-b border-white/80 bg-white py-1 text-center font-mono text-xs text-black" />
          <figcaption className="mt-1.5 text-center font-mono text-[10px] text-neutral-500">camera stays on your device</figcaption>
        </figure>
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-neutral-200 bg-white/85 py-1.5 pr-1.5 pl-4 text-sm shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/85">
            <span className="text-neutral-900 dark:text-white">
              {playing} · caught <span className="tabular-nums">{caught}</span>
            </span>
            <button
              type="button"
              onClick={() => game.current.stop()}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-white/5 dark:hover:text-white"
            >
              Exit
              <kbd className="rounded border border-neutral-200 px-1 font-sans text-[10px] leading-none text-neutral-400 dark:border-neutral-800 dark:text-neutral-600">
                Esc
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
