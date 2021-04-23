#version 300 es
precision highp float;

out vec4 outColor;

void main() {
  outColor = vec4(0.73, 0.73, 0.73, 1.0);
  gl_FragDepth = 1.0;
}