"""Original dollhouse landmarks. Metres, +Y up at runtime. No external assets."""
import bpy, bmesh, math, os, sys
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import aokit as ao
from build_headquarters import Piece, at, COLORS
COLORS.update({'Linen':'#e8e2d4','Blanket':'#8baa98','Ocean':'#6a9caa','Land':'#d5cd9e',
               'BookRed':'#ac7567','BookBlue':'#6c8d98','Paper':'#eee7d8','Board':'#3c5550'})

def bed():
    p=Piece()
    p.box('Walnut',(0,.24,0),(1.45,.32,2.25),.055)
    p.box('Edge',(0,.14,0),(1.24,.20,2.02),.025)
    p.box('Linen',(0,.49,0),(1.42,.25,2.18),.10)
    p.box('Blanket',(0,.61,.29),(1.46,.13,1.55),.06)
    p.box('Linen',(0,.70,.02),(1.46,.055,.23),.025)
    p.box('Linen',(0,.68,-.73),(1.04,.20,.49),.13)
    p.box('Walnut',(0,.68,-1.16),(1.55,1.04,.10),.055)
    p.box('Fabric',(0,.79,-1.095),(1.33,.64,.045),.035)
    for x in [-.56,.56]:
        for z in [-.87,.87]: p.rod('Bronze',(x,0,z),(x,.19,z),.035)
    p.finish('bed')

def globe():
    p=Piece()
    p.add('Walnut',ao.lathe,[(0,0),(.42,0),(.45,.04),(.41,.10),(0,.11)],center=at(0,0,0))
    p.rod('Bronze',(0,.08,0),(0,.72,0),.055)
    p.add('Ocean',ao.lathe,[(math.sin(t)*.52,.76+(1-math.cos(t))*.52) for t in [i*math.pi/32 for i in range(33)]],segs=48)
    p.add('Bronze',ao.torus,at(0,1.28,0),.57,.015,rot=(math.pi/2,0,.30),n=64,m=8)
    # Stylized raised landmasses, drawn onto the globe rather than a flat sticker.
    def land(bm, points):
        center=(sum(a for a,b in points)/len(points),sum(b for a,b in points)/len(points))
        def point(ll):
            lon,lat=[math.radians(v) for v in ll]
            return at(.526*math.cos(lat)*math.sin(lon),1.28+.526*math.sin(lat),.526*math.cos(lat)*math.cos(lon))
        sphere_center=Vector(at(0,1.28,0))
        def curved_triangle(a,b,c,depth):
            if depth:
                ab=(a+b)/2; bc=(b+c)/2; ca=(c+a)/2
                for tri in [(a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca)]: curved_triangle(*tri,depth-1)
            else:
                vs=[bm.verts.new(sphere_center+(q-sphere_center).normalized()*.531) for q in [a,b,c]]
                face=bm.faces.new(vs)
                face.normal_update()
                if face.normal.dot(face.calc_center_median()-sphere_center)<0: face.normal_flip()
        c=Vector(point(center)); vs=[Vector(point(q)) for q in points]
        for i in range(len(vs)): curved_triangle(c,vs[i],vs[(i+1)%len(vs)],3)
    for outline in [[(-145,60),(-105,70),(-65,45),(-85,10),(-110,25)],
                    [(-80,10),(-38,-5),(-50,-35),(-70,-55)],
                    [(-15,35),(35,35),(50,10),(25,-35),(-5,-5)],
                    [(-10,50),(30,70),(100,65),(145,45),(115,5),(65,10),(35,40)],
                    [(115,-15),(150,-15),(154,-36),(120,-40)]]: p.add('Land',land,outline)
    p.finish('globe')

def oven():
    p=Piece()
    p.box('Porcelain',(0,.46,0),(.86,.91,.72),.035)
    p.box('Graphite',(0,.91,0),(.88,.06,.74),.02)
    p.box('Edge',(0,.43,.367),(.72,.53,.025),.025)
    p.box('Board',(0,.43,.385),(.59,.37,.018),.018)
    p.rod('Bronze',(-.29,.72,.40),(.29,.72,.40),.018)
    for x in [-.25,0,.25]: p.rod('Graphite',(x,.82,.37),(x,.82,.40),.035,segs=20)
    for x in [-.23,.23]:
        for z in [-.20,.20]: p.add('Bronze',ao.torus,at(x,.947,z),.115,.012,n=28,m=6)
    p.box('Fabric',(0,.64,.423),(.32,.17,.02),.012)
    p.finish('oven')

def shelf():
    p=Piece()
    for x in [-.95,.95]: p.box('Walnut',(x,1,0),(.10,2,.44),.02)
    p.box('Edge',(0,1,-.22),(1.92,2,.045),.01)
    for y in [.10,.61,1.13,1.65,2.02]: p.box('Walnut',(0,y,0),(2,.07,.48),.012)
    for row,y in enumerate([.15,.66,1.18,1.70]):
        for j in range(10):
            h=.22+((j*7+row*3)%5)*.043
            x=-.80+j*.17
            mat=['BookRed','BookBlue','Blanket','Linen'][(j+row)%4]
            p.box(mat,(x,y+h/2,.02),(.11,h,.29),.008)
            p.box('Paper',(x,y+h*.75,.171),(.072,.012,.006),.001)
    p.finish('shelf')

def board():
    p=Piece()
    p.box('Walnut',(0,1.32,0),(2.28,1.32,.10),.045)
    p.box('Board',(0,1.32,.06),(2.10,1.15,.025),.025)
    for x in [-.86,.86]:
        p.rod('Bronze',(x,.04,0),(x,1.30,0),.025)
        p.rod('Graphite',(x,.03,-.35),(x,.03,.35),.03)
    # Pinned blank sheets: an analysis place, not invented charts or progress.
    for x,y in [(-.65,1.50),(-.05,1.50),(.55,1.50),(-.40,1.05),(.25,1.05)]:
        p.box('Paper',(x,y,.082),(.39,.32,.008),.006)
        p.rod('Bronze',(x,y+.11,.085),(x,y+.11,.10),.017,segs=10)
    p.finish('board')

ao.clear()
for build in [bed,globe,oven,shelf,board]: build()
print('SIMULATION',ao.export('simulation'),sum(ao.tris(o) for o in bpy.context.scene.objects if o.type=='MESH'))
