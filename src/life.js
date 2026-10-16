'use strict';
// LittleTrain life: lakeside details, more animals by the water, a flock of sheep and two flocks of birds.

const _lp = {}, _lq = {};
const rnd = (seed) => hash1(seed * 12.9898 + 4.1);

// where the shore is, at an angle around a lake: the first point going outward that is above the water
function shorePoint(L, ang, out)
{
    const cx = Math.cos(ang), cz = Math.sin(ang);
    let r = L.r * 0.7;
    for (; r < L.r + 30; r += 0.5) if (groundY(L.x + cx * r, L.z + cz * r) >= L.level + 0.35) break;
    out.x = L.x + cx * r; out.z = L.z + cz * r; out.y = groundY(out.x, out.z); out.r = r;
    return out;
}

// ---------- lakeside: reeds, rocks, bushes, bank flowers, lily pads, frogs, a little pier with a boat ----------
const lilyPads = [];

function buildWaterside()
{
    const reedMesh = new Mesh();
    for (let i = 0; i < 4; ++i)
    {
        const a = i * 1.6, x = Math.cos(a) * 0.35, z = Math.sin(a) * 0.35, h = 2.2 + (i % 2) * 0.7;
        part(reedMesh, buildCylinder(0.12, h, 5), x, h / 2, z, hsl(0.27, 0.55, 0.38), vec3(0.08 * (i - 1.5), 0, 0.1 * (1.5 - i)));
        part(reedMesh, buildCylinder(0.3, 0.75, 6), x, h + 0.1, z, hsl(0.06, 0.6, 0.28));          // cattail head
    }
    const rockMesh = new Mesh();
    part(rockMesh, buildSphere(1.8, 7, 4), 0, 0.5, 0, WHITE, undefined, vec3(1, 0.62, 0.85));
    const bushMesh = new Mesh();
    part(bushMesh, buildSphere(2.2, 8, 5), 0, 0.9, 0, hsl(0.3, 0.55, 0.38));
    part(bushMesh, buildSphere(1.6, 8, 5), 1.0, 0.7, 0.4, hsl(0.32, 0.55, 0.43));
    part(bushMesh, buildSphere(1.5, 8, 5), -0.9, 0.7, -0.4, hsl(0.28, 0.55, 0.35));
    const flowerMesh = new Mesh();
    part(flowerMesh, buildCylinder(0.1, 0.8, 5), 0, 0.4, 0, hsl(0.3, 0.6, 0.4));
    for (let i = 0; i < 5; ++i) part(flowerMesh, buildSphere(0.34, 5, 3), Math.cos(i * 1.257) * 0.28, 0.9, Math.sin(i * 1.257) * 0.28, WHITE);
    part(flowerMesh, buildSphere(0.26, 5, 3), 0, 0.92, 0, hsl(0.13, 1, 0.6));
    const padMesh = new Mesh();
    part(padMesh, buildCylinder(2.1, 0.08, 14), 0, 0, 0, hsl(0.33, 0.6, 0.36));
    part(padMesh, buildCylinder(0.6, 0.1, 6), 0.7, 0.01, 0, hsl(0.55, 0.5, 0.55));   // notch of lighter water
    const blossomMesh = new Mesh();
    for (let i = 0; i < 6; ++i) part(blossomMesh, buildSphere(0.38, 5, 3), Math.cos(i * 1.05) * 0.3, 0.2, Math.sin(i * 1.05) * 0.3, hsl(0.93, 0.8, 0.82), undefined, vec3(1, 0.5, 1));
    part(blossomMesh, buildSphere(0.3, 5, 3), 0, 0.25, 0, hsl(0.13, 1, 0.6));

    const lakes = TERRAIN.lakes, N = {reed: 0, rock: 0, bush: 0, flower: 0, pad: 0, blossom: 0};
    const per = lakes.length;
    const reeds = new InstancedMesh3D(reedMesh, 220 * per, undefined, WHITE);
    const rocks = new InstancedMesh3D(rockMesh, 40 * per, undefined, WHITE);
    const bushes = new InstancedMesh3D(bushMesh, 40 * per, undefined, WHITE);
    const flowers = new InstancedMesh3D(flowerMesh, 140 * per, undefined, WHITE);
    const pads = new InstancedMesh3D(padMesh, 40 * per, undefined, WHITE);
    const blossoms = new InstancedMesh3D(blossomMesh, 14 * per, undefined, WHITE);
    const rot = vec3(), sc = vec3(), pos = vec3(), sp = {};
    lakes.forEach((L, li) =>
    {
        const lakeSeed = li * 100;
        for (let i = 0; i < 220; ++i)   // reeds fringe the whole shore, in clumps
        {
            const clump = Math.floor(i / 5), ang = rnd(lakeSeed + clump) * TAU + (rnd(lakeSeed + i * 3) - 0.5) * 0.12;
            shorePoint(L, ang, sp);
            const r = sp.r + (rnd(lakeSeed + i * 7) - 0.65) * 3.2, x = L.x + Math.cos(ang) * r, z = L.z + Math.sin(ang) * r;
            const y = groundY(x, z);
            if (y > L.level + 3 || N.reed >= reeds.maxCount) continue;
            const k = 0.8 + rnd(lakeSeed + i * 11) * 0.7;
            reeds.setTransformAt(N.reed++, pos.set(x, Math.max(y, L.level) - 0.3, z), rot.set(0, rnd(i) * TAU, 0), sc.set(k, k, k));
        }
        for (let i = 0; i < 40; ++i)   // rocks, some in the shallows
        {
            const ang = rnd(lakeSeed + 500 + i) * TAU;
            shorePoint(L, ang, sp);
            const r = sp.r + (rnd(lakeSeed + 600 + i) - 0.6) * 4, x = L.x + Math.cos(ang) * r, z = L.z + Math.sin(ang) * r;
            const k = 0.7 + rnd(lakeSeed + 700 + i) * 1.3;
            rocks.setColorAt(N.rock, hsl(0.1, 0.06, 0.45 + rnd(i * 3) * 0.2).lerp(WHITE, snowAt(wrapS(LAKES[li].s)) * 0.7));
            rocks.setTransformAt(N.rock++, pos.set(x, Math.max(groundY(x, z), L.level - 0.2) - 0.25, z), rot.set(0, rnd(i * 5) * TAU, 0), sc.set(k * 1.2, k, k));
        }
        for (let i = 0; i < 40; ++i)   // bushes a little way up the bank
        {
            const ang = rnd(lakeSeed + 800 + i) * TAU;
            shorePoint(L, ang, sp);
            const r = sp.r + 2.5 + rnd(lakeSeed + 900 + i) * 8, x = L.x + Math.cos(ang) * r, z = L.z + Math.sin(ang) * r;
            const k = 0.7 + rnd(lakeSeed + 950 + i) * 0.8;
            bushes.setColorAt(N.bush, hsl(0.3, 0.1, 1).lerp(hsl(0.07, 0.8, 0.8), sunsetAt(LAKES[li].s)));
            bushes.setTransformAt(N.bush++, pos.set(x, groundY(x, z) - 0.2, z), rot.set(0, rnd(i * 9) * TAU, 0), sc.set(k, k, k));
        }
        const green = snowAt(LAKES[li].s) < 0.3;
        for (let i = 0; i < 140 && green; ++i)   // bank flowers
        {
            const ang = rnd(lakeSeed + 1000 + i) * TAU;
            shorePoint(L, ang, sp);
            const r = sp.r + 0.8 + rnd(lakeSeed + 1100 + i) * 9, x = L.x + Math.cos(ang) * r, z = L.z + Math.sin(ang) * r;
            flowers.setColorAt(N.flower, hsl([0.97, 0.13, 0.0, 0.75, 0.08][i % 5], 0.9, 0.68));
            flowers.setTransformAt(N.flower++, pos.set(x, groundY(x, z) - 0.1, z), rot.set(0, rnd(i) * TAU, 0), sc.set(0.9, 0.9, 0.9));
        }
        for (let i = 0; i < 40; ++i)   // lily pads, a few with blossoms
        {
            const a = rnd(lakeSeed + 1200 + i) * TAU, d = Math.sqrt(rnd(lakeSeed + 1300 + i)) * L.r * 0.85;
            const x = L.x + Math.cos(a) * d, z = L.z + Math.sin(a) * d, k = 0.7 + rnd(i * 13) * 0.7;
            pads.setTransformAt(N.pad++, pos.set(x, L.level + 0.17, z), rot.set(0, rnd(i * 17) * TAU, 0), sc.set(k, 1, k));
            if (i % 3 === 0 && N.blossom < blossoms.maxCount) { blossoms.setTransformAt(N.blossom++, pos.set(x, L.level + 0.2, z), rot, sc.set(k, k, k)); }
            if (i < 3) lilyPads.push({x, y: L.level + 0.25, z, lake: L});
        }
    });
    reeds.count = N.reed; rocks.count = N.rock; bushes.count = N.bush; flowers.count = N.flower; pads.count = N.pad; blossoms.count = N.blossom;
    for (const o of [reeds, flowers, pads, blossoms]) o.castShadow = false;
    return N;
}

