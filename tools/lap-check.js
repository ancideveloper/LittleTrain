// Developer check (paste in the browser console): runs the simulation at full speed around the whole loop
// and reports the smallest margin (in pixels) between any corner of any car and the screen edge.
(function ()
{
    const W = mainCanvasSize.x, H = mainCanvasSize.y, cam = render3D.camera;
    const saved = {s: train.s, v: train.v, boost: train.boost, running: train.running};
    train.running = true; train.v = 0; train.boost = 0; train.s = 40; input.held = 1; trainLayout(); cameraUpdate(0, true);
    let minL = 1e9, minR = 1e9, minT = 1e9, minB = 1e9, maxV = 0, maxDv = 0, pv = 0, behind = 0;
    const steps = Math.ceil(ROUTE_LENGTH * 1.3 / (V_MAX / 60)) + 900, aspect = W / H, th = Math.tan(cam.fov / 2);
    for (let i = 0; i < steps; ++i)
    {
        input.held = i < steps * 0.75 ? 1 : 0;
        trainUpdate(1 / 60); steamUpdate(1 / 60); cameraUpdate(1 / 60, false);
        maxV = Math.max(maxV, train.v); maxDv = Math.max(maxDv, Math.abs(train.v - pv) * 60); pv = train.v;
        const view = cam.getViewMatrix(), t2 = Math.tan(cam.fov / 2);
        for (let c = 0; c < CARS.length; ++c)
        {
            const o = train.objects[c], hl = CARS[c].len / 2, top = c === 0 ? TRAIN_HEIGHT : 4.4;
            const m = buildMatrix(o.pos3D, o.rotation3D, vec3(1));
            for (const x of [-TRAIN_WIDTH / 2, TRAIN_WIDTH / 2]) for (const y of [0, top]) for (const z of [-hl, hl])
            {
                const p = view.transformPoint(m.transformPoint(vec3(x, y, z)));
                if (p.z >= 0) { ++behind; continue; }
                const nx = p.x / (-p.z * t2 * aspect), ny = p.y / (-p.z * t2);
                minL = Math.min(minL, (nx + 1) / 2 * W); minR = Math.min(minR, (1 - nx) / 2 * W);
                minT = Math.min(minT, (1 - ny) / 2 * H); minB = Math.min(minB, (ny + 1) / 2 * H);
            }
        }
    }
    Object.assign(train, saved); input.held = 0; trainLayout(); cameraUpdate(0, true);
    return {W, H, marginPx: {left: minL | 0, right: minR | 0, top: minT | 0, bottom: minB | 0}, maxSpeed: +maxV.toFixed(2), maxAccel: +maxDv.toFixed(2), behindCamera: behind, steps};
})();
