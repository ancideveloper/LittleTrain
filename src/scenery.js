'use strict';
// LittleTrain scenery: rails, bridge, open tunnel, trees, flowers, lakes, animals, snowman, clouds and snowfall.

const _p = {}, _q = {};
const UNIT_BOX = buildBox(1);
const RIGHT = (t, lat, out) => { out.x += -t.tz * lat; out.z += t.tx * lat; return out; };

// a point at route distance s, `lat` to the right of the rail centre and `up` above the rail top
function railPoint(s, lat, up, out)
{
    trackPos(s, _q);
    out.x = _q.x - _q.tz * lat; out.z = _q.z + _q.tx * lat; out.y = _q.y + up;
    return out;
}
const P3 = () => ({x: 0, y: 0, z: 0});
const _r0 = P3(), _r1 = P3();

// add a box-shaped beam between two points to a mesh
function beam(mesh, a, b, w, h, color, extra = 0.05)
{
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, hl = Math.hypot(dx, dz), len = Math.hypot(hl, dy);
    const yaw = hl > 1e-6 ? Math.atan2(-dx, -dz) : 0, pitch = Math.atan2(dy, hl);
    return mesh.combine(UNIT_BOX, buildMatrix(vec3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2), vec3(pitch, yaw, 0), vec3(w, h, len + extra)), color);
}
function beamS(mesh, sA, latA, upA, sB, latB, upB, w, h, color, extra)
{
    railPoint(sA, latA, upA, _r0); railPoint(sB, latB, upB, _r1);
    return beam(mesh, _r0, _r1, w, h, color, extra);
}

const STEEL = hsl(0.62, 0.12, 0.6), WOOD = hsl(0.07, 0.45, 0.3), TEAL = hsl(0.48, 0.6, 0.45), STONE = hsl(0.1, 0.2, 0.75);

// ---------- rails, sleepers, ballast ----------
function buildTrack()
{
    const m = new Mesh(), step = 2;
    for (let s = 0; s < ROUTE_LENGTH; s += step)
    {
        for (const lat of [-0.9, 0.9]) beamS(m, s, lat, -0.14, s + step, lat, -0.14, 0.24, 0.28, STEEL, 0.1);
        const snow = snowAt(s + 1);
        beamS(m, s, 0, -0.55, s + step, 0, -0.55, 3.9, 0.5, hsl(0.08, 0.12, 0.5).lerp(hsl(0.58, 0.2, 0.95), snow), 0.15);
    }
    new EngineObject3D(vec3(), m).specular = 0.2;
    const count = Math.round(ROUTE_LENGTH / 1.4), ties = new InstancedMesh3D(buildBox(vec3(3.3, 0.24, 0.5)), count, undefined, WOOD);
    for (let i = 0; i < count; ++i)
    {
        trackPos(i * 1.4, _p);
        ties.setTransformAt(i, vec3(_p.x, _p.y - 0.3, _p.z), vec3(Math.atan2(trackY(i * 1.4 + 0.7) - trackY(i * 1.4 - 0.7), 1.4), Math.atan2(-_p.tx, -_p.tz), 0));
    }
    ties.castShadow = false;
}

