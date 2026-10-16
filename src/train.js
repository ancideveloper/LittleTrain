'use strict';
// LittleTrain train: speed model, 3D cars placed along the track, bounded steam pool, tap hint.
// Models face -Z (forward), +Y is up, +X is the train's right; the origin is on the rail at the car centre.

const V_BASE = 8;          // gentle cruising speed (units / second)
const V_MAX = 26;          // hard upper limit
const BOOST_MAX = V_MAX - V_BASE;
const BOOST_PER_PRESS = 5;     // speed target added by one tap / key press
const BOOST_HOLD_RATE = 9;     // speed target added per second while holding
const BOOST_DECAY_LINEAR = 0.5, BOOST_DECAY_TAU = 7;
const IDLE_GRACE = 0.8;        // seconds without input before the train starts braking
const BRAKE = 9;               // units / second^2, strongest braking; the train stops completely
const SPEED_RESPONSE = 1.4;    // 1/seconds, exponential approach to target
const ACCEL_MAX = 6;           // units / second^2, so velocity never jumps
const CAR_GAP = 0.7;
const TRAIN_HEIGHT = 5.8;      // rail to chimney top
const TRAIN_WIDTH = 3.4;

const CARS = [
    {kind: 'loco',   len: 8.6},
    {kind: 'tender', len: 4.6},
    {kind: 'coach',  len: 5.4, color: () => hsl(0.58, 0.85, 0.6), roof: () => hsl(0.6, 0.8, 0.42), face: () => hsl(0.97, 0.9, 0.85)},
    {kind: 'coach',  len: 5.4, color: () => hsl(0.11, 0.95, 0.58), roof: () => hsl(0.08, 0.9, 0.42), face: () => hsl(0.28, 0.6, 0.85)},
    {kind: 'coach',  len: 5.4, color: () => hsl(0.36, 0.6, 0.5), roof: () => hsl(0.38, 0.6, 0.33), face: () => hsl(0.14, 0.9, 0.8)},
];
let TRAIN_LENGTH = CAR_GAP * (CARS.length - 1);
for (const c of CARS) TRAIN_LENGTH += c.len;

const train = {
    s: 40,                  // route distance of the front of the locomotive (unwrapped)
    v: 0, boost: 0, running: false, wheel: 0, bounce: 0,
    mid: vec3(), midS: 0, heading: vec3(0, 0, -1),
    chimney: vec3(),
    objects: [], wheels: [],
    hint: null, hintMesh: null, hintScale: 1,
};

// ---------- model building ----------
const NAVY = hsl(0.62, 0.35, 0.28), GOLD = hsl(0.13, 1, 0.58), TOY_RED = hsl(0.01, 0.8, 0.55), CREAM = hsl(0.12, 0.8, 0.9);

function part(mesh, geo, x, y, z, color, rot, scale)
{
    return mesh.combine(geo, buildMatrix(vec3(x, y, z), rot || vec3(), scale || vec3(1)), color || WHITE);
}
const box = (w, h, d, bevel = 0.18) => buildBox(vec3(w, h, d), bevel, 2);
const ROT_ALONG_Z = vec3(PI / 2, 0, 0), ROT_ALONG_X = vec3(0, 0, PI / 2);

function wheelMesh(r)
{
    const m = new Mesh();
    part(m, buildCylinder(r * 2, 0.4, 20), 0, 0, 0, NAVY, ROT_ALONG_X);
    part(m, buildCylinder(r * 1.0, 0.55, 12), 0, 0, 0, GOLD, ROT_ALONG_X);
    for (let i = 0; i < 3; ++i)   // spokes, so the turning is visible
        part(m, buildBox(vec3(0.5, 0.12, r * 1.7)), 0, 0, 0, GOLD, vec3(i * PI / 3, 0, 0));
    return m;
}

function addWheel(car, x, y, z, r)
{
    const w = new EngineObject3D(vec3(x, y, z), wheelMesh(r));
    car.addChild(w);
    train.wheels.push({obj: w, r});
}

