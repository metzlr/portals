import * as THREE from "three";
import { WebGLIncompatibilityError } from "./CustomErrors";

import fullscreenQuadVert from "./shaders/fullscreen-quad.vert";
import fullscreenQuadFrag from "./shaders/fullscreen-quad.frag";

class PortalRenderer {
  /**
   * Create a new PortalRenderer
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    if (!canvas) {
      throw new Error("'canvas' is null or undefined");
    }

    /* ----- OPTIONS ----- */
    /**
     * Maximum portal recursion depth
     */
    this.maxPortalRecursion = 2;
    /**
     * How much to offset the near plane of the portal desintation camera behind the surface of a portal
     *
     * A higher offset value reduces z-fighting with objects close to the portal surface,
     * but means that objects directly behind portal need to be further away (since if they are within the offset distnace they could be rendered)
     */
    this.destinationNearPlaneOffset = 0.02;
    /**
     * `destinationNearPlaneOffset` is scaled down dynamically when the main camera is very close to a portal. This variable defines a cutoff distance at which point the render will just revert to using the near plane that is directly aligned with the portal surface (i.e. an offset of 0) insead of the scaled down value
     */
    this.destinationObliqueCutoff = 0.009;
    /**
     * Enables/disables portal rendering
     */
    this.renderPortals = true;
    /**
     * Draws camera helpers from destination perspective of each portal
     */
    this.drawPortalCameras = false;
    /**
     * Draws portal collider wireframes
     */
    this.drawPortalColliders = false;
    /**
     * When enabled, portals that aren't within the camera's frustum will not be rendered
     */
    this.frustumCullPortals = true;
    /**
     * Whether or not the near plane of a portal's destination camera should be aligned with the portal surface. If this is disabled, objects behind the portal may be visible
     */
    this.portalObliqueViewFrustum = true;
    /* ------------------- */

    this.domElement = canvas;

    this._renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this._renderer.outputEncoding = THREE.sRGBEncoding;
    this._renderer.autoClear = false;
    this._renderer.info.autoReset = false;
    if (!this._renderer.capabilities.isWebGL2) {
      throw new WebGLIncompatibilityError(
        "Unable to create WebGL2 rendering context"
      );
    }
    this._screenSize = new THREE.Vector2();
    this._renderer.getSize(this._screenSize);

    this._tempCamera = new THREE.PerspectiveCamera();
    // Since we'll be updating tempCamera matrices anyway, no need for auto updates
    this._tempCamera.matrixAutoUpdate = false;
    this._orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this._portals = [];
    this._portalMeshGroup = new THREE.Group();
    this._portalMeshGroup.matrixAutoUpdate = false;

    this._portalColliderHelper = new THREE.Box3Helper(
      new THREE.Box3(),
      "#00ff00"
    );
    this._portalColliderHelper.matrixAutoUpdate = false;
    this._portalCameraHelper = new THREE.CameraHelper(this._tempCamera);