// ---------- bridge over the ravine ----------
function buildBridge()
{
    const m = new Mesh(), a = BRIDGE.a, b = BRIDGE.b, sc = (a + b) / 2, springA = a + 12, springB = b - 12, half = (springB - springA) / 2;
    // deck girders and cross beams
    for (const lat of [-2.2, 2.2])
        for (let s = a; s < b; s += 2) beamS(m, s, lat, -1.4, s + 2, lat, -1.4, 0.5, 1.5, TEAL, 0.1);
    for (let s = a; s <= b; s += 4) beamS(m, s, -2.3, -1.1, s, 2.3, -1.1, 0.4, 0.4, hsl(0.48, 0.5, 0.35), 0.1);
    // arches below the deck, springing from the ravine walls
    for (const lat of [-2.3, 2.3])
    {
        const yTop = trackY(sc) - 2.2;
        const arch = s =>
        {
            const u = (s - sc) / half;
            railPoint(s, lat, 0, _r0);
            const ground = groundY(_r0.x, _r0.z) - 1;
            const ySpring = Math.min(ground, yTop - 6);
            return mix(ySpring, yTop, 1 - u * u);
        };
        for (let s = springA; s < springB; s += 3)
        {
            railPoint(s, lat, 0, _r0); _r0.y = arch(s);
            railPoint(Math.min(s + 3, springB), lat, 0, _r1); _r1.y = arch(Math.min(s + 3, springB));
            beam(m, _r0, _r1, 0.8, 0.9, TEAL, 0.1);
        }
        for (let s = springA + 7; s < springB - 3; s += 7)   // hangers
        {
            railPoint(s, lat, 0, _r0); _r0.y = arch(s);
            railPoint(s, lat, -1.4, _r1);
            beam(m, _r0, _r1, 0.25, 0.25, hsl(0.48, 0.5, 0.3), 0);
        }
    }
    // railings
    for (const lat of [-2.35, 2.35])
    {
        beamS(m, a, lat, 1.35, b, lat, 1.35, 0.18, 0.18, CREAM, 0);
        for (let s = a; s <= b; s += 4) beamS(m, s, lat, -0.4, s, lat, 1.35, 0.2, 0.2, CREAM, 0);
    }
    // stone abutments at both ends
    for (const s of [a - 2, b + 2])
    {
        railPoint(s, 0, 0, _r0);
        const g = Math.min(groundY(_r0.x, _r0.z), _r0.y - 3) - 2;
        beamS(m, s, 0, -1.7, s, 0, g - _r0.y, 6, 1, STONE, 0);
    }
    const o = new EngineObject3D(vec3(), m);
    o.specular = 0.15;
}

// ---------- open tunnel: a stone arch cut away on the camera side so the train is always visible ----------
const TUNNEL_OUTER = [[-8.8, -2], [-8.8, 4.2], [-7.8, 8], [-5.6, 10.8], [-2.8, 12.4], [0, 12.9], [2.8, 12.4], [4.8, 11.2]];
const TUNNEL_INNER = [[-6.0, -0.4], [-6.0, 4.2], [-5.2, 7.0], [-3.4, 8.9], [-1.4, 9.6], [0, 9.8], [1.6, 9.5], [3.4, 8.8]];

function buildTunnel()
{
    const m = new Mesh(), a = TUNNEL.a, b = TUNNEL.b, step = 2, n = TUNNEL_OUTER.length;
    const ring = (s, list, scale, out) => { for (let k = 0; k < n; ++k) { const o = out[k] || (out[k] = P3()); railPoint(s, list[k][0] * scale, list[k][1] * scale, o); } return out; };
    let ra = [], rb = [];
    for (let s = a; s < b; s += step)
    {
        const portal = s < a + 4 || s >= b - 6;
        const outerCol = portal ? STONE : hsl(0.28, 0.55, 0.5 + 0.03 * Math.sin(s));
        const innerCol = hsl(0.09, 0.45, 0.72);
        const sc = portal ? 1.04 : 1;
        const oa = ring(s, TUNNEL_OUTER, sc, ra), ob = ring(s + step, TUNNEL_OUTER, sc, rb);
        const ia = []; ring(s, TUNNEL_INNER, 1, ia); const ib = []; ring(s + step, TUNNEL_INNER, 1, ib);
        const v = p => vec3(p.x, p.y, p.z);
        for (let k = 0; k < n - 1; ++k)
        {
            m.addQuad(v(oa[k]), v(ob[k]), v(ob[k + 1]), v(oa[k + 1]), outerCol);       // outside skin
            m.addQuad(v(ia[k + 1]), v(ib[k + 1]), v(ib[k]), v(ia[k]), innerCol);       // inside skin
        }
        m.addQuad(v(oa[n - 1]), v(ob[n - 1]), v(ib[n - 1]), v(ia[n - 1]), STONE);       // cut face on the camera side
        m.addQuad(v(ia[0]), v(ib[0]), v(ob[0]), v(oa[0]), STONE);
        // portal faces
        if (s === a) { for (let k = 0; k < n - 1; ++k) m.addQuad(v(oa[k]), v(oa[k + 1]), v(ia[k + 1]), v(ia[k]), STONE); }
        if (s + step >= b) { for (let k = 0; k < n - 1; ++k) m.addQuad(v(ob[k + 1]), v(ob[k]), v(ib[k]), v(ib[k + 1]), STONE); }
    }
    m.doubleSided = true;
    m.computeNormals(false);
    const o = new EngineObject3D(vec3(), m);
    o.castShadow = false; o.emissive = 0.35;   // lit from inside so the train stays easy to see
    // warm lamps along the ceiling
    const lamps = new Mesh();
    for (let s = a + 6; s < b - 3; s += 8) beamS(lamps, s, 0, 9.1, s, 0, 9.35, 1.2, 0.2, hsl(0.13, 1, 0.8), 0.6);
    const lamp = new EngineObject3D(vec3(), lamps);
    lamp.emissive = 1; lamp.castShadow = false;
}