function locoMesh()
{
    const m = new Mesh();
    part(m, box(2.6, 0.5, 8.8, 0.15), 0, 0.95, 0, NAVY);                                   // chassis
    part(m, buildCylinder(2.6, 5.2, 20), 0, 2.55, -1.1, TOY_RED, ROT_ALONG_Z);                 // boiler
    part(m, buildCylinder(2.6, 1.1, 20), 0, 2.55, -3.7, NAVY, ROT_ALONG_Z);                // smokebox
    for (const z of [-2.3, -0.1]) part(m, buildCylinder(2.72, 0.28, 20), 0, 2.55, z, CREAM, ROT_ALONG_Z);
    part(m, box(2.9, 3.4, 2.9, 0.3), 0, 2.65, 2.55, GOLD);                                 // cab
    part(m, box(3.3, 0.45, 3.3, 0.2), 0, 4.55, 2.55, TOY_RED);                                 // cab roof
    for (const x of [-1.46, 1.46]) part(m, box(0.12, 1.25, 1.5, 0.05), x, 3.25, 2.55, hsl(0.55, 0.8, 0.85));
    part(m, buildCylinder(0.85, 1.5, 12), 0, 4.45, -3.0, NAVY);                            // chimney
    part(m, buildCylinder(1.2, 0.3, 14), 0, 5.2, -3.0, GOLD);
    part(m, buildSphere(1.2, 12, 6), 0, 3.95, -0.35, GOLD);                                // dome
    part(m, buildSphere(0.8, 10, 6), 0, 3.6, -4.2, hsl(0.15, 1, 0.8));                     // headlamp
    part(m, box(2.2, 0.35, 1.3, 0.1), 0, 0.65, -4.9, GOLD, vec3(0.45, 0, 0));              // cowcatcher
    for (const x of [-1, 1])                                                               // friendly face on both sides
    {
        for (const ez of [-2.9, -1.7])
        {
            part(m, buildSphere(0.85, 10, 6), x * 1.3, 3.1, ez, WHITE);
            part(m, buildSphere(0.42, 8, 5), x * 1.62, 3.1, ez, NAVY);
        }
        for (let i = 0; i < 5; ++i)   // smile
        {
            const a = -0.9 + i * 0.45;
            part(m, buildSphere(0.17, 6, 4), x * 1.33, 2.5 - (1 - a * a) * 0.0 + a * a * 0.35 - 0.1, -2.3 + a * 0.9, NAVY);
        }
        for (const ez of [-3.6, -0.7]) part(m, buildSphere(0.38, 8, 5), x * 1.31, 2.7, ez, hsl(0.97, 0.9, 0.78));
    }
    return m;
}

function tenderMesh()
{
    const m = new Mesh();
    part(m, box(2.5, 0.5, 4.6, 0.15), 0, 0.95, 0, NAVY);
    part(m, box(3.0, 1.9, 4.4, 0.3), 0, 2.0, 0, TOY_RED);
    part(m, box(3.05, 0.3, 4.45, 0.1), 0, 2.15, 0, CREAM);
    for (const [x, z, s] of [[-0.6, -0.8, 1.2], [0.4, 0.2, 1.4], [-0.3, 1.1, 1.1], [0.7, -0.9, 1.0]])
        part(m, buildSphere(s, 8, 5), x, 3.0, z, hsl(0.65, 0.2, 0.18));                     // coal
    return m;
}

function coachMesh(c)
{
    const m = new Mesh();
    part(m, box(2.6, 0.5, c.len, 0.15), 0, 0.95, 0, NAVY);
    part(m, box(3.1, 2.9, c.len, 0.45), 0, 2.45, 0, c.color());
    part(m, box(3.5, 0.45, c.len + 0.3, 0.2), 0, 4.1, 0, c.roof());
    for (const x of [-1, 1])
        for (const z of [-1.2, 1.2])
        {
            part(m, box(0.12, 1.2, 1.5, 0.08), x * 1.56, 2.9, z, CREAM);
            part(m, buildSphere(0.8, 8, 5), x * 1.5, 2.75, z, c.face());                    // a little passenger
            for (const ez of [-0.18, 0.18]) part(m, buildSphere(0.12, 5, 4), x * 1.85, 2.85, z + ez, NAVY);
        }
    return m;
}