// a little wooden pier with a rowing boat, reaching into each lake on the side facing the track
function buildPiers()
{
    const wood = hsl(0.08, 0.5, 0.42), wood2 = hsl(0.07, 0.5, 0.34);
    const m = new Mesh(), a = {x: 0, y: 0, z: 0}, b = {x: 0, y: 0, z: 0}, sp = {};
    LAKES.forEach((spec, li) =>
    {
        const L = TERRAIN.lakes[li];
        trackPos(spec.s + 14, _lq);
        const dx = -_lq.tz, dz = _lq.tx;                     // toward the track (the camera side)
        shorePoint(L, Math.atan2(dz, dx), sp);
        const deckY = L.level + 0.95, len = 13;
        for (let i = 0; i < len; i += 0.9)                   // planks
        {
            a.x = sp.x - dx * (i - 2); a.z = sp.z - dz * (i - 2); a.y = deckY;
            b.x = a.x - dx * 0.75; b.z = a.z - dz * 0.75; b.y = deckY;
            const px = -dz * 1.3, pz = dx * 1.3;
            beam(m, {x: a.x - px, y: deckY, z: a.z - pz}, {x: a.x + px, y: deckY, z: a.z + pz}, 0.75, 0.16, i % 1.8 < 0.9 ? wood : wood2, 0);
        }
        for (let i = 1; i < len; i += 3.2)                   // posts
            for (const s of [-1, 1])
            {
                const x = sp.x - dx * (i - 2) + (-dz) * 1.35 * s, z = sp.z - dz * (i - 2) + dx * 1.35 * s;
                beam(m, {x, y: L.level - 2, z}, {x, y: deckY + 0.7, z}, 0.28, 0.28, wood2, 0);
            }
        // rowing boat tied up beside the pier
        const bx = sp.x - dx * (len - 5) - (-dz) * 3.2, bz = sp.z - dz * (len - 5) - dx * 3.2;
        a.x = bx + dx * 2; a.z = bz + dz * 2; a.y = L.level + 0.45;
        b.x = bx - dx * 2; b.z = bz - dz * 2; b.y = L.level + 0.45;
        beam(m, a, b, 1.8, 0.8, hsl(0.01, 0.75, 0.52), 0.5);
        beam(m, {x: a.x, y: a.y + 0.45, z: a.z}, {x: b.x, y: b.y + 0.45, z: b.z}, 1.5, 0.12, hsl(0.12, 0.7, 0.8), 0.2);
        beam(m, {x: bx - (-dz) * 1.0, y: a.y + 0.7, z: bz - dx * 1.0}, {x: bx + (-dz) * 1.0, y: a.y + 0.7, z: bz + dx * 1.0}, 0.3, 0.12, wood, 0);
    });
    const o = new EngineObject3D(vec3(), m);
    o.specular = 0.1;
}