    // Quad rendered as scene background
    const fullScreenQuadGeometry = new THREE.BufferGeometry();
    const vertices = [-1, -1, 3, -1, -1, 3];
    fullScreenQuadGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 2)
    );
    this._fullScreenQuad = new THREE.Mesh(
      fullScreenQuadGeometry,
      new THREE.RawShaderMaterial({
        vertexShader: fullscreenQuadVert,
        fragmentShader: fullscreenQuadFrag,
      })
    );
    this._fullScreenQuad.frustumCulled = false;
  }

  /**
   * Copies size into target vector
   * @param {Vector2} target
   * @returns
   */
  getSize(target) {
    return this._renderer.getSize(target);
  }
  /**
   * Resizes the output canvas to (width, height), and also sets the viewport to fit that size, starting in (0, 0).
   * @param {number} width
   * @param {number} height
   * @param {boolean} updateStyle
   */
  setSize(width, height, updateStyle = true) {
    this._renderer.setSize(width, height, updateStyle);
  }

  /**
   * Get's current clear color
   * @returns {THREE.ColorRepresentation}
   */
  getClearColor() {
    return this._renderer.getClearColor();
  }
  /**
   * Sets clear color
   * @param {THREE.ColorRepresentation} color
   */
  setClearColor(color) {
    this._renderer.setClearColor(color);
  }

  /**
   * Get current array of portals
   * @returns {Array<Portal>}
   */
  getPortals() {
    return this._portals;
  }
  /**
   * Set current portals within scene
   * @param {Array<Portal>} portals
   */
  setPortals(portals) {
    // Make shallow copy
    this._portals = [...portals];
    let portalMeshes = [];
    for (let i = 0; i < portals.length; i++) {
      portalMeshes.push(portals[i].mesh);
    }
    this._portalMeshGroup.children = portalMeshes;
  }

  /**
   * Renders a scene containing portals
   * @param {THREE.Object3D} scene
   * @param {THREE.Camera} camera
   */
  render(scene, camera) {
    this._renderer.clear();
    if (this.renderPortals) {
      this._recursivePortalRender(
        scene,
        camera.matrixWorld,
        camera.matrixWorldInverse,
        camera.projectionMatrix,
        0,
        null
      );
    } else {
      this._draw(scene, camera.matrixWorld, camera.projectionMatrix);
    }

    if (this.drawPortalCameras) {
      this._debugDrawPortalCameras(scene, camera);
    }
    if (this.drawPortalColliders) {
      this._drawPortalColliders(camera);
    }
    this._renderer.info.reset();
  }

  _recursivePortalRender(
    scene,
    cameraWorldMatrix,
    cameraWorldMatrixInverse,
    cameraProjectionMatrix,
    recursionLevel,
    skipPortal = null
  ) {
    const gl = this._renderer.getContext();
    // Enable writing to depth/color buffers
    gl.colorMask(false, false, false, false);
    // Enable stencil
    gl.enable(gl.STENCIL_TEST);
    // Disable writing to stencil
    gl.stencilMask(0);
    // Only draw in areas where stencil value == recursionLevel
    gl.stencilFunc(gl.EQUAL, recursionLevel, 0xff);
    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);

    // Render each portal to depth buffer
    this._draw(
      this._portalMeshGroup,
      cameraWorldMatrix,
      cameraProjectionMatrix,
      skipPortal ? [skipPortal.mesh] : undefined
    );

    gl.colorMask(true, true, true, true);

    // Render scene (minus portals)
    this._draw(
      scene,
      cameraWorldMatrix,
      cameraProjectionMatrix,
      this._portalMeshGroup.children
    );

    // Base case - max recursion level reached
    if (recursionLevel === this.maxPortalRecursion) return;

    // Update frustum
    const projScreenMatrix = cameraWorldMatrixInverse
      .clone()
      .premultiply(cameraProjectionMatrix);
    const frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(projScreenMatrix);

    for (let i = 0; i < this._portals.length; i++) {
      const portal = this._portals[i];

      if (portal === skipPortal) continue;

      // Check if portal is visible from camera. If not, skip it
      if (this.frustumCullPortals && !frustum.intersectsObject(portal.mesh)) {
        continue;
      }

      // Increment stencil buffer within visible portal frame
      gl.enable(gl.DEPTH_TEST);
      gl.colorMask(false, false, false, false);
      gl.stencilMask(0xff);
      gl.depthMask(false);
      gl.stencilFunc(gl.EQUAL, recursionLevel, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
      gl.depthFunc(gl.EQUAL);
      this._draw(portal.mesh, cameraWorldMatrix, cameraProjectionMatrix);

      // Clear depth buffer within portal frame (where stencil buffer was just incremented)
      gl.stencilMask(0);
      gl.stencilFunc(gl.EQUAL, recursionLevel + 1, 0xff);
      gl.depthMask(true);
      gl.depthFunc(gl.ALWAYS);
      this._draw(
        this._fullScreenQuad,
        this._orthographicCamera.matrixWorld,
        this._orthographicCamera.projectionMatrix
      );

      // Now generate view matrix for portal destination
      const destWorldMatrix = portal.destinationTransform
        .clone()
        .multiply(cameraWorldMatrix);
      const destWorldMatrixInverse = destWorldMatrix.clone().invert();

      // Render from destination view
      this._recursivePortalRender(
        scene,
        destWorldMatrix,
        destWorldMatrixInverse,
        this.portalObliqueViewFrustum
          ? portal.destination.getAlignedProjectionMatrix(
              destWorldMatrix,
              destWorldMatrixInverse,
              cameraProjectionMatrix,
              this.destinationNearPlaneOffset,
              this.destinationObliqueCutoff
            )
          : cameraProjectionMatrix,
        recursionLevel + 1,
        portal.destination // We can skip rendering the portal destination when drawing from its perspective
      );

      // Now we decrement stencil buffer to cleanup the incremented values.
      // This is necessary so stencil values relative to this portal are reset for the next portal in the for-loop

      // Disable color writing
      gl.colorMask(false, false, false, false);
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      // Enable stencil test/writing
      gl.enable(gl.STENCIL_TEST);
      gl.stencilMask(0xff);
      // Fail when inside this portals frame
      gl.stencilFunc(gl.NOTEQUAL, recursionLevel + 1, 0xff);
      // Decrement regardless of depth test
      gl.stencilOp(gl.DECR, gl.KEEP, gl.KEEP);

      this._draw(portal.mesh, cameraWorldMatrix, cameraProjectionMatrix);
    }

    // Reset values
    gl.colorMask(true, true, true, true);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.disable(gl.STENCIL_TEST);
    gl.enable(gl.DEPTH_TEST);
    gl.stencilMask(0);
  }

  _draw(object, cameraWorldMatrix, cameraProjectionMatrix, hideObjects) {
    // NOTE: no need to manually update camera.matrixWorldInverse since the renderer will automatically do that
    this._tempCamera.matrixWorld.copy(cameraWorldMatrix);

    this._tempCamera.projectionMatrix = cameraProjectionMatrix;
    this._tempCamera.projectionMatrixInverse
      .copy(cameraProjectionMatrix)
      .invert();

    // Set visible = false for objects in 'hideObjects'
    if (hideObjects !== undefined) {
      for (let i = 0; i < hideObjects.length; i++) {
        if (hideObjects[i].visible === false)
          // Any objects already invisible will have visible = true when this function returns
          console.warn(
            "Object in 'hideObjects' is already hidden and will unhidden by _draw call"
          );
        hideObjects[i].visible = false;
      }
    }
    this._renderer.render(object, this._tempCamera);
    // Reset visible = true for objects in 'hideObjects'
    if (hideObjects !== undefined) {
      for (let i = 0; i < hideObjects.length; i++) {
        hideObjects[i].visible = true;
      }
    }
  }

  _debugDrawPortalCameras(scene, camera) {
    this._renderer.clearDepth();
    const inverseProjection = camera.projectionMatrixInverse.clone();
    const helper = this._portalCameraHelper;
    for (let i = 0; i < this._portals.length; i++) {
      const portal = this._portals[i];
      const destWorldMatrix = portal.destinationTransform
        .clone()
        .multiply(camera.matrixWorld);
      this._tempCamera.matrixWorld.copy(destWorldMatrix);
      this._tempCamera.projectionMatrixInverse.copy(inverseProjection);
      helper.matrixWorld = this._tempCamera.matrixWorld;
      helper.update();
      this._renderer.render(helper, camera);
    }
  }

  _drawPortalColliders(camera) {
    this._renderer.clearDepth();
    const helper = this._portalColliderHelper;
    for (let i = 0; i < this._portals.length; i++) {
      const portal = this._portals[i];
      helper.box = portal.globalCollisionBox.clone();
      helper.updateMatrix();
      helper.updateMatrixWorld(true);
      this._renderer.render(helper, camera);
    }
  }
}

export default PortalRenderer;
