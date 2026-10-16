'use strict';
// LittleTrain route: a closed 3D railway loop. Everything is a periodic function of the distance s along the
// track, so the train can circle forever without a seam. Distances are in world units (about one metre).

// Baseline: the original LittleJS site railway is a stadium loop (two 120 straights + two r=50 half circles).
const ROUTE_ORIGINAL_LENGTH = 240 + 100 * Math.PI;   // 554.16 units, from SITE_TRACK_LENGTH in site.min.js
const ROUTE_LENGTH = 1400;                            // 2.53x the original

const TAU = Math.PI * 2;
const mix = (a, b, t) => a + (b - a) * t;
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const wrapS = s => ((s % ROUTE_LENGTH) + ROUTE_LENGTH) % ROUTE_LENGTH;
// smooth plateau: 0 at a-e, 1 on [a,b], 0 at b+e
const bump = (s, a, b, e) => smooth((s - a + e) / e) * (1 - smooth((s - b) / e));
const hash1 = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

// ---------- height profile of the rails (periodic Catmull-Rom through evenly spaced points) ----------
const TRACK_PTS = [
    0, 1, 2.2, 2.5, 2.5, 2.5, 4, 4.5, 3, -1, -4, -5, -4, -1,
    3, 9, 17, 25, 29, 29, 25, 18, 11, 6, 3.5, 2.5, 1.5, 0.5];
const TRACK_STEP = ROUTE_LENGTH / TRACK_PTS.length;

function trackY(s)
{
    const f = wrapS(s) / TRACK_STEP, i = Math.floor(f), t = f - i, n = TRACK_PTS.length;
    const p0 = TRACK_PTS[(i + n - 1) % n], p1 = TRACK_PTS[i % n];
    const p2 = TRACK_PTS[(i + 1) % n],     p3 = TRACK_PTS[(i + 2) % n];
    return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
        + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
}
const trackSlope = s => (trackY(s + 0.5) - trackY(s - 0.5));

// ---------- plan view: a wobbly oval, travelled so the loop centre is on the LEFT of the train ----------
const LOOP_SAMPLES = 2800;                 // 0.5 unit spacing
const loopX = new Float64Array(LOOP_SAMPLES + 1), loopZ = new Float64Array(LOOP_SAMPLES + 1);
const loopTX = new Float64Array(LOOP_SAMPLES + 1), loopTZ = new Float64Array(LOOP_SAMPLES + 1);
const LOOP_BOUNDS = {minX: 1e9, maxX: -1e9, minZ: 1e9, maxZ: -1e9};

(function buildLoop()
{
    const raw = 8000, rx = [], rz = [];
    for (let i = 0; i <= raw; ++i)
    {
        const a = i / raw * TAU;
        const r = 1 + 0.13 * Math.sin(2 * a + 0.6) + 0.07 * Math.sin(3 * a + 1.9) + 0.04 * Math.sin(5 * a);
        rx.push(270 * r * Math.cos(a)); rz.push(-190 * r * Math.sin(a));
    }
    // scale so the loop is exactly ROUTE_LENGTH long, then resample at even arc length
    const cum = [0];
    for (let i = 1; i <= raw; ++i) cum.push(cum[i - 1] + Math.hypot(rx[i] - rx[i - 1], rz[i] - rz[i - 1]));
    const k = ROUTE_LENGTH / cum[raw];
    let j = 0;
    for (let i = 0; i < LOOP_SAMPLES; ++i)
    {
        const d = i / LOOP_SAMPLES * cum[raw];
        while (cum[j + 1] < d) ++j;
        const t = (d - cum[j]) / (cum[j + 1] - cum[j]);
        loopX[i] = mix(rx[j], rx[j + 1], t) * k; loopZ[i] = mix(rz[j], rz[j + 1], t) * k;
    }
    loopX[LOOP_SAMPLES] = loopX[0]; loopZ[LOOP_SAMPLES] = loopZ[0];
    for (let i = 0; i <= LOOP_SAMPLES; ++i)
    {
        const a = (i + LOOP_SAMPLES - 1) % LOOP_SAMPLES, b = (i + 1) % LOOP_SAMPLES;
        const dx = loopX[b] - loopX[a], dz = loopZ[b] - loopZ[a], l = Math.hypot(dx, dz);
        loopTX[i] = dx / l; loopTZ[i] = dz / l;
        LOOP_BOUNDS.minX = Math.min(LOOP_BOUNDS.minX, loopX[i]); LOOP_BOUNDS.maxX = Math.max(LOOP_BOUNDS.maxX, loopX[i]);
        LOOP_BOUNDS.minZ = Math.min(LOOP_BOUNDS.minZ, loopZ[i]); LOOP_BOUNDS.maxZ = Math.max(LOOP_BOUNDS.maxZ, loopZ[i]);
    }
})();

