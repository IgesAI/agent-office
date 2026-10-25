# Visual style guide — first workstation slice

Status: preliminary direction, not an approved final room. Preserve the surrounding office while validating one pair of workstations.

- Palette: walnut #654936, graphite #303a39, brushed bronze #9c8563, warm porcelain #e3ded1, muted teal #527a70, leather #9d7050. Status colors remain semantic and belong to existing worker views.
- Scale: metres, +Y up, +Z forward. Desk 2.2 × 1.1 m, work surface 0.78 m. Chair center remains 0.9 m in front of desk and uses the existing worker seat anchor. Feet and collision bounds must agree.
- Forms: beveled walnut top, recessed edge, inset cable tray, sculpted upholstered seat/back, five-spoke base with casters, curved task lamp. Use the Blender source pipeline, not runtime placeholder furniture.
- Materials: restrained MeshStandardMaterial, high roughness on textile, medium on wood, metal only on hardware. Use subtle real geometry for seams; avoid neon edges and excessive bloom. No global material conversion.
- Light: retain existing daylight/weather initially. Local diffuse task illumination may follow after profiling. No permanent glowing floor or fake progress screens.
- Camera: reproducible 1440 × 960 workstation and overview views. Existing explore controls remain the production default. A preview composition is not a management camera implementation.
- Characters: preserve existing proportions/poses for this increment. Future humanoids need one consistent silhouette, skeleton, garment style and seated reach; do not mix unrelated purchased characters.
- Detail: cable management, upholstery piping, joints and small hardware; leave hand/laptop areas clear. The current two desks share one model. Individual desk dressings remain future work.
- UI: existing operational UI remains. Review-page typography uses system sans, 12 px labels, 18 px title, 28 px outer margin. It explicitly labels visual review with no agent execution.
- Shadows: existing 2048 PCF sun baseline. Observe close-up acne/contact before introducing a local shadow pass. Graphics claims require images.
- Motion: deterministic cosmetic behavior, never model calls. Respect reduced motion and preserve all execution-driven worker state.

Reference images: [baseline](evidence/before-workstation.png) and [first increment](evidence/after-workstation.png). These are our own rendered source, not third-party art references.
