'use strict';
// LittleTrain terrain: one height map around the loop. The rails sit on a flat bed; inside the loop the land rolls
// into hills, lakes and a snowy mountain, outside it falls away so the camera always has a clear view.

const TERRAIN = {n: 257, map: null, pos: null, size: null, lakes: [], mountain: null};
const _tp = {}, _tq = {};

function vnoise(x, y)
{
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const h = (a, b) => hash1(a * 57.3 + b * 131.7) * 2 - 1;
    return mix(mix(h(xi, yi), h(xi + 1, yi), u), mix(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
const fbm = (x, y) => vnoise(x, y) * 0.6 + vnoise(x * 2.1, y * 2.1) * 0.28 + vnoise(x * 4.3, y * 4.3) * 0.12;

// point `side` units to the left of the track at route distance s (the inside of the loop)
function insidePoint(s, side, out)
{
    trackPos(s, _tp);
    out.x = _tp.x + _tp.tz * side; out.z = _tp.z - _tp.tx * side; out.y = _tp.y;
    return out;
}

const GRASS = [hsl(0.27, 0.5, 0.5), hsl(0.15, 0.5, 0.5), hsl(0.57, 0.3, 0.96)];   // day, sunset, snow

function buildTerrain()
{
    const N = TERRAIN.n, B = LOOP_BOUNDS, margin = 150;
    const minX = B.minX - margin, maxX = B.maxX + margin, minZ = B.minZ - margin, maxZ = B.maxZ + margin;
    const sx = maxX - minX, sz = maxZ - minZ;

    // lakes and mountain centres
    TERRAIN.lakes = LAKES.map(l =>
    {
        const c = insidePoint(l.s, l.side, {});
        return {x: c.x, z: c.z, r: l.radius, level: trackY(l.s) - l.drop};
    });
    const mc = insidePoint(MOUNTAIN.s, MOUNTAIN.side, {});
    TERRAIN.mountain = {x: mc.x, z: mc.z, r: MOUNTAIN.radius, h: MOUNTAIN.height};

    // track samples every 2 units, bucketed for nearest-point queries
    const step = 2, count = ROUTE_LENGTH / step, cell = 24;
    const tx = new Float32Array(count + 1), tz = new Float32Array(count + 1), ty = new Float32Array(count + 1);
    const bw = Math.ceil(sx / cell) + 1, bh = Math.ceil(sz / cell) + 1, buckets = Array.from({length: bw * bh}, () => []);
    for (let i = 0; i <= count; ++i)
    {
        trackPos(i * step, _tp);
        tx[i] = _tp.x; tz[i] = _tp.z; ty[i] = _tp.y;
        if (i < count) buckets[Math.floor((_tp.z - minZ) / cell) * bw + Math.floor((_tp.x - minX) / cell)].push(i);
    }

    // smooth field that follows the rail heights, so the land rises where the track climbs
    const cw = 97, ch = 77, coarse = new Float32Array(cw * ch), sigma = 55;
    for (let j = 0; j < ch; ++j)
        for (let i = 0; i < cw; ++i)
        {
            const x = minX + sx * i / (cw - 1), z = minZ + sz * j / (ch - 1);
            let sw = 0, sy = 0;
            for (let k = 0; k < count; k += 4)
            {
                const dx = x - tx[k], dz = z - tz[k], d2 = dx * dx + dz * dz;
                if (d2 > 250 * 250) continue;
                const w = Math.exp(-d2 / (2 * sigma * sigma));
                sw += w; sy += w * ty[k];
            }
            coarse[j * cw + i] = sw > 1e-6 ? sy / sw : 0;
        }
    const baseAt = (x, z) =>
    {
        const u = clamp((x - minX) / sx * (cw - 1), 0, cw - 1.001), v = clamp((z - minZ) / sz * (ch - 1), 0, ch - 1.001);
        const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
        return mix(mix(coarse[j * cw + i], coarse[j * cw + i + 1], fu), mix(coarse[(j + 1) * cw + i], coarse[(j + 1) * cw + i + 1], fu), fv);
    };

    const H = [], C = [];
    let hmin = 1e9, hmax = -1e9;
    const tmpColor = new Color();
    for (let row = 0; row < N; ++row)
    {
        const hr = [], cr = [], z = minZ + sz * row / (N - 1);
        for (let col = 0; col < N; ++col)
        {
            const x = minX + sx * col / (N - 1);
            // nearest point on the track
            const bi = Math.floor((x - minX) / cell), bj = Math.floor((z - minZ) / cell);
            let best = 1e12, bk = 0;
            for (let ring = 0; ring < 40; ++ring)
            {
                for (let j = bj - ring; j <= bj + ring; ++j)
                    for (let i = bi - ring; i <= bi + ring; ++i)
                    {
                        if (Math.max(Math.abs(i - bi), Math.abs(j - bj)) !== ring || i < 0 || j < 0 || i >= bw || j >= bh) continue;
                        for (const k of buckets[j * bw + i])
                        {
                            const dx = x - tx[k], dz = z - tz[k], d2 = dx * dx + dz * dz;
                            if (d2 < best) { best = d2; bk = k; }
                        }
                    }
                if (best < (ring * cell) * (ring * cell)) break;
            }
            // project onto the neighbouring segments for a continuous s and distance
            let sNear = bk * step, dist = Math.sqrt(best);
            for (const k of [(bk + count - 1) % count, bk])
            {
                const x0 = tx[k], z0 = tz[k], ex = tx[k + 1] - x0, ez = tz[k + 1] - z0;
                const t = clamp(((x - x0) * ex + (z - z0) * ez) / (ex * ex + ez * ez));
                const d = Math.hypot(x - x0 - ex * t, z - z0 - ez * t);
                if (d <= dist + 1e-6) { dist = d; sNear = k * step + t * step; }
            }
            trackPos(sNear, _tq);
            const outside = ((x - _tq.x) * -_tq.tz + (z - _tq.z) * _tq.tx) > 0;
            const bed = _tq.y - 0.35;

            // inside the loop: rolling hills, ridge over the tunnel, lakes, mountain
            let hin = baseAt(x, z) + 9 * fbm(x * 0.011 + 3, z * 0.011);
            hin += 17 * bump(sNear, TUNNEL.a - 8, TUNNEL.b + 8, 25) * smooth((dist - 4) / 12) * (1 - smooth((dist - 40) / 30));
            const dm = Math.hypot(x - TERRAIN.mountain.x, z - TERRAIN.mountain.z);
            const mw = smooth(1 - dm / TERRAIN.mountain.r);
            hin += TERRAIN.mountain.h * Math.pow(mw, 1.4) * (0.8 + 0.5 * Math.abs(fbm(x * 0.02, z * 0.02 + 9)));
            let lakeZone = 0, lakeRim = 0;
            for (const L of TERRAIN.lakes)
            {
                const dl = Math.hypot(x - L.x, z - L.z), t = smooth((L.r + 14 - dl) / 14);
                if (t > 0) hin = mix(hin, L.level - 5 + 5 * smooth(dl / L.r), t);
                lakeZone = Math.max(lakeZone, t); lakeRim = Math.max(lakeRim, 1 - Math.min(1, Math.abs(dl - L.r) / 5));
            }
            const gorgeFull = RAVINE.depth * bump(sNear, RAVINE.a, RAVINE.b, RAVINE.edge);
            let h;
            if (outside) h = mix(bed - gorgeFull, bed - 12 + 2 * vnoise(x * 0.05, z * 0.05), smooth((dist - 7) / 20));
            else h = mix(bed, hin, smooth((dist - 6) / 26)) - gorgeFull * (1 - smooth((dist - 8) / 55));

            hr.push(h); hmin = Math.min(hmin, h); hmax = Math.max(hmax, h);

            // vertex colour: day / sunset grass blended with snow, gravel under the rails, sand at the lake rim
            const sunset = sunsetAt(sNear);
            const snowV = Math.max(snowAt(sNear) * (1 - smooth((dist - 90) / 60)), mw > 0 ? smooth(mw * 2.2) : 0);
            const grass = GRASS[0].lerp(GRASS[1], sunset);
            const v = vnoise(x * 0.09, z * 0.09) * 0.045;
            tmpColor.set(grass.r + v, grass.g + v, grass.b + v, 1);
            let vc = tmpColor.lerp(GRASS[2], snowV);
            if (dist < 4.8) vc = vc.lerp(hsl(0.09, 0.2, 0.5 + 0.25 * snowAt(sNear)), 0.85);
            else if (lakeRim > 0 && snowV < 0.6) vc = vc.lerp(hsl(0.12, 0.6, 0.78), 0.7 * lakeRim);
            if (lakeZone > 0.9 && h < TERRAIN.lakes[0].level + 6 && snowV < 0.6) vc = vc.lerp(hsl(0.55, 0.45, 0.4), 0.45);
            cr.push(vc.copy());
        }
        H.push(hr); C.push(cr);
    }
    const range = hmax - hmin;
    for (const row of H) for (let i = 0; i < N; ++i) row[i] = (row[i] - hmin) / range;
    TERRAIN.pos = vec3((minX + maxX) / 2, hmin, (minZ + maxZ) / 2);
    TERRAIN.size = vec2(sx, sz);
    TERRAIN.map = new HeightMap(H, vec2(sx, sz), range, C, TERRAIN.pos);
    TERRAIN.map.castShadow = false;
    return TERRAIN.map;
}

const groundY = (x, z) => TERRAIN.map.getHeight(x, z);
