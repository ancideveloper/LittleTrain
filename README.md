# LittleTrain

A calm, endless 3D train journey for children aged 0-2, built on the [LittleJS](https://github.com/KilledByAPixel/LittleJS) engine (3D mode, v1.27.2, MIT).

Tap, click or press any key: the train starts. More taps or holding make it go faster; letting go lets it settle back to a gentle speed. There is no score, menu or text.

**Play online:** https://ancideveloper.github.io/LittleTrain/

## Run

```
node tools/serve.js      # then open http://localhost:8123
```

Any static file server works; `tools/serve.js` just disables caching while developing.

## Layout

| File | Purpose |
| --- | --- |
| `index.html` | page and script order |
| `src/route.js` | closed railway loop, height profile, zones (day, sunset, snow) |
| `src/terrain.js` | height-map terrain carved around the track, lakes, mountain, vertex colours |
| `src/scenery.js` | rails, bridge, open tunnel, trees, flowers, lakes, snowman, clouds, snowfall |
| `src/life.js` | lakeside details, ducks/swans/frogs/rabbits/deer, sheep flock, two bird flocks |
| `src/train.js` | speed model, 3D train, bounded steam pool, tap hint |
| `src/audio.js` | synthesized whistle and soft chuffs (starts only after a user gesture) |
| `src/input.js` | keyboard / mouse / touch input, scroll and gesture blocking |
| `src/main.js` | engine setup, sky and light per zone, camera framing |
| `tools/lap-check.js` | developer check: simulates a full lap at top speed and reports screen-edge margins |
| `vendor/littlejs.min.js` | LittleJS engine (MIT, see its header) |

## Route

The loop is 1400 units long (about 2.5x the 554-unit stadium loop of the original LittleJS site demo) and passes through: countryside with a bridge, an open tunnel, a sunset valley with a lake and animals, a snowy mountain with a snowman, and back through lakeside countryside to the start.

## Credits

Built with [LittleJS](https://github.com/KilledByAPixel/LittleJS) by Frank Force (MIT License).
