attribute vec4 vertex_color;
attribute vec3 vertex_position;

uniform mat4 model_view_projection;

varying vec4 surface_color;

void main()
{
    gl_Position = model_view_projection * vec4(vertex_position, 1.0);
    surface_color = vertex_color;
}