// ---------- trees and flowers ----------
function treeMeshes()
{
    const round = new Mesh();
    part(round, buildCylinder(0.9, 2.6, 8), 0, 1.3, 0, hsl(0.08, 0.5, 0.3));
    part(round, buildSphere(3.8, 10, 6), 0, 4.2, 0, hsl(0.3, 0.6, 0.45));
    part(round, buildSphere(2.8, 8, 5), 1.1, 3.4, 0.4, hsl(0.32, 0.6, 0.5));
    part(round, buildSphere(2.6, 8, 5), -1.0, 3.3, -0.5, hsl(0.28, 0.6, 0.42));
    const pine = new Mesh();
    part(pine, buildCylinder(0.9, 2, 8), 0, 1, 0, hsl(0.08, 0.5, 0.3));
    for (let i = 0; i < 3; ++i)
    {
        const w = 4.6 - i * 1.1, h = 3.2 - i * 0.3, y = 2.6 + i * 2.1;
        part(pine, buildCone(w, h, 9), 0, y + h / 2 - 0.4, 0, hsl(0.42, 0.45, 0.3));
        part(pine, buildCone(w * 0.78, h * 0.62, 9), 0, y + h * 0.5 + 0.35 - 0.4 + 0.2, 0, hsl(0.58, 0.1, 0.98));   // snow cap
    }
    return {round, pine};
}

