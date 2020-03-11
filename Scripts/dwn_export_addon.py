import bpy
from bpy_extras.io_utils import ExportHelper
from bpy.types import Operator

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


def write_string(file, value):
    value_bytes = value.encode("utf-8")
    file.write(value_bytes)


def write_uint16(file, value):
    uint16_value = value.to_bytes(2, byteorder="little", signed=False)
    file.write(uint16_value)


def write_uint32(file, value):
    uint32_value = value.to_bytes(4, byteorder="little", signed=False)
    file.write(uint32_value)


def write_uint8(file, value):
    uint8_value = value.to_bytes(1, byteorder="little", signed=False)
    file.write(uint8_value)


def write_file_header(file, byte_count):
    write_string(file, file_header_tag)
    write_uint32(file, file_version)
    write_uint32(file, byte_count)


def save_dwn(objects, filepath):
    with open(filepath, "wb") as file:
        write_file_header(file, 1)
        write_uint8(file, 7)


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
