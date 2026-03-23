# TAU Disambiguation

## This Project's Convention

**All code and documentation in this project uses TAU = 1/PHI ≈ 0.618.**

```javascript
// penrose.js, line 6
const TAU = 1 / PHI;
```

TAU is the reciprocal of the golden ratio, used as the subdivision scaling factor in Robinson triangle decomposition. It determines how child triangles scale relative to their parent during recursive subdivision.

## Three Competing Conventions

The symbol τ (tau) has three different meanings across mathematics and programming:

| Convention | Value | Context |
|---|---|---|
| τ = φ ≈ 1.618 | Golden ratio itself | European mathematical tradition, some textbooks |
| **τ = 1/φ ≈ 0.618** | **Reciprocal of golden ratio** | **This project — subdivision scaling factor** |
| τ = 2π ≈ 6.283 | Circle constant | Tau Manifesto, modern programming (e.g., Python's `math.tau`) |

The identity connecting the first two: `TAU = 1/PHI = PHI - 1 ≈ 0.618033988749895`.

This is a unique property of the golden ratio: its reciprocal equals itself minus one.

## Where TAU Appears in the Codebase

- **Subdivision point placement** — when splitting Robinson triangles, child vertices are placed at `TAU` fraction along parent edges (scaling by the reciprocal of the golden ratio)
- **Arc radii in wiring** — conduit arc template radii are expressed as multiples of `TAU * sideLength`
- **Geometry constants** — `TAU` is defined alongside `PHI`, trigonometric constants (`sin36`, `cos36`, etc.), and template angles in `geometry.ts`

## Why 1/PHI, Not 2π

The Penrose P3 rhomb tiling is built from Robinson triangles. Each subdivision step decomposes a triangle into smaller triangles scaled by `1/PHI`. This scaling factor appears throughout the geometry:

- A thick rhomb's acute angle is 72°, and its diagonal ratio involves PHI
- A thin rhomb's acute angle is 36°, and its shorter diagonal is TAU times the longer
- The ratio of consecutive Fibonacci numbers converges to PHI; the inverse ratio converges to TAU

Using `TAU = 1/PHI` as a named constant avoids repeated `1/PHI` divisions and makes the geometric intent clear in the code.

## References

- [Tau (mathematics) — Wikipedia](https://en.wikipedia.org/wiki/Tau_(mathematics)) — covers all three conventions
- [Golden ratio — Wikipedia](https://en.wikipedia.org/wiki/Golden_ratio) — the PHI/TAU relationship
- [Penrose Tiling — GoldenNumber.net](https://www.goldennumber.net/penrose-tiling/) — golden ratio in Penrose tilings
- [The Tau Manifesto](https://www.tauday.com/tau-manifesto) — the competing τ = 2π convention

(*PD:Celes*)