function buildTreesAndFlowers()
{
    const meshes = treeMeshes();
    const maxN = 1300;
    const roundTrees = new InstancedMesh3D(meshes.round, maxN, undefined, WHITE);
    const pines = new InstancedMesh3D(meshes.pine, maxN, undefined, WHITE);
    let nr = 0, np = 0;
    const lakes = TERRAIN.lakes;
    const rot = vec3(), sc = vec3();
    for (let s = 0; s < ROUTE_LENGTH; s += 4.2)
        for (let t = 0; t < 4; ++t)
        {
            const ss = s + hash1(s * 1.3 + t) * 4, lat = -(11 + Math.pow(hash1(s * 2.7 + t * 5), 1.5) * 150);
            insidePoint(ss, -lat, _p);
            if (hash1(ss * 3.1 + t) > 0.45) continue;
            const y = groundY(_p.x, _p.z);
            let bad = false;
            for (const L of lakes) if (Math.hypot(_p.x - L.x, _p.z - L.z) < L.r + 5) bad = true;
            const sn = snowAt(ss);
            if (bad || y < trackY(ss) - 9 || Math.hypot(_p.x - TERRAIN.mountain.x, _p.z - TERRAIN.mountain.z) < 25) continue;
            const size = 0.8 + hash1(ss * 9.1 + t) * 0.7;
            sc.set(size, size * (0.9 + hash1(ss) * 0.3), size);
            rot.set(0, hash1(ss * 4.4) * TAU, 0);
            const pos = vec3(_p.x, y - 0.3, _p.z);
            if (sn > 0.5 && np < maxN) pines.setTransformAt(np++, pos, rot, sc);
            else if (nr < maxN)
            {
                roundTrees.setColorAt(nr, hsl(0.3, 0.1, 1).lerp(hsl(0.07, 0.8, 0.8), sunsetAt(ss)));
                roundTrees.setTransformAt(nr++, pos, rot, sc);
            }
        }
    roundTrees.count = nr; pines.count = np;
    for (const o of [roundTrees, pines]) { o.castShadow = true; o.specular = 0; }

    // flowers beside the rails in the green zones
    const flowerMesh = new Mesh();
    part(flowerMesh, buildCylinder(0.12, 0.9, 5), 0, 0.45, 0, hsl(0.3, 0.6, 0.4));
    for (let i = 0; i < 5; ++i) part(flowerMesh, buildSphere(0.38, 5, 3), Math.cos(i * 1.257) * 0.3, 1.0, Math.sin(i * 1.257) * 0.3, WHITE);
    part(flowerMesh, buildSphere(0.3, 5, 3), 0, 1.02, 0, hsl(0.13, 1, 0.6));
    const flowers = new InstancedMesh3D(flowerMesh, 700, undefined, WHITE);
    const hues = [0.97, 0.13, 0.0, 0.75, 0.08];
    let nf = 0;
    for (let s = 0; s < ROUTE_LENGTH && nf < 700; s += 2.3)
    {
        const ss = s + hash1(s) * 2;
        if (snowAt(ss) > 0.3 || sunsetAt(ss) > 0.85 || hash1(ss * 5.5) > 0.7) continue;
        const side = hash1(ss * 7.7) > 0.5 ? 1 : -1, lat = side * (4 + hash1(ss * 3.3) * 9);
        railPoint(ss, lat, 0, _p);
        let y = groundY(_p.x, _p.z);
        if (Math.abs(trackY(ss) - y) > 3 || (ss > BRIDGE.a - 4 && ss < BRIDGE.b + 4) || (ss > TUNNEL.a - 10 && ss < TUNNEL.b + 10)) continue;
        flowers.setColorAt(nf, hsl(hues[nf % hues.length], 0.9, 0.65));
        flowers.setTransformAt(nf++, vec3(_p.x, y - 0.1, _p.z), vec3(0, hash1(ss) * TAU, 0), vec3(0.8 + hash1(ss * 2) * 0.6));
    }
    flowers.count = nf; flowers.castShadow = false;
    return {trees: nr + np, flowers: nf};
}

// ---------- lakes, river, ducks ----------
const water = {objs: []};
function buildWater()
{
    const col = hsl(0.55, 0.75, 0.55, 0.88);
    for (const L of TERRAIN.lakes)
    {
        const o = new EngineObject3D(vec3(L.x, L.level, L.z), buildCylinder(L.r * 2.1, 0.3, 48), undefined, col.copy());
        o.transparent = true; o.castShadow = false; o.receiveShadow = false; o.reflectivity = 0.35; o.specular = 0.6; o.shininess = 40;
        water.objs.push(o);
    }
    // river under the bridge, running across the track
    const sc = (BRIDGE.a + BRIDGE.b) / 2;
    trackPos(sc, _p);
    const lx = _p.tz, lz = -_p.tx;       // left (inside) direction
    const river = new EngineObject3D(vec3(_p.x + lx * 60, trackY(sc) - RAVINE.depth + 2.6, _p.z + lz * 60), buildBox(vec3(15, 0.3, 320)), undefined, col.copy());
    river.rotation3D.y = Math.atan2(-lx, -lz);
    river.transparent = true; river.castShadow = false; river.receiveShadow = false; river.reflectivity = 0.35; river.specular = 0.6;
    water.objs.push(river);
}

