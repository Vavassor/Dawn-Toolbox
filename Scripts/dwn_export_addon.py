# Table of Contents
# S1. Blender info
# S2. Dawn scene file
# S3. Blender Addon

# S1. Blender info ************************************************************

import bpy
from bpy_extras.io_utils import ExportHelper
from bpy.types import Operator
from enum import IntEnum

bl_info = {
    "author": "Andrew Dawson <dawso.andrew@gmail.com>",
    "blender": (2, 80, 0),
    "category": "Import-Export",
    "description": "Export .dwn files.",
    "location": "File > Export > DWN",
    "name": "Dawn Toolbox Scene Exporter",
    "version": (1, 0, 0),
}

# S2. Dawn scene file *********************************************************

file_header_tag = "DWNSCENE"
file_version = 1


class Accessor:
    def __init__(self, buffer, byte_count, byte_index, byte_stride,
                 component_count, component_type):
        self.buffer = buffer
        self.byte_count = byte_count
        self.byte_index = byte_index
        self.byte_stride = byte_stride
        self.component_count = component_count
        self.component_type = component_type


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


class Object:
    def __init__(self, content, type):
        self.content = content
        self.type = type


class Mesh:
    def __init__(self, index_accessor, vertex_layout):
        self.index_accessor = index_accessor
        self.vertex_layout = vertex_layout


class Transform:
    def __init__(self, orientation, position, scale):
        self.orientation = orientation
        self.position = position
        self.scale = scale


class TransformNode:
    def __init__(self, children, obj, transform):
        self.children = children
        self.object = obj
        self.transform = transform


class VertexAttribute:
    def __init__(self, accessor, type):
        self.accessor = accessor
        self.type = type


class VertexAttributeType(IntEnum):
    INVALID = 0
    NORMAL = 1
    POSITION = 2
    TEXCOORD = 3


class VertexLayout:
    def __init__(self, vertex_attributes):
        self.vertex_attributes = vertex_attributes


def get_accessor_chunk(accessors):
    chunk = bytearray()
    chunk.append(0xef)
    return chunk


def get_file_content(objects):
    content = bytearray()
    write_chunk(content, "ACCE", get_accessor_chunk(objects))
    return content


def get_file_header(content):
    file_header = bytearray()
    write_string(file_header, file_header_tag)
    write_uint32(file_header, file_version)
    write_uint32(file_header, len(content))
    return file_header


def write_chunk(content, tag, chunk):
    write_string(content, tag)
    write_uint32(content, len(chunk))
    content.extend(chunk)


def write_string(content, value):
    value_bytes = value.encode("utf-8")
    content.extend(value_bytes)


def write_uint16(content, value):
    uint16_value = value.to_bytes(2, byteorder="little", signed=False)
    content.extend(uint16_value)


def write_uint32(content, value):
    uint32_value = value.to_bytes(4, byteorder="little", signed=False)
    content.extend(uint32_value)


def write_uint8(content, value):
    uint8_value = value.to_bytes(1, byteorder="little", signed=False)
    content.extend(uint8_value)


def save_dwn(objects, filepath):
    content = get_file_content(objects)
    file_header = get_file_header(content)
    with open(filepath, "wb") as file:
        file.write(file_header)
        file.write(content)


# S3. Blender Addon ***********************************************************

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

    def execute(self, context):
        if context.active_object.mode == "EDIT":
            bpy.ops.object.mode_set(mode="OBJECT")
        objects = (context.selected_objects
                   if self.should_export_selected_only else
                   context.scene.objects)
        save_dwn(objects, self.filepath)
        return {"FINISHED"}


def export_menu_item_func(self, context):
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
