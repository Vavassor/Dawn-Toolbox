precision mediump float;

struct DirectionalLight
{
    vec3 direction;
    vec3 radiance;
};

struct PointLight
{
    vec3 position;
    vec3 radiance;
};

float lambert(vec3 normal, vec3 light_direction)
{
    return max(dot(normal, light_direction), 0.0);
}

vec3 get_directional_light(vec3 normal, vec3 material_color, DirectionalLight light)
{
    return material_color * light.radiance * lambert(normal, light.direction);
}

vec3 get_point_light(vec3 surface_normal, vec3 surface_position, vec3 material_color, PointLight light)
{
    vec3 light_direction = light.position - surface_position;
    float distance = length(light.position - surface_position);
    float attenuation = 1.0 / (distance * distance);
    return attenuation * light.radiance * material_color;
}

uniform DirectionalLight directional_light;
uniform PointLight point_light;

varying vec4 surface_color;
varying vec3 surface_normal;
varying vec3 surface_position;

void main()
{
    vec3 material_color = surface_color.xyz;

    vec3 direct_lighting = vec3(0.0);
    direct_lighting += get_directional_light(surface_normal, material_color, directional_light);
    direct_lighting += get_point_light(surface_normal, surface_position, material_color, point_light);

    gl_FragColor = vec4(direct_lighting, surface_color.w);
}
