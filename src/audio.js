'use strict';
// LittleTrain audio: a soft synthesized steam whistle plus very quiet chuffs.
// Everything is created lazily from a user gesture to respect browser autoplay rules.

const WHISTLE_FIRST_DELAY = 2.2;        // seconds after the first input
const WHISTLE_MIN_GAP = 14, WHISTLE_MAX_GAP = 28;
const WHISTLE_PEAK_GAIN = 0.09;         // intentionally gentle

let audioCtx = null, audioMaster = null, noiseBuffer = null;
let whistleTimer = -1, whistleBusyUntil = 0, chuffTimer = 0, audioClock = 0;

function audioUnlock()
{
    try
    {
        if (!audioCtx)
        {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            audioCtx = new Ctx();
            const comp = audioCtx.createDynamicsCompressor();   // protects against sudden loud peaks
            audioMaster = audioCtx.createGain();
            audioMaster.gain.value = 0.8;
            audioMaster.connect(comp);
            comp.connect(audioCtx.destination);
            noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate >> 1, audioCtx.sampleRate);
            const d = noiseBuffer.getChannelData(0);
            for (let i = 0; i < d.length; ++i) d[i] = Math.random() * 2 - 1;
        }
        if (audioCtx.state !== 'running') audioCtx.resume();
    }
    catch (e) { audioCtx = null; }
}

function audioReady() { return audioCtx && audioCtx.state === 'running'; }

// One whistle tone: two slightly detuned sines through a low-pass, with a slow envelope.
function whistleNote(start, dur, f0, f1)
{
    const t = audioCtx.currentTime + start;
    const gain = audioCtx.createGain(), lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2200;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(WHISTLE_PEAK_GAIN, t + 0.08);
    gain.gain.setValueAtTime(WHISTLE_PEAK_GAIN, t + Math.max(0.1, dur - 0.35));
    gain.gain.linearRampToValueAtTime(0.0001, t + dur);
    lp.connect(gain); gain.connect(audioMaster);
    for (const mul of [1, 1.25])   // a gentle major-third chord, like a steam chime whistle
    {
        const o = audioCtx.createOscillator(), vib = audioCtx.createOscillator(), vg = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f0 * mul, t);
        o.frequency.linearRampToValueAtTime(f1 * mul, t + dur);
        vib.frequency.value = 5.5; vg.gain.value = 4;
        vib.connect(vg); vg.connect(o.frequency);
        o.connect(lp);
        o.start(t); vib.start(t); o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
    }
}

function playWhistle()
{
    if (!audioReady() || audioClock < whistleBusyUntil) return false;   // never overlap itself
    whistleNote(0, 0.32, 520, 530);
    whistleNote(0.42, 1.1, 525, 505);
    whistleBusyUntil = audioClock + 1.8;
    return true;
}

function playChuff(speedT)
{
    if (!audioReady()) return;
    const t = audioCtx.currentTime;
    const src = audioCtx.createBufferSource(), bp = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
    src.buffer = noiseBuffer;
    bp.type = 'bandpass'; bp.frequency.value = 700 + 500 * speedT; bp.Q.value = 0.8;
    const peak = 0.012 + 0.014 * speedT;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    src.connect(bp); bp.connect(g); g.connect(audioMaster);
    src.start(t, Math.random() * 0.25, 0.2);
}

// Called once per fixed update while the journey is running.
function audioUpdate(dt, running, speedT, wheelRevsPerSec)
{
    audioClock += dt;
    if (!running || !audioReady()) return;
    if (whistleTimer < 0) whistleTimer = audioClock + WHISTLE_FIRST_DELAY;
    if (audioClock >= whistleTimer && playWhistle())
        whistleTimer = audioClock + WHISTLE_MIN_GAP + Math.random() * (WHISTLE_MAX_GAP - WHISTLE_MIN_GAP);
    else if (audioClock >= whistleTimer)
        whistleTimer = audioClock + 1;

    chuffTimer -= dt * Math.min(2 * wheelRevsPerSec, 5);   // two chuffs per wheel turn, capped
    if (chuffTimer <= 0) { playChuff(speedT); chuffTimer = 1; }
}
