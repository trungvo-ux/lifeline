import bpy
from mathutils import Vector

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath="/Users/trungvo/Downloads/source/OP1.glb")
bpy.context.view_layer.update()
for obj in list(bpy.context.scene.objects)[:45]:
    if obj.type == "MESH":
        print("PART", obj.name, "loc", tuple(round(v, 3) for v in obj.location), "dim", tuple(round(v, 3) for v in obj.dimensions), "materials", [m.name if m else None for m in obj.data.materials])
verts = [obj.matrix_world @ Vector(corner) for obj in bpy.context.scene.objects if obj.type == "MESH" for corner in obj.bound_box]
print("BOUNDS", tuple(round(min(v[i] for v in verts), 3) for i in range(3)), tuple(round(max(v[i] for v in verts), 3) for i in range(3)))
for obj in bpy.context.scene.objects:
    if obj.type != "MESH":
        continue
    pts = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    mn = [min(v[i] for v in pts) for i in range(3)]
    mx = [max(v[i] for v in pts) for i in range(3)]
    print("BOX", obj.name, *[round(v, 2) for v in mn], *[round(v, 2) for v in mx])
bpy.ops.object.camera_add(location=(0, 0, 40))
camera = bpy.context.object
camera.data.type = "ORTHO"
camera.data.ortho_scale = 30
bpy.context.scene.camera = camera
bpy.ops.object.light_add(type="AREA", location=(-8, 8, 20))
bpy.context.object.data.energy = 3000
bpy.context.object.data.size = 15
bpy.context.scene.render.engine = "CYCLES"
bpy.context.scene.cycles.samples = 24
bpy.context.scene.render.resolution_x = 1300
bpy.context.scene.render.resolution_y = 700
bpy.context.scene.render.filepath = "/Users/trungvo/Projects/lifeline/artifacts/op1-source-preview.png"
bpy.ops.render.render(write_still=True)
