precision mediump float;

const float PI = 3.1415926535;

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

// The GGX/Towbridge-Reitz normal distribution function.
// This uses Disney's reparametrization of alpha = roughness^2.
float get_specular_distribution(vec3 surface_normal, vec3 half_vector, float roughness)
{
    vec3 n = surface_normal;
    vec3 h = half_vector;
    float a = roughness * roughness;
    float n_dot_h = clamp(dot(n, h), 0.0, 1.0);
    float a2 = a * a;
    float f = (n_dot_h * a2 - n_dot_h) * n_dot_h + 1.0;
    return a2 / (PI * f * f);
}

float get_partial_geometry_term(float cos_theta, float roughness)
{
    float r = roughness + 1.0;
    float k = (r * r) / 8.0;
    return cos_theta / (cos_theta * (1.0 - k) + k);
}

// The Schlick-GGX approximation of the geometric attenuation function using Smith's method.
float get_geometric_shadowing(float n_dot_v, float n_dot_l, float roughness)
{
    float ggxv = get_partial_geometry_term(n_dot_v, roughness);
    float ggxl = get_partial_geometry_term(n_dot_l, roughness);
    return ggxl * ggxv;
}

// This uses the Fresnel-Schlick appoximation.
// f0 - the surface reflectance at normal incidence (also called zero angle)
vec3 get_reflectance(float cos_theta, vec3 f0)
{
    float f = pow(1.0 - cos_theta, 5.0);
    return f0 * (1.0 - f) + f;
}

vec3 get_direct_lighting(vec3 surface_normal, vec3 view_direction, vec3 f0, vec3 albedo, float roughness, float metallic, vec3 light_direction, vec3 radiance)
{
    vec3 l = light_direction;
    vec3 n = surface_normal;
    vec3 v = view_direction;
    // h is the half vector.
    vec3 h = normalize(view_direction + light_direction);
    
    float n_dot_l = clamp(dot(n, l), 0.0, 1.0);
    float n_dot_v = abs(dot(n, v)) + 1e-5;
    float h_dot_v = clamp(dot(h, v), 0.0, 1.0);

    float ndf = get_specular_distribution(n, h, roughness);
    float g = get_geometric_shadowing(n_dot_v, n_dot_l, roughness);
    vec3 f = get_reflectance(h_dot_v, f0);
    
    vec3 specular = (ndf * g * f) / max(4.0 * n_dot_v * n_dot_l, 1e-4);

    // ks is the specular reflectance.
    // kd is the diffuse reflectance.
    vec3 ks = f;
    vec3 kd = vec3(1.0) - ks;
    kd *= 1.0 - metallic;
    vec3 diffuse = kd * albedo / PI;

    return (diffuse + specular) * radiance * n_dot_l;
}

vec3 get_directional_light(vec3 surface_normal, vec3 view_direction, vec3 f0, vec3 albedo, float roughness, float metallic, DirectionalLight light)
{
    return get_direct_lighting(surface_normal, view_direction, f0, albedo, roughness, metallic, -light.direction, light.radiance);
}

vec3 get_point_light(vec3 surface_normal, vec3 surface_position, vec3 view_direction, vec3 f0, vec3 albedo, float roughness, float metallic, PointLight light)
{
    vec3 light_direction = normalize(light.position - surface_position);
    float distance = length(light.position - surface_position);
    float attenuation = 1.0 / (distance * distance);
    vec3 radiance = attenuation * light.radiance;
    return get_direct_lighting(surface_normal, view_direction, f0, albedo, roughness, metallic, light_direction, radiance);
}

vec3 linear_to_srgb(vec3 color)
{
    return pow(color, vec3(1.0 / 2.2));
}

vec3 srgb_to_linear(vec3 color)
{
    return pow(color, vec3(2.2));
}

// This uses the Reinhard operator.
vec3 tone_map(vec3 color)
{
    return color / (color + vec3(1.0));
}

const float metallic = 0.4;
const float roughness = 0.7;

uniform DirectionalLight directional_light;
uniform PointLight point_light;
uniform vec3 view_position;

varying vec4 surface_color;
varying vec3 surface_normal;
varying vec3 surface_position;

void main()
{
    vec3 albedo = srgb_to_linear(surface_color.xyz);
    vec3 view_direction = normalize(view_position - surface_position);
    vec3 unit_normal = normalize(surface_normal);

    // f0 is the surface reflectance at normal incidence (also called zero angle).
    vec3 f0 = vec3(0.04);
    f0 = mix(f0, albedo, metallic);

    vec3 direct_lighting = vec3(0.0);
    direct_lighting += get_directional_light(unit_normal, view_direction, f0, albedo, roughness, metallic, directional_light);
    direct_lighting += get_point_light(unit_normal, surface_position, view_direction, f0, albedo, roughness, metallic, point_light);

    vec3 output_color = linear_to_srgb(tone_map(direct_lighting));

    gl_FragColor = vec4(output_color, surface_color.w);
}
