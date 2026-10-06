"""Rebuild the soundboard with geometry imported from the supplied OP-1 GLB."""

import bpy
import math
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / "artifacts"
OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def mat(name, color, metallic=0, roughness=0.55):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Metallic"].default_value = metallic
    p.inputs["Roughness"].default_value = roughness
    return m

shell = mat("Warm silver ABS shell", (0.69, 0.72, 0.70), 0.08, 0.43)
shell_light = mat("Silver face highlights", (0.81, 0.83, 0.81), 0.05, 0.47)
well = mat("Pad socket grey", (0.31, 0.35, 0.34), 0.12, 0.48)
pad_base = mat("Pad square", (0.83, 0.85, 0.83), 0.02, 0.57)
keycap = mat("Porcelain white keycaps", (0.91, 0.93, 0.92), 0.02, 0.39)
screen = mat("Dark navy display", (0.015, 0.028, 0.041), 0.1, 0.28)
screen_blue = mat("Display cyan print", (0.38, 0.62, 0.73), 0, 0.7)
screen_dim = mat("Display grey print", (0.55, 0.58, 0.57), 0, 0.7)
red = mat("Display red mark", (0.90, 0.22, 0.13), 0, 0.6)
ink = mat("Keycap charcoal print", (0.25, 0.28, 0.28), 0, 0.8)
secondary = mat("Keycap grey print", (0.48, 0.51, 0.50), 0, 0.8)
holes = mat("Speaker perforations", (0.09, 0.11, 0.11), 0, 0.8)