function buildTrain()
{
    for (const c of CARS)
    {
        const mesh = c.kind === 'loco' ? locoMesh() : c.kind === 'tender' ? tenderMesh() : coachMesh(c);
        const o = new EngineObject3D(vec3(0, 0, 0), mesh);
        o.specular = 0.15;
        train.objects.push(o);
        const h = c.len / 2;
        if (c.kind === 'loco')
            for (const [x, y, z, r] of [[-1.55, 1, 2.7, 1], [1.55, 1, 2.7, 1], [-1.55, 1, 0.1, 1], [1.55, 1, 0.1, 1], [-1.5, 0.7, -3, 0.7], [1.5, 0.7, -3, 0.7]])
                addWheel(o, x, y, z, r);
        else for (const z of [-h * 0.55, h * 0.55]) { addWheel(o, -1.5, 0.7, z, 0.7); addWheel(o, 1.5, 0.7, z, 0.7); }
    }
    // "tap me" hint: a golden play button that bobs above the locomotive (facing the camera side), gone after the first input
    const hm = new Mesh();
    part(hm, buildCylinder(4.4, 0.5, 28), 0, 0, 0, GOLD, ROT_ALONG_X);
    part(hm, buildCylinder(3.6, 0.7, 28), 0, 0, 0, CREAM, ROT_ALONG_X);
    part(hm, buildCylinder(2.2, 0.9, 3), 0, 0, 0, TOY_RED, vec3(PI, 0, PI / 2));
    const hint = new EngineObject3D(vec3(0, 9.6, -0.5), hm);
    hint.emissive = 0.45; hint.castShadow = false;
    train.objects[0].addChild(hint);
    train.hint = hint; train.hintMesh = hm;
}

// ---------- layout ----------
const _a = {}, _b = {};
const _mat = new Matrix4();

function layoutCar(i, sCenter)
{
    const len = CARS[i].len;
    trackPos(sCenter + len * 0.3, _a); trackPos(sCenter - len * 0.3, _b);
    const dx = _a.x - _b.x, dy = _a.y - _b.y, dz = _a.z - _b.z, hl = Math.hypot(dx, dz);
    const o = train.objects[i];
    o.pos3D.set((_a.x + _b.x) / 2, (_a.y + _b.y) / 2 + (i === 0 ? train.bounce : 0), (_a.z + _b.z) / 2);
    o.rotation3D.set(Math.atan2(dy, hl), Math.atan2(-dx, -dz), 0);
}

function trainLayout()
{
    let front = train.s;
    for (let i = 0; i < CARS.length; ++i)
    {
        const len = CARS[i].len;
        layoutCar(i, front - len / 2);
        front -= len + CAR_GAP;
    }
    const rear = front + CAR_GAP;
    train.midS = (train.s + rear) / 2;
    trackPos(train.midS, _a);
    train.mid.set(_a.x, _a.y, _a.z);
    train.heading.set(_a.tx, 0, _a.tz);
    const l = train.objects[0];
    buildMatrix(l.pos3D, l.rotation3D, vec3(1), _mat);
    const ch = _mat.transformPoint(vec3(0, 5.35, -3.0));
    train.chimney.set(ch.x, ch.y, ch.z);
    if (train.hint)
    {
        const k = train.hintScale;
        train.hint.pos3D.y = 9.6 + Math.sin(time * 3) * 0.5;
        train.hint.scale3D.set(k, k, k);
        train.hint.rotation3D.x = Math.sin(time * 2) * 0.12;
    }
}

let idleTime = 0;

