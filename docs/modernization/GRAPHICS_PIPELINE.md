# Graphics pipeline decisions

Production stays on WebGLRenderer r186, its existing color management and OutlineEffect. No major versions change. The first local material/asset extension does not replace the sky, camera, world loop or renderer.

Official references checked during the audit:

- [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer): renderer configuration, resource information and pixel ratio.
- [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader): GLB loading, Meshopt/Draco/KTX2 decoder attachment and image-bitmap disposal requirements.
- [WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html): WebGPU with WebGL2 backend fallback. Backend fallback alone does not establish compatibility with our custom shaders/effects.
- [ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial): current custom GLSL materials are specific to WebGLRenderer.
- [WebGPU postprocessing](https://threejs.org/manual/pages/webgpu-postprocessing.html): a different postprocessing path that needs its own parity tests.

Asset pipeline: original Blender Python source → beveled geometry/semantic material names → GLB → existing cached GLTFLoader → cloned instance with local PBR palette → original desk anchors and collision → visual/model-contract tests. No downloaded commercial assets.

Compression and texture decisions: first asset uses material colors, no texture payload. Measure actual GLB bytes and triangle count before adding Meshopt/Draco decoding. KTX2 becomes useful when texture payloads justify it; all decoders must be self-hosted and tested offline. AnimationMixer and SkeletonUtils are already available; new character clips remain a separate milestone. Instancing/LOD apply when profiling shows meaningful repeated draw/triangle costs; do not flatten moving chair/worker anchors.

WebGPU/TSL experiment gate: reproduce sky/fog, OutlineEffect or equivalent, terminal canvases, first-person hands, view filters, all maps and context-loss behavior. Test supported browsers/hardware, cold load, CPU/GPU/frame percentiles and fallback. Until then it is research only. R3F/Drei would introduce another scene/lifecycle owner; Triplex is not a reason to migrate; Theatre adds authoring/runtime complexity before camera requirements are settled. None is selected.

Global tone mapping, AO, bloom and environment lighting are deferred to avoid changing the appearance/readability of every map and screen. Quality presets must be measured on the whole scene; this first asset increment does not claim to deliver them.
