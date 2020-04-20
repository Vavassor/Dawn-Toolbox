# Table of Contents
# S1. Blender info
# S2. File writing utilities
# S3. Blender utilities
# S4. Dawn types
# S5. Dawn scene file
# S6. Blender Addon

# S1. Blender info ************************************************************

import bpy
import math
import struct
from bpy_extras.io_utils import ExportHelper
from bpy.types import Operator
from enum import IntEnum
from mathutils import Vector, Quaternion
from typing import Iterable, List, Union

BpyContext = bpy.types.Context
BpyMesh = bpy.types.Mesh
BpyMeshLoopColorLayer = bpy.types.MeshLoopColorLayer
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

# S2. File writing utilities **************************************************


def pack_float_array(values: Iterable[float]) -> bytes:
    float_list = [struct.pack("<f", value) for value in values]
    return b"".join(float_list)


def pack_int_array(
        values: Iterable[int],
        bytes_per_value: int, signed: bool) -> bytes:
    int_list = [
        value.to_bytes(
            bytes_per_value, byteorder="little", signed=signed)
        for value in values]
    return b"".join(int_list)


def pack_uint8_norm_array(values: Iterable[float]) -> bytes:
    int_list = [math.floor(255 * value).to_bytes(
        1, byteorder="little", signed=False)
        for value in values]
    return b"".join(int_list)


def write_float32_array(content: bytearray, values: Iterable[float]):
    content.extend(pack_float_array(values))


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

# S3. Blender utilities *******************************************************


def filter_by_type(objects: List[BpyObject], type):
    return [obj for obj in objects if obj.type == type]


def get_all_children_by_parent(objects: List[BpyObject]) -> dict:
    children_by_parent = dict()
    for obj in objects:
        parent = obj.parent
        children = children_by_parent[parent] if (
            parent in children_by_parent) else []
        children.append(obj)
        children_by_parent[parent] = children
    return children_by_parent


def get_quaternion_values(quaternion: Quaternion) -> List[float]:
    return [quaternion.w, quaternion.x, quaternion.y, quaternion.z]


def get_indices(bpy_mesh: BpyMesh) -> List[float]:
    indices: List[float] = []
    for polygon in bpy_mesh.polygons:
        loop_indices = [loop_index for loop_index in polygon.loop_indices]
        indices.extend(loop_indices)
    return indices


def pack_mesh_loop_color_layer(layer: BpyMeshLoopColorLayer) -> bytes:
    interleaved_colors: List[float] = []
    for loop_color in layer.data:
        interleaved_colors.extend(loop_color.color)
    return pack_uint8_norm_array(interleaved_colors)


def triangulate_mesh(obj: BpyObject):
    import bmesh
    mesh = obj.data
    b = bmesh.new()
    b.from_mesh(mesh)
    bmesh.ops.triangulate(
        b, faces=b.faces[:],
        quad_method="BEAUTY", ngon_method="BEAUTY")
    bmesh.ops.recalc_face_normals(b, faces=b.faces)
    b.to_mesh(mesh)
    b.free()

# S4. Dawn types **************************************************************


