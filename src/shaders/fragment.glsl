precision mediump float;
uniform float uTime;
uniform float uProgress;
uniform vec4 uResolution;
uniform float uDistortionAmount;
uniform sampler2D uTexture;
uniform sampler2D uDisplacement;
uniform vec2 uMouse;  // Mouse position uniform
varying vec2 vUv;

#define PI 3.14159265359

// Simplex 2D noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
  + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
    dot(x12.zw, x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 1.0;
    float freq = 1.0;
    // More octaves = more detail
    for(int i = 0; i < 6; i++) {
        sum += amp * snoise(p * freq);
        freq *= 2.0;
        amp *= 0.5;
    }
    return sum;
}

void main() {
    // Use the resolution scaling variables from uResolution
    vec2 newUV = (vUv - vec2(0.5)) * vec2(uResolution.z, uResolution.w) + vec2(0.5);
    vec2 uv = newUV;
    
    // Time variables for animation
    float t = uTime * 0.02;
    
    // Get displacement data from the displacement texture (this comes from the mouse interactions)
    vec4 displacement = texture2D(uDisplacement, vUv);
    
    // Calculate distance between current pixel and mouse position
    // Convert mouse from [-0.5,0.5] range to [0,1] for UV space comparison
    vec2 mouseUV = uMouse + 0.5;
    float distToMouse = distance(vUv, mouseUV);
    
    // Create a falloff effect based on distance to mouse - reduced intensity
    float mouseInfluence = smoothstep(0.5, 0.0, distToMouse) * 0.; // Reduced from original value
    
    // Apply basic distortion using displacement map
    vec2 distortedUV = uv;
    
    // Apply time-based distortion
    distortedUV += uDistortionAmount * vec2(
        fbm(uv * 0.8 + t),
        fbm(uv * 0.8 + t)
    );
    
    // Enhanced mouse-based distortion
    float theta = displacement.r * 2.0 * PI;
    vec2 direction = vec2(sin(theta), cos(theta));
    
    // Direction from current pixel to mouse position
    vec2 toMouse = normalize(mouseUV - vUv);
    
    // Blend the direction from displacement map with direction to mouse - gentler blend
    vec2 finalDirection = mix(direction, toMouse, mouseInfluence * 0.3); // Reduced from 0.5
    
    // Apply the distortion with enhanced mouse influence - kept at original strength
    float distortStrength = displacement.r + mouseInfluence * 0.2; // Reduced from 0.3
    distortedUV += finalDirection * distortStrength * 0.5;
    
    // Generate organic patterns using the distorted UVs
    float pattern1 = fbm(distortedUV * 1.0 + t * 0.5);
    float pattern2 = fbm(distortedUV * 1.5 - t * 0.3);
    float pattern3 = fbm(distortedUV * 2.0 + t * 0.7);
    
    // Enhance patterns based on displacement and mouse influence - reduced enhancement
    float displacementIntensity = length(displacement.rgb) + mouseInfluence * 0.3; // Reduced from 0.5
    
    // Using original pattern enhancement values from your shader
    pattern1 = mix(pattern1, pattern1 * 1.5, displacementIntensity);
    pattern2 = mix(pattern2, pattern2 * 1.5, displacementIntensity);
    pattern3 = mix(pattern3, pattern3 * 1.5, displacementIntensity);
    
    // Define color palette - kept your original colors
     // Define color palette: blue, orange, red
    vec3 blue = vec3(0.0, 0.3, 0.8);
    vec3 orange = vec3(1.0, 0.5, 0.0);
    vec3 red = vec3(0.9, 0.1, 0.1);
    vec3 darkBlue = vec3(0.0, 0.05, 0.2); // Background color

//     vec3 blue = vec3(0.1, 0.2, 0.6);      // Deep royal blue (Dark Magician)
// vec3 orange = vec3(1.0, 0.7, 0.0);    // Fiery gold (Millennium items)
// vec3 red = vec3(0.8, 0.0, 0.0);       // Crimson (Dark Magician Girl’s accents)
// vec3 darkBlue = vec3(0.05, 0.01, 0.1); // Shadow realm black (background)
    
    // Blend colors based on patterns - using your original thresholds
    vec3 color = darkBlue;
    color = mix(color, blue, smoothstep(-0.6, 0.6, pattern1));
    color = mix(color, orange, smoothstep(-0.2, 0.8, pattern2));
    color = mix(color, red, smoothstep(0.0, 0.9, pattern3));
    
    // Add subtle pulsing effect - kept at original values
    float pulse = 0.5 + 0.5 * sin(uTime * 0.5);
    color = mix(color, color * 1.2, pulse * 0.2);
    
    // Add subtle vignette
    float vignette = 1.0 - smoothstep(0.5, 1.5, length(vUv - 0.5) * 2.0);
    color *= vignette;
    
    // Add mouse highlight effect - reduced intensity significantly
    color = mix(color, color * 0.5, mouseInfluence * 0.05); // Reduced from 1.5 and 0.3
    
    // Progress transition effect
    if (uProgress > 0.0) {
        float progressEffect = smoothstep(uProgress - 0.2, uProgress + 0.2, length(vUv - 0.5));
        color = mix(color, darkBlue, progressEffect);
    }
    
    // Enhance colors based on displacement intensity - reduced significantly
    color = mix(color, color * 1.1, displacementIntensity * 0.1); // Reduced from 1.3 and 0.5
    
    // Final color
    gl_FragColor = vec4(color, 1.0);
}