#version 300 es
in vec2 position;
// out vec2 texcoords; // texcoords are in the normalized [0,1] range for the viewport-filling quad part of the triangle

void main() {
  gl_Position = vec4(position, 1.0, 1.0);
  // textcoords = 0.5 * gl_Position.xy + vec2(0.5);
}