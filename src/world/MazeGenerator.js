import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Random } from '../utils/Random.js';

export class MazeGenerator {
  constructor(seed = Date.now()) {
    this.seed = seed;
    this.rng = new Random(seed);
    this.W = CONFIG.MAZE.WIDTH;
    this.H = CONFIG.MAZE.HEIGHT;
    this.C = CONFIG.MAZE.CELL_SIZE;
    this.T = CONFIG.MAZE.WALL_THICKNESS;
  }

  generate() {
    const W = this.W;
    const H = this.H;
    const C = this.C;
    const T = this.T;
    const rnd = () => this.rng.next();

    const wN = Array.from({ length: H }, () => Array(W).fill(true));
    const wW = Array.from({ length: H }, () => Array(W).fill(true));
    const seen = Array.from({ length: H }, () => Array(W).fill(false));

    const carve = (x, y, nx, ny) => {
      if (nx > x) wW[y][nx] = false;
      else if (nx < x) wW[y][x] = false;
      else if (ny > y) wN[ny][x] = false;
      else wN[y][x] = false;
    };

    // 1. Carve 3-4 larger open rooms/clearings before maze pathing
    const roomCount = CONFIG.MAZE.ROOM_COUNT || 4;
    const rooms = [];
    for (let r = 0; r < roomCount; r++) {
      const rw = 2 + Math.floor(rnd() * 2); // 2x2 or 3x3 cells
      const rh = 2 + Math.floor(rnd() * 2);
      const rx = 1 + Math.floor(rnd() * (W - rw - 1));
      const ry = 1 + Math.floor(rnd() * (H - rh - 1));

      rooms.push({ rx, ry, rw, rh });

      // Demolish interior walls within this clearing
      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          seen[y][x] = true;
          if (x > rx) wW[y][x] = false;
          if (y > ry) wN[y][x] = false;
        }
      }
    }

    // 2. DFS Maze Carving for the remaining corridors
    const stack = [[0, 0]];
    seen[0][0] = true;

    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const nb = [
        [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
      ].filter(([a, b]) => a >= 0 && b >= 0 && a < W && b < H && !seen[b][a]);

      if (!nb.length) {
        stack.pop();
        continue;
      }
      const [nx, ny] = nb[Math.floor(rnd() * nb.length)];
      carve(x, y, nx, ny);
      seen[ny][nx] = true;
      stack.push([nx, ny]);
    }

    // Ensure rooms connect to adjacent corridors
    for (const rm of rooms) {
      const edge = Math.floor(rnd() * 4);
      if (edge === 0 && rm.rx + rm.rw < W) wW[rm.ry][rm.rx + rm.rw] = false; // East
      else if (edge === 1 && rm.rx > 0) wW[rm.ry][rm.rx] = false;            // West
      else if (edge === 2 && rm.ry + rm.rh < H) wN[rm.ry + rm.rh][rm.rx] = false; // South
      else if (edge === 3 && rm.ry > 0) wN[rm.ry][rm.rx] = false;            // North
    }

    // 3. Add loops (22%) for branching alternatives
    const loopFactor = CONFIG.MAZE.LOOP_FACTOR || 0.22;
    for (let i = 0, n = Math.floor(W * H * loopFactor); i < n; i++) {
      const x = 1 + Math.floor(rnd() * (W - 1));
      const y = 1 + Math.floor(rnd() * (H - 1));
      if (rnd() < 0.5) wW[y][x] = false;
      else wN[y][x] = false;
    }

    const links = (x, y) => {
      const r = [];
      if (x < W - 1 && !wW[y][x + 1]) r.push([x + 1, y]);
      if (x > 0 && !wW[y][x]) r.push([x - 1, y]);
      if (y < H - 1 && !wN[y + 1][x]) r.push([x, y + 1]);
      if (y > 0 && !wN[y][x]) r.push([x, y - 1]);
      return r;
    };

    // Find furthest reachable cell for the Exit
    const dist = Array.from({ length: H }, () => Array(W).fill(-1));
    dist[0][0] = 0;
    const q = [[0, 0]];
    let far = [0, 0];

    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [a, b] of links(x, y)) {
        if (dist[b][a] < 0) {
          dist[b][a] = dist[y][x] + 1;
          q.push([a, b]);
          if (dist[b][a] > dist[far[1]][far[0]]) far = [a, b];
        }
      }
    }

    // Collision boxes
    const boxes = [];
    const addBox = (cx, cz, sx, sz) => {
      boxes.push({
        cx, cz, sx, sz,
        minX: cx - sx / 2,
        maxX: cx + sx / 2,
        minZ: cz - sz / 2,
        maxZ: cz + sz / 2
      });
    };

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (wN[y][x]) addBox(x * C + C / 2, y * C, C + T, T);
        if (wW[y][x]) addBox(x * C, y * C + C / 2, T, C + T);
      }
    }

    for (let x = 0; x < W; x++) addBox(x * C + C / 2, H * C, C + T, T);
    for (let y = 0; y < H; y++) addBox(W * C, y * C + C / 2, T, C + T);

    // Lamps & Item spawns (increased frequency: ammo & battery)
    const lights = [];
    const items = [];
    let itemId = 0;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const isEnd = (x === 0 && y === 0) || (x === far[0] && y === far[1]);
        if ((isEnd || rnd() < 0.08) && lights.length < 16) {
          lights.push({ x: (x + 0.5) * C, z: (y + 0.5) * C });
        }

        // Higher chance of items: battery & ammo
        if (!isEnd && rnd() < 0.16 && items.length < 24) {
          const type = rnd() < 0.5 ? 'battery' : 'ammo';
          items.push({
            id: itemId++,
            type,
            x: (x + 0.5) * C,
            z: (y + 0.5) * C
          });
        }
      }
    }

    return {
      W, H, C,
      boxes,
      lights,
      items,
      rooms,
      start: { x: 0.5 * C, z: 0.5 * C },
      exit:  { x: (far[0] + 0.5) * C, z: (far[1] + 0.5) * C }
    };
  }
}