// ---------- animals: more ducks (with ducklings and swans), rabbits, deer, frogs ----------
function swanMesh()
{
    const m = new Mesh(), w = hsl(0.1, 0.05, 0.98);
    part(m, buildSphere(2.0, 10, 6), 0, 0.7, 0.2, w, undefined, vec3(0.8, 0.75, 1.5));
    part(m, buildCylinder(0.38, 1.7, 7), 0, 1.9, -0.9, w, vec3(-0.35, 0, 0));
    part(m, buildSphere(0.7, 8, 5), 0, 2.85, -1.45, w);
    part(m, box(0.3, 0.2, 0.55, 0.05), 0, 2.75, -1.95, hsl(0.07, 0.95, 0.55));
    for (const x of [-0.22, 0.22]) part(m, buildSphere(0.12, 5, 4), x, 2.95, -1.7, NAVY);
    part(m, buildSphere(1.3, 8, 5), 0, 1.1, 1.0, hsl(0.58, 0.06, 0.92), undefined, vec3(1.1, 0.6, 1));    // raised tail feathers
    return m;
}
function frogMesh()
{
    const m = new Mesh(), g = hsl(0.3, 0.7, 0.45);
    part(m, buildSphere(1.0, 8, 5), 0, 0.4, 0, g, undefined, vec3(1, 0.7, 1.2));
    for (const x of [-0.3, 0.3]) { part(m, buildSphere(0.42, 6, 4), x, 0.95, -0.4, WHITE); part(m, buildSphere(0.2, 5, 4), x, 1.0, -0.62, NAVY); }
    part(m, buildSphere(0.5, 6, 4), -0.5, 0.15, 0.6, g, undefined, vec3(0.7, 0.5, 1.2));
    part(m, buildSphere(0.5, 6, 4), 0.5, 0.15, 0.6, g, undefined, vec3(0.7, 0.5, 1.2));
    return m;
}

