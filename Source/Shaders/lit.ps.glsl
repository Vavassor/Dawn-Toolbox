precision mediump float;

float lambert(vec3 normal, vec3 light_direction)
{
    return max(dot(normal, light_direction), 0.0);
}

const int light_count = 1;
const vec3 light_radiance = vec3(1.0, 1.0, 1.0);

uniform vec3 light_direction;

varying vec4 surface_color;
varying vec3 surface_normal;

void main()
{
    vec3 material_color = surface_color.xyz;

    vec3 direct_lighting = vec3(0.0);
    for (int i = 0; i < light_count; i++)
    {
        direct_lighting += lambert(surface_normal, light_direction) * material_color * light_radiance;
    }

    gl_FragColor = vec4(direct_lighting, surface_color.w);
}
