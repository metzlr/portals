class WebGLIncompatibilityError extends Error {
  constructor(message) {
    super(message);
    this.name = "WebGLIncompatibilityError";
  }
}

export { WebGLIncompatibilityError };