function duckMesh()
{
    const m = new Mesh();
    part(m, buildSphere(1.6, 10, 6), 0, 0.6, 0, WHITE, undefined, vec3(0.85, 0.8, 1.25));
    part(m, buildSphere(0.9, 8, 5), 0, 1.45, -0.8, WHITE);
    part(m, box(0.5, 0.2, 0.55, 0.05), 0, 1.35, -1.35, hsl(0.09, 1, 0.55));
    for (const x of [-0.25, 0.25]) part(m, buildSphere(0.14, 5, 4), x, 1.6, -1.1, NAVY);
    part(m, buildSphere(0.9, 8, 5), 0, 0.85, 0.7, hsl(0.58, 0.1, 0.9), undefined, vec3(1, 0.6, 1));
    return m;
}
function rabbitMesh()
{
    const m = new Mesh(), fur = hsl(0.1, 0.1, 0.95);
    part(m, buildSphere(1.5, 10, 6), 0, 0.8, 0, fur, undefined, vec3(0.9, 0.9, 1.3));
    part(m, buildSphere(1.0, 8, 5), 0, 1.45, -0.95, fur);
    for (const x of [-0.25, 0.25]) { part(m, box(0.28, 1.1, 0.25, 0.1), x, 2.35, -0.95, fur); part(m, box(0.12, 0.8, 0.1, 0.04), x, 2.3, -1.03, hsl(0.97, 0.8, 0.85)); part(m, buildSphere(0.14, 5, 4), x * 1.7, 1.6, -1.35, NAVY); }
    part(m, buildSphere(0.5, 6, 4), 0, 0.9, 1.0, WHITE);
    part(m, buildSphere(0.18, 5, 4), 0, 1.4, -1.55, hsl(0.97, 0.8, 0.7));
    return m;
}
function deerBody()
{
    const m = new Mesh(), fur = hsl(0.07, 0.55, 0.5);
    part(m, buildSphere(2.2, 10, 6), 0, 2.4, 0, fur, undefined, vec3(0.8, 0.85, 1.6));
    for (const [x, z] of [[-0.55, -1.0], [0.55, -1.0], [-0.55, 1.0], [0.55, 1.0]]) part(m, buildCylinder(0.34, 1.9, 6), x, 0.95, z, hsl(0.07, 0.5, 0.38));
    for (let i = 0; i < 6; ++i) part(m, buildSphere(0.22, 5, 4), Math.sin(i * 2.1) * 0.7, 3.0 - (i % 2) * 0.1, -0.8 + i * 0.35, hsl(0.12, 0.8, 0.92));
    part(m, buildSphere(0.5, 6, 4), 0, 2.7, 1.5, WHITE);
    return m;
}
function deerHead()
{
    const m = new Mesh(), fur = hsl(0.07, 0.55, 0.5);
    part(m, buildCylinder(0.55, 1.8, 7), 0, 0.8, 0, fur, vec3(-0.5, 0, 0));
    part(m, buildSphere(0.95, 8, 5), 0, 1.7, -0.9, fur, undefined, vec3(0.85, 0.85, 1.2));
    for (const x of [-0.45, 0.45])
    {
        part(m, box(0.2, 0.55, 0.3, 0.05), x, 2.35, -0.5, fur, vec3(0, 0, x * 1.4));
        part(m, buildSphere(0.14, 5, 4), x * 0.9, 1.9, -1.45, NAVY);
        part(m, box(0.1, 1.0, 0.1, 0.03), x * 0.9, 2.9, -0.6, hsl(0.08, 0.4, 0.3), vec3(0, 0, -x * 0.5));
    }
    part(m, buildSphere(0.3, 5, 4), 0, 1.7, -1.8, NAVY);
    return m;
}