def cube(name, loc, scale, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        b = o.modifiers.new("Soft molded edge", "BEVEL")
        b.width = bevel
        b.segments = 4
        o.modifiers.new("Weighted surface normals", "WEIGHTED_NORMAL")
    o.data.materials.append(material)
    return o

def cyl(name, loc, radius, depth, material, vertices=64, bevel=0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(material)
    if bevel:
        b = o.modifiers.new("Rounded rim", "BEVEL")
        b.width = bevel
        b.segments = 4
        o.modifiers.new("Weighted surface normals", "WEIGHTED_NORMAL")
    for polygon in o.data.polygons:
        polygon.use_smooth = True
    return o

def text(name, body, loc, size, material, align="CENTER", rotation=0):
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = body
    curve.size = size
    curve.align_x = align
    curve.align_y = "CENTER"
    curve.extrude = 0.0005
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler[2] = rotation
    obj.data.materials.append(material)
    return obj

# Dimensions follow the browser proportions: 3.9 wide by 4.55 tall.
cube("SB-1 main molded enclosure", (0, 0, 0), (3.9, 4.55, 0.27), shell, 0.12)
cube("Inset front face", (-0.02, 0.01, 0.139), (3.77, 4.42, 0.018), shell_light, 0.065)

# Speaker and instrument display share the upper row.
cube("Speaker recess", (-1.49, 1.76, 0.157), (0.69, 0.65, 0.018), pad_base, 0.025)
for i in range(-6, 7):
    for j in range(-6, 7):
        if i*i + j*j <= 38:
            cyl(f"Speaker hole {i},{j}", (-1.49 + i*0.043, 1.76 + j*0.043, 0.168), 0.015, 0.003, holes, 12)

cube("Display black glass", (0.11, 1.76, 0.166), (2.47, 0.66, 0.027), screen, 0.014)
for y in (1.94, 1.48):
    cube("Display hairline", (0.10, y, 0.182), (2.32, 0.006, 0.002), screen_blue)
text("Display title", "HARDER · BETTER", (-1.02, 2.015, 0.187), 0.08, screen_blue, "LEFT")
text("Display loop label", "16 VOICES — 1 LOOP", (0.35, 2.015, 0.187), 0.07, screen_dim)
text("Display signature", "SAM", (1.19, 2.015, 0.187), 0.08, red)
text("Display status", "READY TO PLAY", (-1.02, 1.72, 0.187), 0.10, screen_blue, "LEFT")
cube("Waveform trace", (0.83, 1.71, 0.188), (0.76, 0.007, 0.002), screen_blue)
text("Instrumental status", "INSTRUMENTAL OFF", (-1.02, 1.53, 0.187), 0.07, screen_blue, "LEFT")
text("Pad range", "01 — 16", (1.21, 1.53, 0.187), 0.07, screen_blue, "RIGHT")

# Vertical slide switch to the right of the display.
cube("Switch channel", (1.68, 1.79, 0.164), (0.14, 0.52, 0.025), well, 0.065)
cube("Switch inner rail", (1.68, 1.79, 0.184), (0.095, 0.43, 0.017), shell_light, 0.045)
cyl("White slide thumb", (1.68, 1.67, 0.214), 0.087, 0.055, keycap, bevel=0.024)
text("Music switch legend", "MUSIC", (1.68, 1.43, 0.182), 0.053, ink)

labels = ["WORK IT", "MAKE IT", "DO IT", "MAKES US", "HARDER", "BETTER", "FASTER", "STRONGER", "MORE THAN", "HOUR", "OUR", "NEVER", "EVER", "AFTER", "WORK IS", "OVER"]
step = 0.842
left = -1.49
top = 1.00
for n, label in enumerate(labels):
    col, row = n % 4, n // 4
    x, y = left + col*step, top - row*step
    cube(f"Pad {n+1} dark socket", (x, y, 0.154), (0.83, 0.83, 0.016), well, 0.025)
    cube(f"Pad {n+1} square face", (x, y, 0.172), (0.817, 0.817, 0.027), pad_base, 0.021)
    cyl(f"Keycap {n+1}", (x, y, 0.206), 0.326, 0.067, keycap, bevel=0.03)
    text(f"Keycap {n+1} number", str(n+1), (x, y+0.025, 0.243), 0.23, ink)
    text(f"Keycap {n+1} word", label, (x, y-0.145, 0.243), 0.063 if len(label)<9 else 0.052, secondary)

text("Model marking", "SB-1", (1.71, -1.73, 0.175), 0.16, ink, rotation=-math.pi/2)
text("Field marking", "field", (1.73, -2.05, 0.175), 0.06, ink, rotation=-math.pi/2)

# Keep the OP-1 mesh data and materials, but fit each separate component to the
# SB-1 layout. The imported model is only a source library, not a squashed body.
bpy.ops.import_scene.gltf(filepath="/Users/trungvo/Downloads/source/OP1.glb")
source_objects = list(bpy.context.selected_objects)
source = {obj.name: obj for obj in source_objects}
bpy.context.view_layer.update()
op1_chassis = bpy.data.materials["Grey_metal"]
for name in ("SB-1 main molded enclosure", "Inset front face"):
    bpy.data.objects[name].data.materials.clear()
    bpy.data.objects[name].data.materials.append(op1_chassis)

def fitted_mesh(obj, name, center, size):
    points = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    minimum = Vector(tuple(min(v[i] for v in points) for i in range(3)))
    maximum = Vector(tuple(max(v[i] for v in points) for i in range(3)))
    middle = (minimum + maximum) / 2
    original_size = maximum - minimum
    mesh = obj.data.copy()
    result = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(result)
    for vertex, point in zip(mesh.vertices, points):
        vertex.co = Vector(center) + Vector(tuple((point[i] - middle[i]) * size[i] / max(original_size[i], 0.001) for i in range(3)))
    return result

for obj in bpy.data.objects:
    if obj.name.startswith("Speaker hole") or obj.name in {"Speaker recess", "Display black glass"}:
        bpy.data.objects.remove(obj, do_unlink=True)

fitted_mesh(source["Cube.004"], "OP-1 perforated speaker reused", (-1.49, 1.76, 0.173), (0.69, 0.65, 0.055))
fitted_mesh(source["Cube.013"], "OP-1 LCD housing reused", (0.11, 1.76, 0.165), (2.47, 0.66, 0.025))
for n in range(16):
    x, y = left + (n % 4)*step, top - (n // 4)*step
    fitted_mesh(source["Cylinder.018"], f"OP-1 circular rim {n+1:02}", (x, y, 0.199), (0.69, 0.69, 0.07))

for obj in source_objects:
    bpy.data.objects.remove(obj, do_unlink=True)

# Studio setup: soft shadows and a near-front orthographic product view.
floor = mat("Warm studio floor", (0.95, 0.95, 0.94), 0, 0.83)
cube("Backdrop", (0, 0, -0.21), (200, 200, 0.05), floor)
world = bpy.context.scene.world
world.color = (0.4, 0.4, 0.4)
def area(name, loc, power, size):
    bpy.ops.object.light_add(type="AREA", location=loc)
    light = bpy.context.object
    light.name = name
    light.data.energy = power
    light.data.shape = "DISK"
    light.data.size = size
    light.rotation_euler = (Vector((0, 0, 0)) - light.location).to_track_quat("-Z", "Y").to_euler()
area("Large upper-left softbox", (-3, 4, 6), 450, 5)
area("Right edge fill", (4, -1, 3), 180, 4)
bpy.ops.object.camera_add(location=(0, 0, 9.5))
camera = bpy.context.object
camera.name = "Product camera"
camera.rotation_euler = (0, 0, 0)
camera.data.type = "ORTHO"
camera.data.ortho_scale = 5.65
bpy.context.scene.camera = camera
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 48
scene.render.resolution_x = 1100
scene.render.resolution_y = 1300
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUT / "soundboard-op1-preview.png")
scene.view_settings.view_transform = "AgX"
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "soundboard-op1.blend"))
bpy.ops.render.render(write_still=True)
