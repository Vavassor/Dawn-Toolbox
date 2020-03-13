# Table of Contents
# S1. Blender info
# S2. Blender utilities
# S3. File writing utilities
# S4. Dawn types
# S5. Dawn scene file
# S6. Blender Addon

# S1. Blender info ************************************************************

import bmesh
import bpy
from bpy_extras.io_utils import ExportHelper
from bpy.types import Operator
from enum import IntEnum
from mathutils import Vector, Quaternion
from typing import List, Union

BpyContext = bpy.types.Context
BpyMesh = bpy.types.Mesh
BpyObject = bpy.types.Object

bl_info = {
    "author": "Andrew Dawson <dawso.andrew@gmail.com>",
    "blender": (2, 80, 0),
    "category": "Import-Export",
    "description": "Export .dwn files.",
    "location": "File > Export > DWN",
    "name": "Dawn Toolbox Scene Exporter",
    "version": (1, 0, 0),
}

file_header_tag = "DWNSCENE"
file_version = 1

# S2. Blender utilities *******************************************************


def get_all_children_by_parent(objects: List[BpyObject]) -> dict:
    children_by_parent = dict()
    for obj in objects:
        parent = obj.parent
        children = children_by_parent[parent] if (
            parent in children_by_parent) else []
        children.append(obj)
        children_by_parent[parent] = children
    return children_by_parent


def filter_by_type(objects: List[BpyObject], type):
    return [obj for obj in objects if obj.type == type]


def triangulate_mesh(obj: BpyObject):
    mesh = obj.data
    b = bmesh.new()
    b.from_mesh(mesh)
    bmesh.ops.triangulate(b, faces=b.faces[:], quad_method=0, ngon_method=0)
    b.to_mesh(mesh)
    b.free()

# S3. File writing utilities **************************************************


def write_string(content: bytearray, value: str):
    value_bytes = value.encode("utf-8")
    content.extend(value_bytes)


def write_uint16(content: bytearray, value: int):
    uint16_value = value.to_bytes(2, byteorder="little", signed=False)
    content.extend(uint16_value)


def write_uint32(content: bytearray, value: int):
    uint32_value = value.to_bytes(4, byteorder="little", signed=False)
    content.extend(uint32_value)


def write_uint8(content: bytearray, value: int):
    uint8_value = value.to_bytes(1, byteorder="little", signed=False)
    content.extend(uint8_value)

# S4. Dawn types **************************************************************


class ComponentType(IntEnum):
    INVALID = 0
    FLOAT1 = 1
    FLOAT2 = 2
    FLOAT3 = 3
    FLOAT4 = 4
    INT8 = 5
    INT16 = 6
    INT32 = 7
    UINT8 = 8
    UINT16 = 9
    UINT32 = 10


class Accessor:
    def __init__(self, buffer: bytearray, byte_count: int, byte_index: int,
                 byte_stride: int, component_count: int,
                 component_type: ComponentType):
        self.buffer = buffer
        self.byte_count = byte_count
        self.byte_index = byte_index
        self.byte_stride = byte_stride
        self.component_count = component_count
        self.component_type = component_type


class VertexAttributeType(IntEnum):
    INVALID = 0
    NORMAL = 1
    POSITION = 2
    TEXCOORD = 3


class VertexAttribute:
    def __init__(self, accessor: Accessor, type: VertexAttributeType):
        self.accessor = accessor
        self.type = type


class VertexLayout:
    def __init__(self, vertex_attributes: List[VertexAttribute]):
        self.vertex_attributes = vertex_attributes


class Mesh:
    def __init__(self, index_accessor: Accessor, vertex_layout: VertexLayout):
        self.index_accessor = index_accessor
        self.vertex_layout = vertex_layout


class ObjectType(IntEnum):
    INVALID = 0
    MESH = 1


class Object:
    def __init__(self, content: Union[Mesh], type: ObjectType):
        self.content = content
        self.type = type


class Transform:
    def __init__(self, orientation: Quaternion, position: Vector,
                 scale: Vector):
        self.orientation = orientation
        self.position = position
        self.scale = scale


class TransformNode:
    def __init__(self, children: List[Object],
                 obj: Object, transform: Transform):
        self.children = children
        self.object = obj
        self.transform = transform