const animals = [];
class Duck extends EngineObject3D
{
    constructor(lake, radius, phase, speed)
    {
        super(vec3(), duckMesh());
        this.lake = lake; this.radius = radius; this.phase = phase; this.speed = speed;
    }
    update()
    {
        const a = this.phase + time * this.speed, L = this.lake;
        const x = L.x + Math.cos(a) * this.radius, z = L.z + Math.sin(a) * this.radius;
        this.pos3D.set(x, L.level + 0.15 + Math.sin(time * 2 + this.phase) * 0.06, z);
        this.rotation3D.y = Math.atan2(Math.sin(a) * this.speed * Math.sign(this.speed), -Math.cos(a) * Math.sign(this.speed)) + (this.speed < 0 ? 0 : 0);
        this.rotation3D.z = Math.sin(time * 2 + this.phase) * 0.05;
    }
}
class Rabbit extends EngineObject3D
{
    constructor(x, z, phase)
    {
        super(vec3(x, 0, z), rabbitMesh());
        this.home = vec3(x, 0, z); this.phase = phase;
        this.rotation3D.y = phase;
    }
    update()
    {
        const cyc = (time * 0.4 + this.phase) % 3, hop = cyc < 0.55 ? Math.abs(Math.sin(cyc / 0.55 * PI)) : 0;
        this.pos3D.set(this.home.x, groundY(this.home.x, this.home.z) + hop * 0.9, this.home.z);
        this.rotation3D.x = cyc < 0.55 ? -0.25 * Math.cos(cyc / 0.55 * PI) : 0;
    }
}
class Deer extends EngineObject3D
{
    constructor(x, z, phase)
    {
        super(vec3(x, 0, z), deerBody());
        this.home = vec3(x, 0, z); this.phase = phase;
        this.rotation3D.y = phase;
        this.head = new EngineObject3D(vec3(0, 2.9, -1.4), deerHead());
        this.addChild(this.head);
        for (const o of [this, this.head]) o.castShadow = true;
    }
    update()
    {
        this.pos3D.set(this.home.x, groundY(this.home.x, this.home.z), this.home.z);
        this.head.rotation3D.x = 0.55 * Math.max(0, Math.sin(time * 0.5 + this.phase));   // grazing, head bowing slowly
    }
}

function buildAnimals()
{
    const [lakeA, lakeB] = TERRAIN.lakes;
    for (let i = 0; i < 3; ++i) animals.push(new Duck(lakeA, lakeA.r * (0.25 + i * 0.22), i * 2.1, 0.07 * (i % 2 ? -1 : 1) / (0.6 + i * 0.2) * 8 / lakeA.r * 3));
    for (let i = 0; i < 2; ++i) animals.push(new Duck(lakeB, lakeB.r * (0.3 + i * 0.3), i * 3, 0.1 * (i ? -1 : 1) * 12 / lakeB.r * 3));
    // rabbits and deer on the bank between the lake and the track, in view of the camera
    const bank = (L, sTrack, ang, d, out) =>
    {
        trackPos(sTrack, _p);
        const rx = -_p.tz, rz = _p.tx;   // right (toward the track from the lake)
        const c = Math.cos(ang), s = Math.sin(ang);
        const dx = rx * c - rz * s, dz = rx * s + rz * c;
        out.x = L.x + dx * (L.r + d); out.z = L.z + dz * (L.r + d);
        return out;
    };
    const spots = [[0, 550, -0.5, 7, 'r'], [0, 550, 0.1, 9, 'd'], [0, 550, 0.55, 8, 'r'], [0, 550, -0.2, 14, 'd'],
        [1, 1285, -0.3, 7, 'r'], [1, 1285, 0.4, 8, 'd'], [1, 1285, 0.05, 11, 'r']];
    spots.forEach(([li, st, ang, d, kind], i) =>
    {
        const L = TERRAIN.lakes[li], pos = bank(L, st, ang, d, {});
        const y = groundY(pos.x, pos.z);
        if (y < L.level + 0.5) return;
        animals.push(kind === 'r' ? new Rabbit(pos.x, pos.z, i * 1.7) : new Deer(pos.x, pos.z, i * 1.3 + 2));
    });
}

