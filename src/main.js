'use strict';
// LittleTrain entry point. LittleJS provides the fixed-timestep loop, canvas, resize handling and the 3D renderer.

setShowSplashScreen(false);
setInputPreventDefault(true);
setCanvasClearColor(hsl(0.57, 0.6, 0.8));

const cameraRig = {dir: vec3(0, 0, -1), dist: 30, pitch: 0.3, target: vec3(), skyKey: ''};
let framesSeen = 0, sceneInfo = null;

// ---------- sky and light follow the train through the zones ----------
const SKY = {
    day:    {top: hsl(0.58, 0.85, 0.6),  horizon: hsl(0.55, 0.55, 0.88), sun: hsl(0.12, 0.2, 1),  sunDir: vec3(-0.4, 1, 0.3)},
    sunset: {top: hsl(0.75, 0.45, 0.5),  horizon: hsl(0.06, 0.85, 0.76), sun: hsl(0.07, 0.8, 0.72), sunDir: vec3(-0.9, 0.35, 0.25)},
    snow:   {top: hsl(0.57, 0.9, 0.64),  horizon: hsl(0.56, 0.5, 0.94),  sun: hsl(0.1, 0.3, 1),   sunDir: vec3(-0.35, 1, 0.4)},
};
const skyBlend = (key, sunset, snow) => SKY.day[key].lerp(SKY.sunset[key], sunset).lerp(SKY.snow[key], snow);

function skyUpdate(force)
{
    const s = train.midS, sunset = sunsetAt(s), snow = snowAt(s);
    const key = Math.round(sunset * 40) + ':' + Math.round(snow * 40);
    if (key !== cameraRig.skyKey || force)
    {
        cameraRig.skyKey = key;
        const top = skyBlend('top', sunset, snow), hor = skyBlend('horizon', sunset, snow);
        render3D.setSky(top, hor, hor.scale(0.9, 1), 0.55);
        render3D.sunColor = skyBlend('sun', sunset, snow);
        render3D.sunDirection = SKY.day.sunDir.lerp(SKY.sunset.sunDir, sunset).lerp(SKY.snow.sunDir, snow);
        render3D.ambientColor = top.scale(0.5, 1).lerp(WHITE, 0.25);
        waterUpdate(hor);
        setCanvasClearColor(hor);
    }
}

// ---------- camera: sits outside the loop, always far enough back to frame the whole train ----------
function cameraFit()
{
    const aspect = clamp(mainCanvasSize.x / Math.max(1, mainCanvasSize.y), 0.25, 4);   // never degenerate while the window is being resized
    const camera = render3D.camera;
    camera.fov = aspect < 1 ? 0.95 : 0.72;
    const halfH = Math.tan(camera.fov / 2), halfW = halfH * aspect;
    const needW = (TRAIN_LENGTH / 2 + 2.5) / halfW;
    const needH = (TRAIN_HEIGHT / 2 + 1.8) / halfH;
    return Math.max(needW, needH) * 1.15 + TRAIN_WIDTH;
}

function cameraUpdate(dt, snap)
{
    const rig = cameraRig, camera = render3D.camera;
    const k = snap ? 1 : 1 - Math.exp(-dt * 3);
    rig.dir.x += (train.heading.x - rig.dir.x) * k; rig.dir.z += (train.heading.z - rig.dir.z) * k;
    const l = Math.hypot(rig.dir.x, rig.dir.z) || 1; rig.dir.x /= l; rig.dir.z /= l;
    const fit = cameraFit();
    if (!Number.isFinite(rig.dist)) rig.dist = fit;
    rig.dist += (fit - rig.dist) * (snap ? 1 : 1 - Math.exp(-dt * 4));    // zoom changes are always smooth
    const t = rig.target;
    t.set(train.mid.x, train.mid.y + 2.8, train.mid.z);
    const rx = -rig.dir.z, rz = rig.dir.x, c = Math.cos(rig.pitch) * rig.dist, s = Math.sin(rig.pitch) * rig.dist;
    camera.pos.set(t.x + rx * c, t.y + s, t.z + rz * c);
    camera.lookAt(t);
    camera.near = 1; camera.far = 1600;
    render3D.shadowCenter = train.mid;
}

function gameInit()
{
    new Render3DPlugin;
    render3D.smoothShading = true;
    render3D.shadows = true;
    render3D.shadowRange = 110;
    render3D.shadowMapSize = isTouchDevice ? 1024 : 2048;
    render3D.setSky(SKY.day.top, SKY.day.horizon, SKY.day.horizon);
    render3D.setFog(180, 520);
    new DirectionalLight3D(vec3(0.2, 0.3, 1), hsl(0.6, 0.3, 0.25)).persistent = true;   // cool fill light opposite the sun

    document.title = 'LittleTrain';
    mainCanvas.setAttribute('role', 'img');
    mainCanvas.setAttribute('aria-label', 'LittleTrain: tap or press any key to make the little train go');
    trainInputInit(document.documentElement);

    const t0 = performance.now();
    buildTerrain();
    const tTerrain = performance.now() - t0;
    const counts = buildScenery();
    buildTrain();
    steamInit();
    trainLayout();
    skyUpdate(true);
    cameraUpdate(0, true);
    sceneInfo = {...counts, terrainMs: Math.round(tTerrain), totalBuildMs: Math.round(performance.now() - t0)};
}

function gameUpdate()
{
    const dt = timeDelta;
    trainUpdate(dt);
    steamUpdate(dt);
    audioUpdate(dt, train.moving, train.v / V_MAX, train.v / (TAU * 0.9));
}

function gameUpdatePost()
{
    const dt = timeDelta;
    cameraUpdate(dt, false);
    skyUpdate(false);
    skyObjectsUpdate(dt, render3D.camera.pos, snowAt(train.midS));
    ++framesSeen;
}

// Read-only diagnostics for developers (nothing is shown to players)
window.littleTrain = {train, steam, sparks, input, cameraRig, TERRAIN, get frames() { return framesSeen; }, get scene() { return sceneInfo; },
    ROUTE_LENGTH, ROUTE_ORIGINAL_LENGTH, routeArcLength, trackY, trackPos, sunsetAt, snowAt, playWhistle, audioReady: () => audioReady(),
    TRAIN_LENGTH, TRAIN_HEIGHT, TRAIN_WIDTH, cameraFit, cameraUpdate, trainLayout, skyUpdate};

engineInit(gameInit, gameUpdate, gameUpdatePost, undefined, undefined, []);
