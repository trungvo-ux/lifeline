"""Remodel the supplied OP-1 GLB into a portrait 4x4 soundboard.

All visible hardware meshes below are copied from OP1.glb. Text and studio
lights are the only newly created scene elements.
"""

import bpy
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts"
OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath="/Users/trungvo/Downloads/source/OP1.glb")
source_objects = list(bpy.context.scene.objects)
source = {obj.name: obj for obj in source_objects}
bpy.context.view_layer.update()

def fit(obj, name, center, size):
    """Copy imported mesh with its original material, remapping its bounds."""
    points = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    lo = Vector(tuple(min(point[i] for point in points) for i in range(3)))
    hi = Vector(tuple(max(point[i] for point in points) for i in range(3)))
    mid = (lo + hi) / 2
    extent = hi - lo
    mesh = obj.data.copy()
    result = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(result)
    for vertex, point in zip(mesh.vertices, points):
        vertex.co = Vector(center) + Vector(tuple((point[i] - mid[i]) * size[i] / max(extent[i], .001) for i in range(3)))
    return result

def crop_key(obj):
    # The OP-1's round numbered keys live in one joined strip. Number 1 is
    # centered at x=-6.55, y=0.84 in that strip.
    points = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    faces = [face for face in obj.data.polygons if all(-7.27 <= points[i].x <= -5.82 and .13 <= points[i].y <= 1.56 for i in face.vertices)]
    used = sorted({i for face in faces for i in face.vertices})
    lookup = {old: new for new, old in enumerate(used)}
    mesh = bpy.data.meshes.new("OP-1 round numbered key")
    mesh.from_pydata([points[i] for i in used], [], [[lookup[i] for i in face.vertices] for face in faces])
    mesh.update()
    for material in obj.data.materials:
        mesh.materials.append(material)
    print("Round key source:", len(mesh.vertices), "vertices", len(mesh.polygons), "faces")
    return mesh

def label(body, name, x, y, z, size, material, turn=0):
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = body
    curve.size = size
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = (x, y, z)
    obj.rotation_euler[2] = turn
    obj.data.materials.append(material)

def simple_material(name, rgb):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*rgb, 1)
    material.use_nodes = True
    material.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*rgb, 1)
    return material

ink = simple_material("New printed charcoal lettering", (.06, .07, .07))
dim = simple_material("New grey subtext", (.20, .22, .22))
blue = simple_material("New OP-1 inspired screen blue", (.48, .68, .79))
red = simple_material("New red signature", (.88, .26, .17))

# The GLB's actual metal enclosure is re-proportioned as the SB-1 body.
fit(source["Cube.002"], "OP-1 chassis remodeled", (0, 0, 0), (3.9, 4.55, .20))
fit(source["Cube.004"], "OP-1 perforated speaker", (-1.49, 1.76, .14), (.70, .67, .11))
fit(source["Cube.013"], "OP-1 dark LCD module", (.11, 1.76, .15), (2.47, .66, .035))

key_source = crop_key(source["Tangent"])
template = bpy.data.objects.new("OP-1 round key template", key_source)
bpy.context.collection.objects.link(template)
labels = ["WORK IT", "MAKE IT", "DO IT", "MAKES US", "HARDER", "BETTER", "FASTER", "STRONGER", "MORE THAN", "HOUR", "OUR", "NEVER", "EVER", "AFTER", "WORK IS", "OVER"]
for index, name in enumerate(labels):
    x = -1.49 + (index % 4) * .842
    y = 1.00 - (index // 4) * .842
    fit(template, f"OP-1 key {index+1:02}", (x, y, .16), (.825, .825, .095))
    label(str(index+1), f"Pad {index+1} numeral", x, y+.03, .215, .21, ink)
    label(name, f"Pad {index+1} word", x, y-.16, .215, .055 if len(name) < 9 else .047, dim)
bpy.data.objects.remove(template, do_unlink=True)

# The OP-1 side control is made from its imported slider rails and white knob.
fit(source["Cube.016"], "OP-1 switch upper rail", (1.68, 1.9, .15), (.12, .24, .008))
fit(source["Cube.017"], "OP-1 switch lower rail", (1.68, 1.66, .15), (.12, .24, .008))
fit(source["Cylinder.018"], "OP-1 white switch knob", (1.68, 1.67, .21), (.15, .15, .06))

label("MUSIC", "Switch label", 1.68, 1.43, .16, .05, dim)
label("HARDER · BETTER", "Display title", -.55, 2.00, .19, .07, blue)
label("16 VOICES — 1 LOOP", "Display loop", .48, 2.00, .19, .065, blue)
label("SAM", "Display signature", 1.21, 2.00, .19, .075, red)
label("READY TO PLAY", "Display status", -.36, 1.73, .19, .105, blue)
label("INSTRUMENTAL OFF", "Display footer", -.45, 1.52, .19, .06, blue)
label("01 — 16", "Display pad range", 1.19, 1.52, .19, .065, blue)
label("SB–1", "Chassis marking", 1.68, -1.76, .13, .12, ink, -1.5708)

for obj in source_objects:
    bpy.data.objects.remove(obj, do_unlink=True)

# Studio backdrop and camera are separate from the remodeled product.
floor_mat = simple_material("Studio backdrop", (.94, .94, .93))
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.15))
bpy.context.object.name = "Studio floor"
bpy.context.object.data.materials.append(floor_mat)
def light(name, position, power, size):
    bpy.ops.object.light_add(type="AREA", location=position)
    obj = bpy.context.object
    obj.name = name
    obj.data.energy = power
    obj.data.size = size
    obj.rotation_euler = (Vector((0, 0, 0)) - obj.location).to_track_quat("-Z", "Y").to_euler()
light("Softbox", (-3, 4, 6), 550, 5)
light("Fill", (4, -1, 3), 180, 4)
bpy.ops.object.camera_add(location=(0, 0, 9.5))
camera = bpy.context.object
camera.data.type = "ORTHO"
camera.data.ortho_scale = 5.65
bpy.context.scene.camera = camera
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 48
scene.render.resolution_x = 1100
scene.render.resolution_y = 1300
scene.render.filepath = str(OUT / "soundboard-remodeled-op1-preview.png")
scene.view_settings.view_transform = "AgX"
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "soundboard-remodeled-op1.blend"))
bpy.ops.render.render(write_still=True)