// ---------- snowman ----------
class Snowman extends EngineObject3D
{
    constructor(pos, scale)
    {
        const m = new Mesh(), snow = hsl(0.58, 0.15, 0.99);
        part(m, buildSphere(3.0, 14, 8), 0, 1.4, 0, snow);
        part(m, buildSphere(2.2, 14, 8), 0, 3.7, 0, snow);
        part(m, buildSphere(1.6, 14, 8), 0, 5.3, 0, snow);
        part(m, buildCone(0.35, 1.4, 8), 0, 5.3, -1.2, hsl(0.07, 1, 0.55), vec3(-PI / 2, 0, 0));
        for (const x of [-0.35, 0.35]) part(m, buildSphere(0.22, 6, 4), x, 5.65, -0.72, hsl(0.65, 0.2, 0.15));
        for (let i = 0; i < 5; ++i) part(m, buildSphere(0.1, 5, 4), Math.cos(-0.9 + i * 0.45 + PI / 2) * 0.5 * 0 + (-0.9 + i * 0.45) * 0.4, 4.95 - Math.cos((-0.9 + i * 0.45) * 1.2) * 0.12 + 0.12, -0.74, hsl(0.65, 0.2, 0.15));
        for (const y of [3.0, 3.8, 4.5]) part(m, buildSphere(0.2, 5, 4), 0, y, -1.1, hsl(0.65, 0.2, 0.15));
        part(m, buildCylinder(2.0, 0.15, 14), 0, 6.1, 0, hsl(0.65, 0.2, 0.2));
        part(m, buildCylinder(1.2, 1.1, 14), 0, 6.7, 0, hsl(0.65, 0.2, 0.2));
        part(m, buildCylinder(1.25, 0.22, 14), 0, 6.4, 0, TOY_RED);
        part(m, buildCylinder(2.4, 0.4, 14), 0, 4.55, 0, TOY_RED, undefined, vec3(1, 1, 1));   // scarf
        part(m, box(0.5, 1.4, 0.5, 0.1), 0.5, 3.9, -0.7, TOY_RED, vec3(0.3, 0, 0));
        part(m, buildSphere(0.3, 5, 4), -0.45, 5.2, -0.62, hsl(0.97, 0.8, 0.8));
        part(m, buildSphere(0.3, 5, 4), 0.45, 5.2, -0.62, hsl(0.97, 0.8, 0.8));
        super(pos, m);
        this.scale3D.set(scale, scale, scale);
        const arm = (side) => { const a = new EngineObject3D(vec3(side * 1.4, 3.9, 0), (() => { const am = new Mesh(); part(am, buildCylinder(0.16, 2.6, 5), side * 1.1, 0.5, 0, hsl(0.08, 0.5, 0.25), vec3(0, 0, -side * 0.9)); return am; })()); this.addChild(a); return a; };
        this.armL = arm(-1); this.armR = arm(1);
    }
    update()
    {
        this.armR.rotation3D.z = Math.sin(time * 2.4) * 0.35 - 0.2;     // friendly wave
        this.armL.rotation3D.z = Math.sin(time * 1.7 + 1) * 0.1 + 0.1;
    }
}

function buildSnowmen()
{
    for (const [s, lat, sc] of [[912, 24, 1.5], [926, 30, 0.9]])
    {
        insidePoint(s, lat, _p);
        const sm = new Snowman(vec3(_p.x, groundY(_p.x, _p.z) - 0.2, _p.z), sc);
        trackPos(s, _q);
        sm.rotation3D.y = Math.atan2(_q.tz, _q.tx) + PI / 2;   // look toward the track (and the camera)
        animals.push(sm);
    }
}

