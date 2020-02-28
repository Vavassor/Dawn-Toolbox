precision mediump float;

varying vec4 surface_color;
varying vec3 surface_normal;

void main()
{
    vec4 normal_color = vec4(0.5 * surface_normal + 0.5, 1);
    gl_FragColor = surface_color * normal_color;
}
