"""Original engineering workstation, in metres. Export: headquarters.glb.

Two roots, desk and chair; screen is a separate child of desk. Retains the
office's 2.2 x 1.1 x .78 desk and .9 chair offset. No external assets/textures.
Run Blender 5.2 --background --factory-startup --python this_file.py.
"""
import bpy, bmesh, math, os, sys
from mathutils import Matrix, Vector, Euler
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import aokit as ao
from build_lounge import slab

COLORS = {
    'Walnut': '#654936', 'Edge': '#392e27', 'Graphite': '#303a39',
    'Bronze': '#9c8563', 'Fabric': '#527a70', 'Piping': '#324e48',
    'Porcelain': '#e3ded1', 'Rubber': '#202726', 'Light': '#ffe6b5',
    'Screen': '#141b1d',
}

def at(x, y, z):
    return (x, -z, y)

class Piece:
    def __init__(self):
        self.parts = {}

    def add(self, mat, fn, *args, **kwargs):
        bm = self.parts.setdefault(mat, bmesh.new())
        fn(bm, *args, **kwargs)

    def box(self, mat, p, size, bevel=.012):
        self.add(mat, ao.box, at(*p), (size[0], size[2], size[1]), bevel=bevel, segments=3)

    def rod(self, mat, a, b, radius, rb=None, segs=16):
        self.add(mat, ao.cylinder, at(*a), at(*b), radius, rb=rb, segs=segs)

    def finish(self, name):
        objects = []
        for mat, bm in self.parts.items():
            ob = ao.mesh_object(name + '_' + mat, bm, [ao.material(mat, COLORS[mat])], smooth=False)
            objects.append(ob)
        ob = ao.join(objects[0], objects[1:])
        ob.name = name
        ob.data.name = name + '_mesh'
        ob.data.set_sharp_from_angle(angle=math.radians(45))
        return ob

def desk():
    p = Piece()
    # A softly eased solid top with an inset darker edge and underside cable spine.
    p.add('Walnut', slab, 2.14, 1.06, .716, .78, corner=.065, edge=.012, bottom=.01, csegs=5, esegs=3)
    p.add('Edge', slab, 2.08, 1.00, .702, .72, corner=.05, edge=.006, bottom=.004, csegs=4, esegs=2)
    for sx in [-1, 1]:
        x = sx * .93
        for z in [-.37, .37]:
            p.rod('Graphite', (x, .04, z), (x * .97, .71, z * .84), .025, rb=.032)
            p.rod('Bronze', (x, .025, z), (x, .065, z), .027)
            p.rod('Rubber', (x, .006, z), (x, .025, z), .025)
        p.box('Graphite', (x * .97, .685, 0), (.055, .055, .78))
    p.box('Graphite', (0, .64, -.28), (1.83, .06, .12))
    p.add('Graphite', slab, 1.45, .19, .53, .56, corner=.025, edge=.009, bottom=.008, z=-.31)
    # Upholstered modesty screen sits wholly below the interaction surface.
    p.box('Fabric', (0, .57, -.46), (1.76, .25, .035))
    for x in [-.85, .85]:
        p.box('Bronze', (x, .57, -.435), (.012, .19, .012), .003)
    # Sculpted rear monitor stand, space in front reserved for the real laptop.
    p.add('Graphite', slab, .43, .23, .781, .8, corner=.065, edge=.007, bottom=.003, z=-.31)
    p.rod('Bronze', (0, .79, -.33), (0, 1.16, -.4), .027)
    p.box('Graphite', (0, 1.22, -.39), (1.22, .53, .046), .02)
    p.box('Bronze', (0, .969, -.362), (.19, .009, .01), .003)
    for i in range(16):
        p.box('Edge', (-.36 + i * .048, 1.02, -.416), (.022, .004, .003), .001)
    # Warm task light on the left, with a turned shade and articulated stem.
    p.add('Graphite', ao.lathe, [(0, 0), (.075, 0), (.085, .008), (.08, .018), (0, .018)], center=at(-.86, .78, -.27), segs=24)
    p.rod('Bronze', (-.86, .8, -.27), (-.86, 1.11, -.35), .012)
    p.rod('Bronze', (-.86, 1.11, -.35), (-.71, 1.22, -.27), .012)
    p.add('Porcelain', ao.lathe, [(.09, 0), (.09, .018), (.055, .075), (.02, .09), (0, .09)], center=at(-.71, 1.16, -.27), segs=28)
    p.add('Light', ao.lathe, [(0, 0), (.076, 0), (.076, .006), (0, .006)], center=at(-.71, 1.159, -.27), segs=28)
    # Pencil tray, two pens and a small notebook, clear of the typing area.
    p.add('Edge', slab, .23, .38, .782, .797, corner=.025, edge=.004, bottom=.003, x=.88, z=.07)
    p.add('Porcelain', slab, .17, .22, .797, .809, corner=.008, edge=.003, bottom=.002, x=.88, z=.10)
    p.rod('Bronze', (.83, .803, -.10), (.83, .803, .015), .004, segs=8)
    p.rod('Graphite', (.87, .803, -.10), (.87, .803, .015), .004, segs=8)
    ob = p.finish('desk')
    # Explicit 0..1 UV plane, forward +Z in runtime. Runtime supplies only real terminal data.
    me = bpy.data.meshes.new('screen_mesh')
    me.from_pydata([at(-.584, .988, -.364), at(.584, .988, -.364), at(.584, 1.452, -.364), at(-.584, 1.452, -.364)], [], [(0, 1, 2, 3)])
    me.materials.append(ao.material('Screen', COLORS['Screen']))
    uv = me.uv_layers.new()
    for i, v in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]):
        uv.data[i].uv = v
    screen = bpy.data.objects.new('screen', me)
    bpy.context.scene.collection.objects.link(screen)
    screen.parent = ob
    return ob