// Position and unit heading on the ground plane at route distance s (reuses `out`, so it never allocates)
function trackPos(s, out)
{
    const f = wrapS(s) / ROUTE_LENGTH * LOOP_SAMPLES, i = Math.floor(f), t = f - i;
    out.x = mix(loopX[i], loopX[i + 1], t); out.z = mix(loopZ[i], loopZ[i + 1], t);
    const tx = mix(loopTX[i], loopTX[i + 1], t), tz = mix(loopTZ[i], loopTZ[i + 1], t);
    const l = Math.hypot(tx, tz) || 1;
    out.tx = tx / l; out.tz = tz / l;
    out.y = trackY(s);
    return out;
}
// right of the direction of travel is (-tz, 0, tx): the outside of the loop, where the camera sits.

// ---------- hand-placed features, in route distance ----------
const TUNNEL = {a: 258, b: 382, center: 320, height: 9.4};   // the open (cut-away) tunnel spans a..b
const BRIDGE = {a: 112, b: 228};
const RAVINE = {a: 138, b: 200, edge: 20, depth: 16};
const LAKES = [   // centres are offsets to the LEFT (inside the loop) of the track at route distance s
    {s: 550,  side: 62, radius: 46, drop: 8},     // sunset valley lake
    {s: 1285, side: 55, radius: 38, drop: 7},     // late countryside lake
];
const MOUNTAIN = {s: 915, side: 95, radius: 135, height: 62};

// ---------- environment scalars (day -> sunset -> snow -> sunset -> day) ----------
function keyframes(table, s)
{
    s = wrapS(s);
    for (let i = 1; i < table.length; ++i)
        if (s <= table[i][0])
            return mix(table[i - 1][1], table[i][1], smooth((s - table[i - 1][0]) / (table[i][0] - table[i - 1][0])));
    return table[table.length - 1][1];
}
const SUNSET_KF = [[0, 0], [360, 0], [430, 1], [650, 1], [730, 0], [1060, 0], [1110, 1], [1190, 1], [1300, 0], [ROUTE_LENGTH, 0]];
const SNOW_KF   = [[0, 0], [660, 0], [750, 1], [1000, 1], [1110, 0], [ROUTE_LENGTH, 0]];
const sunsetAt = s => keyframes(SUNSET_KF, s);
const snowAt   = s => keyframes(SNOW_KF, s);

// Total length of the 3D railway including the climbs (arc length of the track curve)
function routeArcLength()
{
    let total = 0, py = trackY(0);
    for (let i = 0; i < LOOP_SAMPLES; ++i)
    {
        const y = trackY((i + 1) * 0.5);
        total += Math.hypot(0.5, y - py);
        py = y;
    }
    return total;
}

if (typeof module !== 'undefined')
    module.exports = {ROUTE_LENGTH, ROUTE_ORIGINAL_LENGTH, trackY, trackSlope, trackPos, sunsetAt, snowAt, routeArcLength,
        wrapS, LOOP_BOUNDS, loopX, loopZ, LOOP_SAMPLES, TUNNEL, BRIDGE, LAKES, MOUNTAIN};
