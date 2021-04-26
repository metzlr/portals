import * as THREE from "three";
import FirstPersonControls from "./FirstPersonControls";
import PortalTraveller from "./PortalTraveller";
import Portal from "./Portal.js";

class SceneManager {
  constructor(canvas, sceneJSON) {
    if (sceneJSON === undefined) {
      console.error("'sceneJSON' is undefined");
    }
    const loader = new THREE.ObjectLoader();
    this.scene = loader.parse(sceneJSON);

    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.01,
      2000
    );
    this.camera.position.set(0, 0, 10);
    // Camera matrices are manually updated
    this.camera.matrixAutoUpdate = false;

    this._tempCamera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.01,
      2000
    );
    // Since we'll be updating tempCamera matrices anyway, no need for auto updates
    this._tempCamera.matrixAutoUpdate = false;
    this._frustum = new THREE.Frustum();

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.autoClear = false;
    this.renderer.info.autoReset = false;
    this.renderer.setClearColor("#bbb");

    this._clock = new THREE.Clock();
    this.deltaTime = undefined;
    this.screenSize = new THREE.Vector2();
    this.screenRect = new THREE.Box2();
    this.renderer.getSize(this.screenSize);

    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // this.controls.zoomSpeed = 0.25;
    // this.controls.rotateSpeed = 0.5;

    this.controls = new FirstPersonControls(this.camera, this.scene);
    this._collidables = [];
    this._travellers = [new PortalTraveller(this.camera)];

    this.maxPortalRecursion = 1;
    this.renderPortals = true;

    this._portalHelpers = [];
    this._portalHelperCameras = [];

    this.drawPortalCameras = false;
  }

  getPortals() {
    return this._portals;
  }

  getCollidables() {
    return this._collidables;
  }

  setPortals(portalPrimitives) {
    this._portals = [];

    if (portalPrimitives !== null) {
      for (let i = 0; i < portalPrimitives.length; i++) {
        const portal = new Portal(portalPrimitives[i]);
        this._portals.push(portal);
      }
    }

    for (let i = 0; i < this._travellers.length; i++) {
      this._travellers[i].setPortals(this._portals);
    }

    // Remove previous helpers
    for (let i = 0; i < this._portalHelpers.length; i++) {
      this.scene.remove(this._portalHelpers[i]);
    }

    this._portalHelpers = [];
    this._portalHelperCameras = [];
    for (let i = 0; i < this._portals.length; i++) {
      const canvas = this.renderer.domElement;
      const cam = new THREE.PerspectiveCamera(
        75,
        canvas.clientWidth / canvas.clientHeight,
        0.0001,
        2000
      );
      const helper = new THREE.CameraHelper(cam);
      helper.visible = false;
      this.scene.add(helper);
      this._portalHelpers.push(helper);
      this._portalHelperCameras.push(cam);
    }

    return this._portals;
  }

  setCollidables(collidables) {
    if (collidables === null) {
      this._collidables = [];
      return;
    }

    // Make shallow copy
    this._collidables = [...collidables];

    return this._collidables;
  }

  _update() {
    this.deltaTime = this._clock.getDelta(); // Get time since last frame

    if (this._resizeRendererToDisplaySize(this.renderer)) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
      this._tempCamera.aspect = canvas.clientWidth / canvas.clientHeight;
      this._tempCamera.updateProjectionMatrix();

      // Update size of screen (in pixels)
      this.renderer.getSize(this.screenSize);
      this.screenRect.set(
        new THREE.Vector2(0, 0),
        new THREE.Vector2(this.screenSize.x, this.screenSize.y)
      );
    }
    this.controls.update(this.deltaTime, this._collidables);

    for (let i = 0; i < this._travellers.length; i++) {
      this._travellers[i].update(this._portals);
    }

    this.update();
    this.render();
  }

  render() {
    this.renderer.clear();
    if (this.renderPortals) {
      this._recursivePortalRender(
        this.camera.matrixWorld,
        this.camera.matrixWorldInverse,
        this.camera.projectionMatrix,
        0,
        null
      );
    } else {
      this._draw(
        this.scene,
        this.camera.matrixWorld,
        this.camera.projectionMatrix
      );
    }

    if (this.drawPortalCameras) {
      this._debugDrawPortalCameras();
    }
    this.renderer.info.reset();
  }

  _recursivePortalRender(
    cameraWorldMatrix,
    cameraWorldMatrixInverse,
    cameraProjectionMatrix,
    recursionLevel,
    skipPortal = null
  ) {
    const gl = this.renderer.getContext();

    // Update frustum
    const projScreenMatrix = cameraWorldMatrixInverse
      .clone()
      .premultiply(cameraProjectionMatrix);
    this._frustum.setFromProjectionMatrix(projScreenMatrix);

    // Render each of the portal interiors first
    for (let i = 0; i < this._portals.length; i++) {
      const portal = this._portals[i];

      // Skip portal we're who's perspective we're currently rendering
      if (portal === skipPortal) {
        continue;
      }

      // Check if portal is visible from camera. If not, skip it
      // if (!this._frustum.intersectsObject(portal.mesh)) {
      //   continue;
      // }

      gl.colorMask(false, false, false, false);
      gl.enable(gl.DEPTH_TEST);
      // gl.disable(gl.DEPTH_TEST);

      gl.depthMask(true);
      gl.depthFunc(gl.LESS);
      gl.disable(gl.STENCIL_TEST);
      gl.stencilMask(0);
      gl.clear(gl.DEPTH_BUFFER_BIT);

      for (let j = 0; j < this._portals.length; j++) {
        if (j === i) continue;
        const otherPortal = this._portals[j];
        if (otherPortal === skipPortal) continue;
        this._draw(
          otherPortal.mesh,
          cameraWorldMatrix,
          cameraProjectionMatrix,
          true
        );
      }

      // Disable writing to color and depth buffers
      gl.depthMask(false);

      gl.enable(gl.STENCIL_TEST);
      // Enable writing to all stencil bits
      gl.stencilMask(0xff);
      // Fail stencil (i.e. increment value) only when inside portal of previous recursion level
      gl.stencilFunc(gl.EQUAL, recursionLevel, 0xff);
      // gl.stencilFunc(gl.NOTEQUAL, recursionLevel, 0xff);
      // Increment the stencil buffer when stencil func fails
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
      // gl.stencilOp(gl.INCR, gl.KEEP, gl.KEEP);
      // This will increment the stencil buffer everywhere this portal lies within portal from previous recursionLevel
      this._draw(portal.mesh, cameraWorldMatrix, cameraProjectionMatrix);

      // Now generate view matrix for portal destination
      const destWorldMatrix = portal.getDestCameraWorldMatrix(
        cameraWorldMatrix
      );
      const destWorldMatrixInverse = destWorldMatrix.clone().invert();

      if (recursionLevel === this.maxPortalRecursion) {
        // If we've reached the maximum recursion depth, draw the final level

        // Enable writing to depth/color buffers
        gl.colorMask(true, true, true, true);
        gl.depthMask(true);
        // Enable depth testing
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        // Use fresh depth buffer
        gl.clear(gl.DEPTH_BUFFER_BIT);

        gl.enable(gl.STENCIL_TEST);
        // Disable writing to stencil buffer
        gl.stencilMask(0);
        // Only draw inside the portal for this level (i.e. where stencil value == recursionLevel + 1)
        gl.stencilFunc(gl.EQUAL, recursionLevel + 1, 0xff);

        // Draw using aligned projection matrix
        this._draw(
          this.scene,
          destWorldMatrix,
          portal.destination.getAlignedProjectionMatrix(
            destWorldMatrix,
            destWorldMatrixInverse,
            cameraProjectionMatrix
          ),
          portal.destination.mesh
        );
      } else {
        // Otherwise recurse using destination world matrix and algined projection matrix
        this._recursivePortalRender(
          destWorldMatrix,
          destWorldMatrixInverse,
          portal.destination.getAlignedProjectionMatrix(
            destWorldMatrix,
            destWorldMatrixInverse,
            cameraProjectionMatrix
          ),
          recursionLevel + 1,
          portal.destination // We can skip rendering the portal destination when recursing from its perspective
        );
      }

      // Now we decrement stencil buffer to cleanup the incremented values.
      // This is necessary so stencil values relative to this portal are reset for the next portal in the for-loop

      // Disable color and depth masks
      gl.colorMask(false, false, false, false);
      gl.depthMask(false);
      gl.disable(gl.DEPTH_TEST);
      // Enable stencil test/writing
      gl.enable(gl.STENCIL_TEST);
      gl.stencilMask(0xff);
      // Fail when inside this portals frame
      gl.stencilFunc(gl.NOTEQUAL, recursionLevel + 1, 0xff);
      // Decrement on fail
      gl.stencilOp(gl.DECR, gl.KEEP, gl.KEEP);

      this._draw(portal.mesh, cameraWorldMatrix, cameraProjectionMatrix);
    }

    // Disable stencil test and writing to color/stencil buffers
    gl.disable(gl.STENCIL_TEST);
    gl.stencilMask(0);
    gl.colorMask(false, false, false, false);
    // Now clear the depth buffer (it currently has depth data from portal cam's perspective) and update depth values for each portal frame
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    // if (skipPortal !== null) skipPortal.visible = false;
    // Draw portals into depth buffer. This is necessary so they are correctly occluded in scene
    for (let i = 0; i < this._portals.length; i++) {
      const portal = this._portals[i];
      // Skip portal we're who's perspective we're currently rendering
      if (portal === skipPortal) {
        continue;
      }
      // Clear depth buffer and get depth values for the portal frame
      this._draw(portal.mesh, cameraWorldMatrix, cameraProjectionMatrix);
      // Disable the portal frame so its Material doesn't show up when we rerender scene in next step
    }
    // Reset depth function to its default value

    // Now we draw scene, but only within areas where stencil value >= recursionLevel
    gl.enable(gl.STENCIL_TEST);
    gl.stencilMask(0);
    gl.stencilFunc(gl.LEQUAL, recursionLevel, 0xff);
    // Re-enable writing to color buffer
    gl.colorMask(true, true, true, true);

    this._draw(
      this.scene,
      cameraWorldMatrix,
      cameraProjectionMatrix,
      skipPortal ? skipPortal.mesh : undefined
    );
  }

  _draw(object, cameraWorldMatrix, cameraProjectionMatrix, hideObject) {
    // NOTE: no need to manually update camera.matrixWorldInverse since the renderer will automatically do that
    this._tempCamera.matrixWorld.copy(cameraWorldMatrix);

    this._tempCamera.projectionMatrix = cameraProjectionMatrix;
    this._tempCamera.projectionMatrixInverse
      .copy(cameraProjectionMatrix)
      .invert();

    if (hideObject && hideObject.visible === true) {
      hideObject.visible = false;
      this.renderer.render(object, this._tempCamera);
      hideObject.visible = true;
    } else {
      this.renderer.render(object, this._tempCamera);
    }
  }

  // TODO: It should be possible to render each camera helper using one camera (and one helper).
  // However for some reason this results in only the last helper in the list being drawn
  _debugDrawPortalCameras() {
    const inverseProjection = this.camera.projectionMatrixInverse.clone();
    for (let i = 0; i < this._portals.length; i++) {
      const portal = this._portals[i];
      const destWorldMatrix = this._getDestPortalCameraWorldMatrix(
        portal.mesh.matrixWorld,
        portal.destination.mesh.matrixWorld,
        this.camera.matrixWorld
      );

      const cam = this._portalHelperCameras[i];
      cam.matrixWorld.copy(destWorldMatrix);
      cam.projectionMatrixInverse = inverseProjection;

      const helper = this._portalHelpers[i];
      helper.update();
      helper.visible = true;

      this.renderer.render(helper, this.camera);
      helper.visible = false;
    }
  }

  _resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width = (canvas.clientWidth * pixelRatio) | 0;
    const height = (canvas.clientHeight * pixelRatio) | 0;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  /* Overridable methods */

  update() {}
}

export default SceneManager;