def chair():
    p = Piece()
    # Soft upholstered shells; back follows a gentle recline and tapers at the shoulders.
    p.add('Piping', slab, .60, .56, .451, .508, corner=.12, edge=.023, bottom=.02, csegs=6, esegs=3)
    p.add('Fabric', slab, .586, .548, .463, .55, corner=.115, edge=.035, bottom=.026, csegs=6, esegs=4)
    def back(bm, inset=False):
        rings = []
        levels = [(.53, .25, .19), (.60, .29, .22), (.77, .29, .26), (.96, .25, .29), (1.04, .21, .30)]
        for y, half, z in levels:
            row = []
            for i in range(25):
                a = math.tau * i / 24
                # Rounded horizontal section, gently wrapping the sitter.
                x = half * math.cos(a)
                depth = (.032 if inset else .041) * math.sin(a)
                row.append(bm.verts.new(at(x * (.97 if inset else 1), y, z + depth + .07 * (x / half) ** 2 - (.012 if inset else 0))))
            rings.append(row)
        for lower, upper in zip(rings, rings[1:]):
            for i in range(24):
                face = bm.faces.new((lower[i], lower[i + 1], upper[i + 1], upper[i]))
                face.smooth = True
        bm.faces.new(tuple(reversed(rings[0][:-1])))
        bm.faces.new(tuple(rings[-1][:-1]))
        bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=.00001)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    p.add('Piping', back)
    p.add('Fabric', back, True)
    for sx in [-1, 1]:
        p.rod('Graphite', (sx * .24, .42, .10), (sx * .32, .65, .10), .016)
        p.add('Graphite', slab, .065, .31, .642, .674, corner=.03, edge=.012, bottom=.008, x=sx * .32, z=.015, csegs=4, esegs=3)
    p.rod('Graphite', (0, .10, 0), (0, .46, 0), .036)
    p.rod('Bronze', (0, .20, 0), (0, .36, 0), .039)
    for i in range(5):
        a = i * math.tau / 5
        x, z = math.cos(a) * .27, math.sin(a) * .27
        p.rod('Graphite', (0, .10, 0), (x, .055, z), .022, rb=.017)
        for dx in [-.018, .018]:
            p.rod('Rubber', (x + dx - .008, .035, z), (x + dx + .008, .035, z), .034)
    return p.finish('chair')

def main():
    ao.clear()
    desk()
    chair()
    path = ao.export('headquarters', uvs=True)
    print('HEADQUARTERS', path, 'triangles', sum(ao.tris(o) for o in bpy.context.scene.objects if o.type == 'MESH'))

if __name__ == '__main__':
    main()