class Scene:
    def __init__(self):
        self.accessors = []
        self.buffers = []
        self.meshes = []
        self.objects = []
        self.transform_nodes = []
        self.vertex_layouts = []

    def add_accessor(self, accessor: Accessor):
        self.accessors.append(accessor)

    def add_buffer(self, buffer: bytearray):
        self.buffers.append(buffer)

    def add_mesh(self, mesh: Mesh):
        self.meshes.append(mesh)

    def add_object(self, obj: Object):
        self.objects.append(obj)

    def add_transform_node(self, transform_node: TransformNode):
        self.transform_nodes.append(transform_node)

    def add_vertex_layout(self, vertex_layout: VertexLayout):
        self.vertex_layouts.append(vertex_layout)


# S5. Dawn scene file *********************************************************


def get_transform(obj: BpyObject) -> Transform:
    return Transform(
        orientation=obj.matrix_basis.to_quaternion(),
        position=obj.matrix_basis.to_translation(),
        scale=obj.matrix_basis.to_scale())


def add_mesh(scene: Scene, obj: BpyObject) -> Mesh:
    triangulate_mesh(obj)
    bpy_mesh: BpyMesh = obj.data
    indicies = []
    for polygon in bpy_mesh.polygons:
        indicies.extend(polygon.vertices)
    # mesh = Mesh(index_accessor, vertex_layout)
    # return mesh
    return None


def add_object(scene: Scene, obj: BpyObject) -> Object:
    mesh = add_mesh(scene, obj)
    new_object = Object(mesh, ObjectType.MESH)
    scene.add_object(new_object)
    return new_object


def add_transform_nodes(scene: Scene, objects: List[BpyObject]):
    children_by_parent = get_all_children_by_parent(objects)
    for obj in objects:
        content = add_object(scene, obj)
        transform_node = TransformNode(
            children=children_by_parent[obj],
            obj=content,
            transform=get_transform(obj))
        scene.add_transform_node(transform_node)


def get_accessor_chunk(accessors: List[Accessor]) -> bytearray:
    chunk = bytearray()
    chunk.append(0xef)
    return chunk


def get_file_content(objects: List[BpyObject]) -> bytearray:
    mesh_objects = filter_by_type(objects, "MESH")
    scene = Scene()
    add_transform_nodes(scene, mesh_objects)
    content = bytearray()
    write_chunk(content, "ACCE", get_accessor_chunk(scene.accessors))
    return content


def get_file_header(content: bytearray) -> bytearray:
    file_header = bytearray()
    write_string(file_header, file_header_tag)
    write_uint32(file_header, file_version)
    write_uint32(file_header, len(content))
    return file_header


def write_chunk(content: bytearray, tag: str, chunk: bytearray):
    write_string(content, tag)
    write_uint32(content, len(chunk))
    content.extend(chunk)


def save_dwn(objects: List[BpyObject], filepath: str):
    content = get_file_content(objects)
    file_header = get_file_header(content)
    with open(filepath, "wb") as file:
        file.write(file_header)
        file.write(content)


# S6. Blender Addon ***********************************************************


class OBJECT_OT_export_dwn(Operator, ExportHelper):
    """.dwn file export addon"""
    bl_idname = "object.export_dwn"
    bl_label = "Dawn Toolbox Export"
    bl_options = {"REGISTER", "UNDO"}

    filename_ext = ".dwn"
    filter_glob: bpy.props.StringProperty(
        default="*.dwn", options={"HIDDEN"}, maxlen=255)
    should_export_selected_only: bpy.props.BoolProperty(
        name="Selected only", description="Export selected mesh items only",
        default=True)

    def execute(self, context: BpyContext):
        if context.active_object.mode == "EDIT":
            bpy.ops.object.mode_set(mode="OBJECT")
        objects = (context.selected_objects
                   if self.should_export_selected_only else
                   context.scene.objects)
        save_dwn(objects, self.filepath)
        return {"FINISHED"}


def export_menu_item_func(self, context: BpyContext):
    self.layout.operator(OBJECT_OT_export_dwn.bl_idname,
                         text="Dawn Toolbox Export (.dwn)")


def register():
    bpy.utils.register_class(OBJECT_OT_export_dwn)
    bpy.types.TOPBAR_MT_file_export.append(export_menu_item_func)


def unregister():
    bpy.utils.unregister_class(OBJECT_OT_export_dwn)
    bpy.types.TOPBAR_MT_file_export.remove(export_menu_item_func)


if __name__ == "__main__":
    register()