function trainUpdate(dt)
{
    const pressed = input.presses;
    if (pressed > 0)
    {
        train.running = true;
        idleTime = 0;
        train.boost = Math.min(BOOST_MAX, train.boost + BOOST_PER_PRESS * pressed);
        input.presses = 0;
        train.steamBoost = Math.min(1.6, train.steamBoost + 0.8 * pressed);   // fuller steam on every press
        sparkBurst(Math.min(24, 8 * pressed));
    }
    if (input.held && train.running) { idleTime = 0; train.boost = Math.min(BOOST_MAX, train.boost + BOOST_HOLD_RATE * dt); }
    else idleTime += dt;
    train.steamBoost = Math.max(0, train.steamBoost - dt * 1.4);

    if (train.running)
    {
        if (idleTime < IDLE_GRACE)
        {
            train.boost = Math.max(0, train.boost - BOOST_DECAY_LINEAR * dt) * Math.exp(-dt / BOOST_DECAY_TAU);
            const target = V_BASE + train.boost;
            const dv = (target - train.v) * (1 - Math.exp(-dt * SPEED_RESPONSE));
            train.v = clamp(train.v + clamp(dv, -ACCEL_MAX * dt, ACCEL_MAX * dt), 0, V_MAX);
        }
        else
        {
            // no input: brake smoothly all the way to a full stop
            train.boost = 0;
            train.v = Math.max(0, train.v - clamp(train.v * 1.2 + 0.6, 0, BRAKE) * dt);
            if (train.v < 0.02) train.v = 0;
        }
    }
    train.moving = train.v > 0.3;
    train.s += train.v * dt;
    if (train.s > ROUTE_LENGTH * 1000) train.s -= ROUTE_LENGTH * 1000;   // keep float precision healthy
    train.wheel += train.v * dt;
    train.bounce = Math.sin(train.wheel * 1.6) * 0.04 * Math.min(1, train.v / V_BASE);
    for (const w of train.wheels) w.obj.rotation3D.x = -train.wheel / w.r;
    // the tap hint comes back whenever the train is standing still
    train.hintScale += ((train.v < 0.2 && idleTime > 0.5 ? 1 : 0) - train.hintScale) * (1 - Math.exp(-dt * 6));
    train.hint.mesh = train.hintScale < 0.01 ? undefined : train.hintMesh;
    trainLayout();
    sparksUpdate(dt);
}
train.steamBoost = 0; train.moving = false;

// ---------- sparks at the wheels: more taps, more sparks ----------
const SPARK_MAX = 80;
const sparks = {objs: [], vel: [], age: new Float32Array(SPARK_MAX), life: new Float32Array(SPARK_MAX), alive: new Uint8Array(SPARK_MAX), next: 0, carry: 0, count: 0};
const SPARK_WHEELS = [[-1.55, 2.7], [1.55, 2.7], [-1.55, 0.1], [1.55, 0.1]];   // loco wheel x, z

function sparksInit()
{
    const mesh = buildSphere(0.34, 5, 3);
    for (let i = 0; i < SPARK_MAX; ++i)
    {
        const o = new EngineObject3D(vec3(0, -500, 0), mesh, undefined, hsl(0.11, 1, 0.62));
        o.emissive = 1; o.castShadow = false; o.receiveShadow = false; o.scale3D.set(0, 0, 0);
        sparks.objs.push(o); sparks.vel.push(vec3());
    }
}

function sparkEmitOne()
{
    const i = sparks.next; sparks.next = (i + 1) % SPARK_MAX;
    const [wx, wz] = SPARK_WHEELS[(Math.random() * SPARK_WHEELS.length) | 0];
    const w = _mat.transformPoint(vec3(wx, 0.15, wz));
    const side = wx < 0 ? -1 : 1, o = sparks.objs[i], v = sparks.vel[i];
    o.pos3D.set(w.x, w.y, w.z);
    const rx = -train.heading.z, rz = train.heading.x;     // train's right
    const out = 1 + Math.random() * 3.5, up = 2.5 + Math.random() * 4, back = -0.2 * train.v + (Math.random() - 0.5) * 2;
    v.set(rx * side * out + train.heading.x * back, up, rz * side * out + train.heading.z * back);
    sparks.age[i] = 0; sparks.life[i] = 0.45 + Math.random() * 0.4; sparks.alive[i] = 1;
    o.color.set(1, 0.55 + Math.random() * 0.4, 0.15, 1);
}
function sparkBurst(n) { for (let i = 0; i < n; ++i) sparkEmitOne(); }

