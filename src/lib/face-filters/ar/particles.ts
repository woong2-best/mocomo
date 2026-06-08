type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  born: number;
  life: number;
  wiggle: number;
};

let particles: Particle[] = [];
let lastSpawn = 0;

function spawnParticle(w: number, h: number, cx: number, cy: number, tick: number) {
  const size = 6 + Math.random() * 14;
  particles.push({
    x: cx + (Math.random() - 0.5) * w * 0.15,
    y: cy + (Math.random() - 0.5) * h * 0.08,
    vx: (Math.random() - 0.5) * 0.4,
    vy: -0.6 - Math.random() * 0.8,
    size,
    born: tick,
    life: 2500 + Math.random() * 1500,
    wiggle: Math.random() * Math.PI * 2,
  });
}

export function updateHeartParticles(
  w: number,
  h: number,
  cx: number,
  cy: number,
  tick: number
): Particle[] {
  if (tick - lastSpawn > 280) {
    spawnParticle(w, h, cx, cy, tick);
    if (Math.random() > 0.4) spawnParticle(w, h, cx, cy, tick);
    lastSpawn = tick;
  }

  particles = particles.filter((p) => tick - p.born < p.life);
  if (particles.length > 22) particles = particles.slice(-22);

  for (const p of particles) {
    p.x += p.vx + Math.sin(tick * 0.006 + p.wiggle) * 0.35;
    p.y += p.vy;
    p.vx *= 0.998;
  }
  return particles;
}

export function resetHeartParticles() {
  particles = [];
  lastSpawn = 0;
}

export type { Particle };