class Swimmer extends EngineObject3D
{
    constructor(lake, radius, phase, speed, mesh, scale = 1)
    {
        super(vec3(), mesh);
        this.lake = lake; this.radius = radius; this.phase = phase; this.speed = speed;
        this.scale3D.set(scale, scale, scale); this.size = scale;
    }
    update()
    {
        const a = this.phase + time * this.speed, L = this.lake, sg = Math.sign(this.speed);
        this.pos3D.set(L.x + Math.cos(a) * this.radius, L.level + 0.1 + Math.sin(time * 2 + this.phase * 3) * 0.05 * this.size, L.z + Math.sin(a) * this.radius);
        this.rotation3D.y = Math.atan2(sg * Math.sin(a), -sg * Math.cos(a));       // face along the swimming direction
        this.rotation3D.z = Math.sin(time * 2 + this.phase * 3) * 0.05;
    }
}

class Frog extends EngineObject3D
{
    constructor(pad, phase)
    {
        super(vec3(pad.x, pad.y, pad.z), frogMesh());
        this.pad = pad; this.phase = phase; this.rotation3D.y = phase * 7;
    }
    update()
    {
        const c = (time * 0.35 + this.phase) % 4, hop = c < 0.6 ? Math.sin(c / 0.6 * PI) : 0;   // a hop every few seconds
        this.pos3D.set(this.pad.x, this.pad.y + hop * 1.3, this.pad.z);
        this.rotation3D.x = c < 0.6 ? -0.3 * Math.cos(c / 0.6 * PI) : 0;
    }
}

function buildLakeAnimals()
{
    const [lakeA, lakeB] = TERRAIN.lakes;
    const duck = duckMesh(), swan = swanMesh();
    const addSwimmers = (L, specs) => specs.forEach(([r, ph, sp, mesh, sc]) => animals.push(new Swimmer(L, L.r * r, ph, sp / L.r * 3, mesh, sc)));
    addSwimmers(lakeA, [[0.25, 0, 0.07, duck, 1], [0.22, -0.18, 0.07, duck, 0.5], [0.22, -0.34, 0.07, duck, 0.5], [0.22, -0.5, 0.07, duck, 0.45],
        [0.5, 2.1, -0.08, duck, 1], [0.5, 2.3, -0.08, duck, 0.5], [0.5, 2.46, -0.08, duck, 0.5],
        [0.7, 4.0, 0.05, swan, 1], [0.7, 4.5, 0.05, swan, 0.9], [0.4, 5.3, -0.06, duck, 1]]);
    addSwimmers(lakeB, [[0.3, 0, 0.1, duck, 1], [0.3, -0.22, 0.1, duck, 0.5], [0.3, -0.42, 0.1, duck, 0.5],
        [0.6, 3, -0.09, swan, 1], [0.55, 4.6, 0.08, duck, 1], [0.55, 4.4, 0.08, duck, 0.5]]);
    lilyPads.forEach((p, i) => animals.push(new Frog(p, i * 0.9)));

    // rabbits, deer and fawns on the banks, between the lakes and the track so the camera sees them
    const sp = {}, specs = [[0, 550], [1, 1285]];
    for (const [li, st] of specs)
    {
        const L = TERRAIN.lakes[li];
        trackPos(st, _lq);
        const base = Math.atan2(_lq.tx, -_lq.tz);                  // direction from the lake toward the track
        const rabbits = [[-0.9, 5], [-0.55, 8], [-0.2, 6], [0.15, 9], [0.5, 6], [0.85, 8], [1.2, 5]];
        const deer = [[-0.7, 12, 1], [0.0, 14, 1], [0.6, 11, 0.55], [0.3, 17, 1], [-0.35, 16, 0.6]];
        rabbits.forEach(([da, d], i) =>
        {
            shorePoint(L, base + da, sp);
            const x = L.x + Math.cos(base + da) * (sp.r + d), z = L.z + Math.sin(base + da) * (sp.r + d);
            if (groundY(x, z) > L.level + 0.6) animals.push(new Rabbit(x, z, i * 1.7 + li));
        });
        deer.forEach(([da, d, sc], i) =>
        {
            shorePoint(L, base + da, sp);
            const x = L.x + Math.cos(base + da) * (sp.r + d), z = L.z + Math.sin(base + da) * (sp.r + d);
            if (groundY(x, z) > L.level + 0.6) { const dr = new Deer(x, z, i * 1.3 + 2 + li); dr.scale3D.set(sc, sc, sc); animals.push(dr); }
        });
    }
}

