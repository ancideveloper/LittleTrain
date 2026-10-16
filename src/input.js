'use strict';
// LittleTrain input: any key, mouse press or touch. Presses give an impulse, holding gives steady push.

const input = {presses: 0, held: 0, everUsed: false};
const heldKeys = new Set();
const heldPointers = new Set();
const BLOCKED_KEYS = new Set([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', 'Tab', 'Backspace']);

function inputPress()
{
    ++input.presses;
    input.everUsed = true;
    document.body.classList.add('started');   // fades out the start message
    audioUnlock();
}

function trainInputInit(target)
{
    const opts = {passive: false};
    window.addEventListener('keydown', e =>
    {
        // Keep browser shortcuts (reload, devtools, copy...) working
        if (e.ctrlKey || e.metaKey || e.altKey || e.key === 'F5' || e.key === 'F12') return;
        if (BLOCKED_KEYS.has(e.key)) e.preventDefault();
        if (e.key === 'Escape' || e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
        if (!e.repeat && !heldKeys.has(e.code)) inputPress();
        heldKeys.add(e.code);
        input.held = heldKeys.size + heldPointers.size;
    }, opts);
    window.addEventListener('keyup', e =>
    {
        heldKeys.delete(e.code);
        input.held = heldKeys.size + heldPointers.size;
    });
    target.addEventListener('pointerdown', e =>
    {
        e.preventDefault();
        heldPointers.add(e.pointerId);
        input.held = heldKeys.size + heldPointers.size;
        inputPress();
    }, opts);
    const release = e =>
    {
        heldPointers.delete(e.pointerId);
        input.held = heldKeys.size + heldPointers.size;
        audioUnlock();   // touch devices only count pointerup as an audio-unlocking gesture
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', () => { heldKeys.clear(); heldPointers.clear(); input.held = 0; });
    // Stop page scrolling / pinch / context menu on touch screens
    for (const ev of ['touchstart', 'touchmove', 'touchend'])
        target.addEventListener(ev, e => e.preventDefault(), opts);
    window.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('wheel', e => e.preventDefault(), opts);
}
