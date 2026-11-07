# AURA VISION 9.6

This release changes the playable scene and player rendering. The Lamine concept
is a visual target; the game continues to render its own geometry and match state.

- Smooth interpolated normals, directional fill, edge light, cloth detail and
  skin highlights replace the compatible renderer's flat triangle illumination.
  Its detailed animation frames are 192 × 336 pixels, compared with 128 × 224
  previously, across all 22 actions and 16 viewing directions.
- Procedural head-bound curls and closed football boots are real geometry in
  WebGL. The compatible renderer uses the same animated geometry, including
  depth-tested hair overlays and boot soles. Player art profiles give Lamine and
  several other footballers distinct silhouettes; they are not scanned faces.
- A full-pitch albedo combines subtle mowing, variation and goalmouth wear.
  Perspective LED advertising and safety rails sit inside the stadium scene.
  The shared night lighting gives the accelerated renderer cooler edge light,
  lower ambient fill and a separate shadow key.
- The reference sideline camera is lower and keeps the attacker and goal in view
  in the final third. Camera-relative movement and both halves retain their axes.

Performance mode keeps the smaller animation pages. Equilibrado uses at most 96
recoloured frames, Alto/Ultra 144, and Rendimiento 64; shadow caches are separately
bounded and every per-match cache is released when leaving the stadium. Images
are requested with anonymous CORS before their source is assigned, including
public-host redirects.

Rebuild the new assets with Python, NumPy, Pillow, SciPy and a C++17 compiler:

```sh
python3 scripts/build-cinema-pitch.py
python3 scripts/bake-motion-96.py
npm test
npm run build
```

The baker compiles its rasterizer into a temporary directory and atomically writes
the animation pages. It needs the existing clothed CC0 mesh and no downloaded
likeness model. All 533 tests pass, including the runtime in all four quality levels; browser visual
QA covers the compatible renderer because the shared browser disables WebGL.