// ---------- clouds and snowfall ----------
const clouds = [], SNOW_COUNT = 160;
let snowflakes = null;
const flakeData = {x: new Float32Array(SNOW_COUNT), y: new Float32Array(SNOW_COUNT), z: new Float32Array(SNOW_COUNT), v: new Float32Array(SNOW_COUNT), ph: new Float32Array(SNOW_COUNT)};

function buildSky3D()
{
    const cm = new Mesh();
    part(cm, buildSphere(26, 10, 6), 0, 0, 0, WHITE, undefined, vec3(1.3, 0.7, 1));
    part(cm, buildSphere(20, 10, 6), -22, -2, 4, WHITE, undefined, vec3(1.2, 0.7, 1));
    part(cm, buildSphere(22, 10, 6), 22, -3, -3, WHITE, undefined, vec3(1.2, 0.7, 1));
    part(cm, buildSphere(18, 10, 6), 4, 7, 0, WHITE, undefined, vec3(1.1, 0.8, 1));
    const bx = (LOOP_BOUNDS.minX + LOOP_BOUNDS.maxX) / 2, bz = (LOOP_BOUNDS.minZ + LOOP_BOUNDS.maxZ) / 2;
    for (let i = 0; i < 12; ++i)
    {
        const c = new EngineObject3D(vec3(bx + (hash1(i * 3.3) - 0.5) * 900, 150 + hash1(i * 1.9) * 80, bz + (hash1(i * 7.1) - 0.5) * 700), cm, undefined, rgb(1, 1, 1, 0.95));
        c.castShadow = false; c.receiveShadow = false;
        const k = 0.8 + hash1(i * 5.7) * 1.1; c.scale3D.set(k, k * 0.9, k);
        c.speed = 1.5 + hash1(i) * 1.5; c.bx = bx;
        clouds.push(c);
    }
    snowflakes = new InstancedMesh3D(buildSphere(0.3, 5, 3), SNOW_COUNT, undefined, WHITE);
    snowflakes.emissive = 0.8; snowflakes.castShadow = false; snowflakes.count = 0;
    for (let i = 0; i < SNOW_COUNT; ++i)
    {
        flakeData.x[i] = (Math.random() - 0.5) * 90; flakeData.y[i] = Math.random() * 45; flakeData.z[i] = (Math.random() - 0.5) * 90;
        flakeData.v[i] = 1.2 + Math.random() * 1.6; flakeData.ph[i] = Math.random() * TAU;
    }
}

function skyObjectsUpdate(dt, camPos, snowAmount)
{
    for (const c of clouds)
    {
        c.pos3D.x += c.speed * dt;
        if (c.pos3D.x > c.bx + 520) c.pos3D.x -= 1040;
    }
    const n = Math.floor(SNOW_COUNT * snowAmount);
    snowflakes.count = n;
    if (!n) return;
    const tmp = vec3();
    for (let i = 0; i < n; ++i)
    {
        flakeData.y[i] -= flakeData.v[i] * dt;
        if (flakeData.y[i] < 0) flakeData.y[i] += 45;
        const x = camPos.x + ((flakeData.x[i] + Math.sin(time * 0.6 + flakeData.ph[i]) * 2 + 45) % 90 - 45);
        const z = camPos.z + ((flakeData.z[i] + 45) % 90 - 45);
        tmp.set(x, camPos.y - 22 + flakeData.y[i], z);
        snowflakes.setTransformAt(i, tmp);
    }
}

// ---------- everything ----------
function buildScenery()
{
    buildTrack();
    buildBridge();
    buildTunnel();
    buildWater();
    const counts = buildTreesAndFlowers();
    buildAnimals();
    buildSnowmen();
    buildSky3D();
    return counts;
}

function waterUpdate(skyColor)
{
    for (const o of water.objs) { o.color.r = skyColor.r * 0.35 + 0.08; o.color.g = skyColor.g * 0.4 + 0.3; o.color.b = skyColor.b * 0.4 + 0.45; }
}