function sparksUpdate(dt)
{
    // a steady shower while the train is being pushed faster than its gentle cruise
    const push = clamp((train.v - V_BASE * 0.9) / (V_MAX - V_BASE), 0, 1) * (idleTime < IDLE_GRACE ? 1 : 0);
    sparks.carry += push * 40 * dt;
    while (sparks.carry >= 1) { sparkEmitOne(); sparks.carry -= 1; }
    let n = 0;
    for (let i = 0; i < SPARK_MAX; ++i)
    {
        if (!sparks.alive[i]) continue;
        const o = sparks.objs[i], v = sparks.vel[i], k = (sparks.age[i] += dt) / sparks.life[i];
        if (k >= 1) { sparks.alive[i] = 0; o.scale3D.set(0, 0, 0); continue; }
        v.y -= 14 * dt;
        o.pos3D.x += v.x * dt; o.pos3D.y += v.y * dt; o.pos3D.z += v.z * dt;
        const sc = (1 - k) * (0.8 + 0.5 * Math.sin(k * 20));
        o.scale3D.set(sc, sc, sc);
        ++n;
    }
    sparks.count = n;
}

// ---------- steam: a fixed pool of soft spheres, recycled oldest-first ----------
const STEAM_MAX = 64;
const steam = {objs: [], vel: [], age: new Float32Array(STEAM_MAX), life: new Float32Array(STEAM_MAX),
    r0: new Float32Array(STEAM_MAX), alive: new Uint8Array(STEAM_MAX), next: 0, timer: 0.4, count: 0};

function steamInit()
{
    for (let i = 0; i < STEAM_MAX; ++i)
    {
        const o = new EngineObject3D(vec3(0, -500, 0), render3D.sphereMesh, undefined, rgb(1, 1, 1, 0));
        o.transparent = true; o.castShadow = false; o.receiveShadow = false; o.scale3D.set(0, 0, 0);
        steam.objs.push(o); steam.vel.push(vec3());
    }
    sparksInit();
}

function steamEmit(speedT, big)
{
    const i = steam.next; steam.next = (i + 1) % STEAM_MAX;
    const f = 1 + train.steamBoost * 0.7;
    steam.objs[i].pos3D.set(train.chimney.x, train.chimney.y, train.chimney.z);
    steam.vel[i].set(train.heading.x * train.v * 0.3, (2.2 + speedT * 2.4) * (0.9 + 0.3 * train.steamBoost), train.heading.z * train.v * 0.3);
    steam.age[i] = 0;
    steam.life[i] = 2.2 + speedT * 0.8 + Math.random() * 0.3;
    steam.r0[i] = (big ? 0.9 : 0.6 + speedT * 0.9) * f;
    steam.alive[i] = 1;
}

function steamUpdate(dt)
{
    const speedT = train.v / V_MAX;
    // standing still: small occasional puffs; more speed and every tap: more frequent, fuller puffs
    const interval = train.moving ? mix(1.0, 0.1, Math.pow(speedT, 0.8)) / (1 + train.steamBoost * 1.2) : 2.6;
    steam.timer -= dt;
    if (steam.timer <= 0) { steamEmit(speedT, !train.moving); steam.timer += interval; if (steam.timer < 0) steam.timer = interval; }
    const dragH = Math.exp(-dt * 1.1), dragV = Math.exp(-dt * 0.45);
    let n = 0;
    for (let i = 0; i < STEAM_MAX; ++i)
    {
        const o = steam.objs[i];
        if (!steam.alive[i]) continue;
        steam.age[i] += dt;
        const k = steam.age[i] / steam.life[i];
        if (k >= 1) { steam.alive[i] = 0; o.scale3D.set(0, 0, 0); continue; }
        const v = steam.vel[i];
        o.pos3D.x += v.x * dt; o.pos3D.y += v.y * dt; o.pos3D.z += v.z * dt;
        v.x *= dragH; v.z *= dragH; v.y *= dragV;
        const r = (steam.r0[i] + k * (1.6 + speedT * 3)) * 2;
        o.scale3D.set(r, r, r);
        o.color.a = (0.62 + 0.2 * speedT) * Math.pow(1 - k, 1.3) * Math.min(1, k * 8);
        ++n;
    }
    steam.count = n;
}