class ComponentType(IntEnum):
    INVALID = 0
    FLOAT32 = 1
    INT8 = 2
    INT16 = 3
    INT32 = 4
    UINT8 = 5
    UINT16 = 6
    UINT32 = 7

    def get_size_in_bytes(self) -> int:
        if self.value == ComponentType.INVALID:
            return 0
        elif self.value == ComponentType.FLOAT32:
            return 4
        elif self.value == ComponentType.INT8:
            return 1
        elif self.value == ComponentType.INT16:
            return 2
        elif self.value == ComponentType.INT32:
            return 4
        elif self.value == ComponentType.UINT8:
            return 1
        elif self.value == ComponentType.UINT16:
            return 2
        elif self.value == ComponentType.UINT32:
            return 4
        else:
            return 0

    def is_integer(self) -> bool:
        if self.value == ComponentType.INVALID:
            return False
        elif self.value == ComponentType.FLOAT32:
            return False
        elif self.value == ComponentType.INT8:
            return True
        elif self.value == ComponentType.INT16:
            return True
        elif self.value == ComponentType.INT32:
            return True
        elif self.value == ComponentType.UINT8:
            return True
        elif self.value == ComponentType.UINT16:
            return True
        elif self.value == ComponentType.UINT32:
            return True
        else:
            return False

    def is_signed(self) -> bool:
        if self.value == ComponentType.INVALID:
            return False
        elif self.value == ComponentType.FLOAT32:
            return True
        elif self.value == ComponentType.INT8:
            return True
        elif self.value == ComponentType.INT16:
            return True
        elif self.value == ComponentType.INT32:
            return True
        elif self.value == ComponentType.UINT8:
            return False
        elif self.value == ComponentType.UINT16:
            return False
        elif self.value == ComponentType.UINT32:
            return False
        else:
            return False


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
    COLOR = 1
    NORMAL = 2
    POSITION = 3
    TEXCOORD = 4


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
    def __init__(self, obj: Object, transform: Transform):
        self.children = []
        self.object = obj
        self.transform = transform

    def set_children(self, children: List["TransformNode"]):
        self.children = children


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


def pack_components(values: list, bytes_per_component: int,
                    component_type: ComponentType):
    if component_type.is_integer():
        return pack_int_array(
            values, bytes_per_component, component_type.is_signed())
    else:
        return pack_float_array(values)


def add_accessor(scene: Scene, values: list, component_count: int,
                 component_type: ComponentType) -> Accessor:
    bytes_per_component = component_type.get_size_in_bytes()
    byte_stride = bytes_per_component * component_count
    content = pack_components(values, bytes_per_component, component_type)
    scene.add_buffer(content)
    accessor = Accessor(buffer=content, byte_count=len(content),
                        byte_index=0, byte_stride=byte_stride,
                        component_count=component_count,
                        component_type=component_type)
    scene.add_accessor(accessor)
    return accessor


def add_vertex_layout(
        scene: Scene, bpy_mesh: BpyMesh, indices: List[int]) -> VertexLayout:
    positions: List[float] = []
    normals: List[float] = []
    for index in indices:
        loop = bpy_mesh.loops[index]
        vertex = bpy_mesh.vertices[loop.vertex_index]
        positions.extend(vertex.co)
        normals.extend(loop.normal)
    position_accessor = add_accessor(
        scene, positions, 3, ComponentType.FLOAT32)
    normal_accessor = add_accessor(scene, normals, 3, ComponentType.FLOAT32)
    attributes: List[VertexAttribute] = [
        VertexAttribute(position_accessor, VertexAttributeType.POSITION),
        VertexAttribute(normal_accessor, VertexAttributeType.NORMAL)
    ]
    if bpy_mesh.vertex_colors.active is not None:
        active_vertex_color_layer = bpy_mesh.vertex_colors.active
        vertex_colors = pack_mesh_loop_color_layer(active_vertex_color_layer)
        color_accessor = add_accessor(
            scene, vertex_colors, 4, ComponentType.UINT8)
        attributes.append(VertexAttribute(
            color_accessor, VertexAttributeType.COLOR))
    vertex_layout = VertexLayout(attributes)
    scene.add_vertex_layout(vertex_layout)
    return vertex_layout


def add_mesh(scene: Scene, obj: BpyObject) -> Mesh:
    triangulate_mesh(obj)
    bpy_mesh: BpyMesh = obj.data
    bpy_mesh.calc_normals_split()
    indices = get_indices(bpy_mesh)
    index_accessor = add_accessor(
        scene=scene, values=indices, component_count=1,
        component_type=ComponentType.UINT16)
    vertex_layout = add_vertex_layout(scene, bpy_mesh, indices)
    mesh = Mesh(index_accessor, vertex_layout)
    scene.add_mesh(mesh)
    return mesh


def add_object(scene: Scene, obj: BpyObject) -> Object:
    mesh = add_mesh(scene, obj)
    new_object = Object(mesh, ObjectType.MESH)
    scene.add_object(new_object)
    return new_object