// ---------- a flock of sheep on the pasture near the end of the lap ----------
function sheepMeshes()
{
    const wool = new Mesh(), w = hsl(0.1, 0.1, 0.97), dark = hsl(0.08, 0.2, 0.2);
    part(wool, buildSphere(2.7, 10, 6), 0, 1.75, 0, w, undefined, vec3(1, 0.85, 1.3));
    for (const [x, y, z, d] of [[0.8, 2.1, 0.5, 1.6], [-0.8, 2.1, 0.5, 1.6], [0, 2.5, -0.3, 1.7], [0.7, 1.9, -0.9, 1.4], [-0.7, 1.9, -0.9, 1.4], [0, 2.1, 1.2, 1.5]])
        part(wool, buildSphere(d, 7, 4), x, y, z, w);
    for (const [x, z] of [[-0.6, -0.8], [0.6, -0.8], [-0.6, 0.8], [0.6, 0.8]]) part(wool, buildCylinder(0.26, 1.2, 6), x, 0.6, z, dark);
    const head = new Mesh();
    part(head, buildSphere(1.0, 8, 5), 0, 0, -0.5, dark, undefined, vec3(0.85, 1, 1.15));
    part(head, buildSphere(1.15, 8, 5), 0, 0.25, -0.1, w, undefined, vec3(0.9, 0.7, 0.8));       // woolly forelock
    for (const x of [-0.6, 0.6]) part(head, buildSphere(0.42, 6, 4), x, 0.1, -0.1, dark, undefined, vec3(1.3, 0.5, 0.7));
    for (const x of [-0.25, 0.25]) part(head, buildSphere(0.13, 5, 4), x, 0.2, -1.0, WHITE);
    return {wool, head};
}

class Sheep extends EngineObject3D
{
    constructor(x, z, phase, meshes, scale)
    {
        super(vec3(x, 0, z), meshes.wool);
        this.home = vec3(x, 0, z); this.phase = phase; this.scale3D.set(scale, scale, scale);
        this.head = new EngineObject3D(vec3(0, 2.0, -1.6), meshes.head);
        this.addChild(this.head);
        this.radius = 2 + rnd(phase * 9) * 3; this.speed = 0.06 + rnd(phase * 4) * 0.05;
    }
    update()
    {
        const a = this.phase + time * this.speed;
        const x = this.home.x + Math.cos(a) * this.radius, z = this.home.z + Math.sin(a * 1.3) * this.radius;
        const vx = -Math.sin(a) * this.radius, vz = Math.cos(a * 1.3) * this.radius * 1.3;
        this.pos3D.set(x, groundY(x, z) - 0.1, z);
        this.rotation3D.y = Math.atan2(-vx, -vz);
        const graze = Math.max(0, Math.sin(time * 0.7 + this.phase * 5));                   // head down, eating grass
        this.head.rotation3D.x = graze * 0.9;
        this.head.pos3D.y = 2.0 - graze * 0.7;
        this.rotation3D.z = Math.sin(time * 3 + this.phase) * 0.012;
    }
}

