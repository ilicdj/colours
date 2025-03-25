uniform float uProgress;
uniform float uTime;
uniform sampler2D uTexture;
uniform sampler2D uDisplacement;
uniform vec4 uResolution;
varying vec2 vUv;
void main() {
  // Adjust UV based on resolution - OrthographicCamera
  vec2 newUV = (vUv - vec2(0.5)) * uResolution.zw + vec2(0.5);

  vec4 displacement = texture(uDisplacement, vUv);

  float theta = displacement.r * 2.0 * 3.14159265359;

  vec2 direction = vec2(sin(theta), cos(theta));

  vec2 uv = vUv + direction * displacement.r;

  vec4 image = texture2D(uTexture, uv);

  // gl_FragColor = vec4(uProgress,vUv, 1.0);
  gl_FragColor = image;
}