def add_transform_nodes(scene: Scene, objects: List[BpyObject]):
    transform_nodes_by_object = dict()
    bpy_objects_by_object = dict()
    for obj in objects:
        content = add_object(scene, obj)
        bpy_objects_by_object[content] = obj
        transform_node = TransformNode(
            obj=content, transform=get_transform(obj))
        transform_nodes_by_object[obj] = transform_node
        scene.add_transform_node(transform_node)
    children_by_parent = get_all_children_by_parent(objects)
    for transform_node in scene.transform_nodes:
        parent = bpy_objects_by_object[transform_node.object]
        child_objects = children_by_parent.get(parent, [])
        children = [transform_nodes_by_object[child]
                    for child in child_objects]
        transform_node.set_children(children)


def get_accessor_chunk(scene: Scene) -> bytearray:
    chunk = bytearray()
    accessors = scene.accessors
    for accessor in accessors:
        write_uint32(chunk, accessor.byte_count)
        write_uint32(chunk, accessor.byte_index)
        write_uint16(chunk, accessor.byte_stride)
        write_uint16(chunk, scene.buffers.index(accessor.buffer))
        write_uint8(chunk, accessor.component_count)
        write_uint8(chunk, accessor.component_type)
    return chunk


def get_buffer_chunk(scene: Scene) -> bytearray:
    chunk = bytearray()
    buffers: List[bytearray] = scene.buffers
    write_uint16(chunk, len(buffers))
    for buffer in buffers:
        write_uint32(chunk, len(buffer))
        chunk.extend(buffer)
    return chunk


def get_mesh_chunk(scene: Scene) -> bytearray:
    chunk = bytearray()
    meshes: List[Mesh] = scene.meshes
    placeholder_material_index = 0
    for mesh in meshes:
        write_uint16(chunk, scene.accessors.index(mesh.index_accessor))
        write_uint16(chunk, placeholder_material_index)
        write_uint16(chunk, scene.vertex_layouts.index(mesh.vertex_layout))
    return chunk


def get_object_chunk(scene: Scene) -> bytearray:
    chunk = bytearray()
    objects: List[Object] = scene.objects
    for obj in objects:
        write_uint16(chunk, scene.meshes.index(obj.content))
        write_uint8(chunk, obj.type)
    return chunk


def get_transform_node_chunk(scene: Scene) -> bytearray:
    chunk = bytearray()
    transform_nodes: List[TransformNode] = scene.transform_nodes
    write_uint16(chunk, len(transform_nodes))
    for transform_node in transform_nodes:
        transform = transform_node.transform
        write_float32_array(
            chunk, get_quaternion_values(transform.orientation))
        write_float32_array(chunk, transform.position.xyz)
        write_float32_array(chunk, transform.scale.xyz)
        write_uint16(chunk, scene.objects.index(transform_node.object))
        write_uint16(chunk, len(transform_node.children))
        for child in transform_node.children:
            write_uint16(chunk, scene.transform_nodes.index(child))
    return chunk


def get_vertex_layout_chunk(scene: Scene) -> bytearray:
    chunk = bytearray()
    vertex_layouts: List[VertexLayout] = scene.vertex_layouts
    write_uint16(chunk, len(vertex_layouts))
    for vertex_layout in vertex_layouts:
        vertex_attributes = vertex_layout.vertex_attributes
        write_uint16(chunk, len(vertex_attributes))
        for vertex_attribute in vertex_attributes:
            write_uint16(chunk, scene.accessors.index(
                vertex_attribute.accessor))
            write_uint8(chunk, vertex_attribute.type)
    return chunk


def get_file_content(objects: List[BpyObject]) -> bytearray:
    mesh_objects = filter_by_type(objects, "MESH")
    scene = Scene()
    add_transform_nodes(scene, mesh_objects)
    content = bytearray()
    write_chunk(content, "ACCE", get_accessor_chunk(scene))
    write_chunk(content, "MESH", get_mesh_chunk(scene))
    write_chunk(content, "OBJE", get_object_chunk(scene))
    write_chunk(content, "TRAN", get_transform_node_chunk(scene))
    write_chunk(content, "VERT", get_vertex_layout_chunk(scene))
    write_chunk(content, "BUFF", get_buffer_chunk(scene))
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
        if bpy.ops.object.mode_set.poll():
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
