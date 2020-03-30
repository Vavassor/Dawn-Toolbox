precision mediump float;

varying vec3 surface_normal;
varying vec3 surface_position;

void main()
{
    vec3 unit_normal = normalize(surface_normal);
    gl_FragColor = vec4(unit_normal, 1.0);
}
