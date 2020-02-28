attribute vec4 vertex_color;
attribute vec4 vertex_normal;
attribute vec3 vertex_position;

uniform mat4 model_view_projection;

varying vec4 surface_color;
varying vec3 surface_normal;

void main()
{
    gl_Position = model_view_projection * vec4(vertex_position, 1.0);
    surface_color = vertex_color;
    surface_normal = vertex_normal.xyz;
}
