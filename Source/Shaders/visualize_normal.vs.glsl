attribute vec4 vertex_normal;
attribute vec3 vertex_position;

uniform mat4 model;
uniform mat4 model_view_projection;

varying vec3 surface_normal;
varying vec3 surface_position;

void main()
{
    vec4 homogenous_position = vec4(vertex_position, 1.0);
    gl_Position = model_view_projection * homogenous_position;
    surface_normal = vec3(model * vec4(vertex_normal.xyz, 0.0));
    surface_position = vec3(model * homogenous_position);
}
