# Asset manifest

## Original simulation landmarks

`src/client/models/simulation.glb` is original work for this fork under the repository MIT license: upholstered bed, raised-continent globe, oven, bookshelves and planning board. Source is `blender/scripts/build_simulation.py`, using the existing `aokit` and `Piece` helpers. Exported with Blender 5.2 LTS: **624,296 bytes, 28,448 triangles**, five roots, no textures, third-party packs, skeletons or clips. Regenerate with `blender --background --factory-startup --python blender/scripts/build_simulation.py`. The GLB test checks all five roots and the 30k triangle budget.

The house reuses headquarters furniture and original kitchen/plants/lounge assets, with semantic PBR finishes in `simulation/house.ts`. It instances the 256 floor planks in three batches. House residents are procedural original capsule characters with independently posed limbs, eye shapes, name sprites and selection rings; each owns and disposes its geometry/materials/label. The static house resources have the page's lifetime. The globe's subdivided land surfaces follow the sphere rather than sinking below it. Legacy plant materials need their semantic color palette explicitly applied (their exported factors are neutral gray).

Existing retained assets: `desk_props.glb`, `plants.glb`, `lounge.glb`, `kitchen.glb` and six dog GLBs. Creator/source: Agent Office contributors, Blender scripts in this repository; retain the root MIT license and attribution. No external commercial pack has been downloaded. Existing asset licensing is based on repository provenance, not a claim about unexamined third-party sources.

## Original headquarters furniture

| Property | Implemented value |
| --- | --- |
| Runtime file | `src/client/models/headquarters.glb` |
| Reproducible source | `blender/scripts/build_headquarters.py`, using the repository's `aokit` and lounge slab helper |
| Creator/license | Original work for this fork; repository MIT license |
| Export tool | Blender 5.2 LTS, repository glTF export pipeline |
| Download size | 246,308 bytes |
| Triangles | 11,046 in the asset; two instances in the office |
| Roots and materials | `desk`, `chair`; child `screen`; 10 semantic materials |
| Size | Worktop 2.14 × 1.06 m, height 0.78 m; fits existing 2.2 × 1.1 m desk collision bounds |
| Texture assets | None; no external image/model pack or generated bitmap |
| Live display | Two reused 1024 × 408 CanvasTextures; SRGB, glTF `flipY=false` |
| Animation | No skeleton or animation clips; chair remains attached to the existing rotating chair group |
| Usage | Office desks 1 and 2 only; original furniture remains available as load-failure fallback |

Runtime finishes are centralized in `features/headquarters/materials.ts`: Walnut, Edge, Graphite, Bronze, Fabric, Piping, Porcelain, Rubber and Light. Screen is replaced with an unlit live terminal surface. Materials are cached and shared; each display texture is reused rather than reallocated on terminal updates. These resources have the existing office scene's application lifetime; there is no new scene-unmount lifecycle.

Regenerate from the repository root with `blender --background --python blender/scripts/build_headquarters.py`. `tests/headquarters-model.test.ts` checks footprint, screen clearance, floor contact, UV presence and triangle budget. Mesh compression/texture decoders were not added: this small untextured asset does not justify another runtime dependency in this increment.