function buildSheep()
{
    const meshes = sheepMeshes();
    const clusters = [[1346, 22], [1368, 34], [1392, 20], [6, 30]];       // route distance and distance inside the loop
    let n = 0;
    clusters.forEach(([s, lat], ci) =>
        {
            for (let i = 0; i < 4; ++i)
            {
                insidePoint(s + (rnd(ci * 17 + i) - 0.5) * 18, lat + (rnd(ci * 31 + i * 3) - 0.5) * 16, _lp);
                if (groundY(_lp.x, _lp.z) < TERRAIN.lakes[1].level + 1) continue;
                animals.push(new Sheep(_lp.x, _lp.z, ci * 3.1 + i * 1.7, meshes, 0.85 + rnd(ci * 7 + i) * 0.4 - (i === 3 ? 0.35 : 0)));
                ++n;
            }
        });
    return n;
}

// ---------- two flocks of birds, circling over the countryside and over the sunset valley ----------
function birdMesh(color)
{
    const m = new Mesh(), beak = hsl(0.09, 0.95, 0.55);
    part(m, buildSphere(1.0, 8, 5), 0, 0, 0, color, undefined, vec3(0.8, 0.8, 1.5));
    part(m, buildSphere(0.6, 6, 4), 0, 0.12, -0.85, color);
    part(m, buildCone(0.25, 0.5, 5), 0, 0.1, -1.3, beak, vec3(-PI / 2, 0, 0));
    part(m, box(0.5, 0.06, 0.7, 0.02), 0, 0.0, 0.95, color, vec3(0.2, 0, 0));
    return m;
}
function wingMesh(color, side)
{
    const m = new Mesh();
    part(m, box(1.9, 0.07, 0.8, 0.02), side * 0.95, 0, 0, color, vec3(0, side * 0.15, 0));
    return m;
}

class Bird extends EngineObject3D
{
    constructor(flock, row, side, bodyMesh, wingL, wingR)
    {
        super(vec3(), bodyMesh);
        this.flock = flock; this.row = row; this.side = side;
        this.castShadow = false;
        this.left = new EngineObject3D(vec3(0, 0.1, 0), wingL); this.right = new EngineObject3D(vec3(0, 0.1, 0), wingR);
        this.left.castShadow = this.right.castShadow = false;
        this.addChild(this.left); this.addChild(this.right);
        this.flap = rnd(row * 3 + side) * TAU;
    }
    update()
    {
        const F = this.flock, a = F.phase + time * F.omega, sg = Math.sign(F.omega);
        const fx = -sg * Math.sin(a), fz = sg * Math.cos(a);                 // flight direction
        const rx = -fz, rz = fx;                                             // flock's right
        const lat = this.side * this.row * 2.6, back = this.row * 2.2;
        const bob = Math.sin(time * 1.3 + this.row * 0.8) * 0.6;
        this.pos3D.set(F.cx + Math.cos(a) * F.r + rx * lat - fx * back, F.cy + bob + Math.sin(time * 0.4 + F.phase) * 1.5, F.cz + Math.sin(a) * F.r + rz * lat - fz * back);
        this.rotation3D.set(Math.sin(this.flap + time * 9) * 0.08, Math.atan2(-fx, -fz), -sg * 0.28);
        const w = Math.sin(time * 9 + this.flap) * 0.65;
        this.left.rotation3D.z = w; this.right.rotation3D.z = -w;
    }
}

function buildBirds()
{
    const flocks = [
        {s: 170, lat: 70, up: 24, r: 34, omega: 0.11, phase: 0.5, color: hsl(0.1, 0.05, 0.98)},     // bright countryside: white birds
        {s: 560, lat: 75, up: 26, r: 38, omega: -0.09, phase: 2.2, color: hsl(0.72, 0.35, 0.3)},     // sunset valley: dark silhouettes
    ];
    for (const F of flocks)
    {
        insidePoint(F.s, F.lat, _lp);
        F.cx = _lp.x; F.cz = _lp.z; F.cy = Math.max(_lp.y, groundY(_lp.x, _lp.z)) + F.up;
        const body = birdMesh(F.color), wl = wingMesh(F.color, -1), wr = wingMesh(F.color, 1);
        animals.push(new Bird(F, 0, 1, body, wl, wr));
        for (let row = 1; row <= 4; ++row) for (const side of [-1, 1]) animals.push(new Bird(F, row, side, body, wl, wr));
    }
    return flocks.length;
}

function buildLife()
{
    const shore = buildWaterside();
    buildPiers();
    buildLakeAnimals();
    return {shore, sheep: buildSheep(), flocks: buildBirds()};
}
