import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Portal from "./Portal.js";

class SceneManager {
  constructor(canvas, sceneJSON) {
    if (sceneJSON === undefined) {
      console.error("'sceneJSON' is undefined");
    }
    const loader = new THREE.ObjectLoader();
    this.scene = loader.parse(sceneJSON);
    this._tempScene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 0, 10);
    this._tempCamera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      2000
    );
    // Since we'll be updating tempCamera matrices anyway, no need for auto updates
    this._tempCamera.matrixAutoUpdate = false;

    this._tempCameraHelper = new THREE.CameraHelper(this._tempCamera);
    this._tempCameraHelper.visible = false;
    this.scene.add(this._tempCameraHelper);

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
    });
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.autoClear = false;
    this.renderer.setClearColor("#bbb");

    this._clock = new THREE.Clock();
    this.deltaTime = undefined;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.zoomSpeed = 0.25;
    this.controls.rotateSpeed = 0.5;

    this.sceneObjects = {};
    const portals = this.scene.getObjectByName("portals");
    const geometry = this.scene.getObjectByName("geometry");
    geometry.visible = true;
    this.sceneObjects.portals = portals !== undefined ? [] : null;
    this.sceneObjects.geometry = geometry !== undefined ? geometry : null;

    if (portals !== null) {
      const portalPrimitives = [];
      for (let i = 0; i < portals.children.length; i++) {
        portalPrimitives.push(portals.children[i]);
      }
      for (let i = 0; i < portalPrimitives.length; i++) {
        const portal = new Portal(portalPrimitives[i]);
        this.sceneObjects.portals.push(portal);
      }
      for (let i = 0; i < this.sceneObjects.portals.length; i++) {
        portals.add(this.sceneObjects.portals[i].group);
      }
    }
    this.maxPortalRecursion = 2;
  }

  _update() {
    this.deltaTime = this._clock.getDelta(); // Get time since last frame

    if (this._resizeRendererToDisplaySize(this.renderer)) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
      this._tempCamera.aspect = canvas.clientWidth / canvas.clientHeight;
      this._tempCamera.updateProjectionMatrix();
    }
    this.controls.update();

    this.update();

    this.render();
  }

  render() {
    this.renderer.clear();
    this._recursivePortalRender(
      this.camera.matrixWorld,
      this.camera.projectionMatrix,
      0
    );
  }

  _recursivePortalRender(
    cameraWorldMatrix,
    cameraProjectionMatrix,
    recursionLevel
  ) {
    const gl = this.renderer.getContext();

    // Render each of the portal interiors first
    for (let i = 0; i < this.sceneObjects.portals.length; i++) {
      const portal = this.sceneObjects.portals[i];

      // Disable writing to color and depth buffers
      gl.depthMask(false);
      gl.colorMask(false, false, false, false);

      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.STENCIL_TEST);
      // Enable writing to all stencil bits
      gl.stencilMask(0xff);
      // Fail stencil (i.e. increment value) only when inside portal of previous recursion level
      gl.stencilFunc(gl.NOTEQUAL, recursionLevel, 0xff);
      // Increment the stencil buffer when stencil func fails
      gl.stencilOp(gl.INCR, gl.KEEP, gl.KEEP);
      // This will increment the stencil buffer everywhere this portal lies within portal from previous recursionLevel
      this._drawPortal(portal, cameraWorldMatrix, cameraProjectionMatrix);

      // Now generate view matrix for portal destination
      const destWorldMatrix = this._getDestPortalCameraWorldMatrix(
        portal.frameMesh.matrixWorld,
        portal.destination.frameMesh.matrixWorld,
        cameraWorldMatrix
      );

      if (recursionLevel === this.maxPortalRecursion) {
        // If we've reached the maximum recursion depth, draw the final level

        // Enable writing to depth/color buffers
        gl.colorMask(true, true, true, true);
        gl.depthMask(true);
        // Enable depth testing
        gl.enable(gl.DEPTH_TEST);
        // Use fresh depth buffer
        gl.clear(gl.DEPTH_BUFFER_BIT);

        // Disable writing to stencil buffer
        gl.stencilMask(0);
        // Only draw inside the portal for this level (i.e. where stencil value == recursionLevel + 1)
        gl.stencilFunc(gl.EQUAL, recursionLevel + 1, 0xff);

        // Draw using aligned projection matrix
        this._drawScene(
          destWorldMatrix,
          portal.destination.getAlignedProjectionMatrix(
            destWorldMatrix.clone().invert(),
            cameraProjectionMatrix
          )
        );
      } else {
        // Otherwise recurse using destination world matrix and algined projection matrix
        this._recursivePortalRender(
          destWorldMatrix,
          portal.destination.getAlignedProjectionMatrix(
            destWorldMatrix.clone().invert(),
            cameraProjectionMatrix
          ),
          recursionLevel + 1
        );
      }

      // Now we decrement stencil buffer to cleanup the incremented values.
      // This is necessary so stencil values relative to this portal are reset for the next portal in the for-loop

      // Disable color and depth masks
      gl.colorMask(false, false, false, false);
      gl.depthMask(false);
      // Enable stencil test/writing
      gl.enable(gl.STENCIL_TEST);
      gl.stencilMask(0xff);
      // Fail when inside this portals frame
      gl.stencilFunc(gl.NOTEQUAL, recursionLevel + 1, 0xff);
      // Decrement on fail
      gl.stencilOp(gl.DECR, gl.KEEP, gl.KEEP);

      this._drawPortal(portal, cameraWorldMatrix, cameraProjectionMatrix);
    }

    // Disable stencil test and writing to color/stencil buffers
    gl.disable(gl.STENCIL_TEST);
    gl.stencilMask(0);
    gl.colorMask(false, false, false, false);
    // Now clear the depth buffer (it currently has depth data from portal cam's perspective) and update depth values for each portal frame
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.ALWAYS);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    // Draw portals into depth buffer. This is necessary so they are correctly occluded in scene
    for (let i = 0; i < this.sceneObjects.portals.length; i++) {
      const portal = this.sceneObjects.portals[i];
      // Clear depth buffer and get depth values for the portal frame
      this._drawPortal(portal, cameraWorldMatrix, cameraProjectionMatrix);
      // Disable the portal frame so its Material doesn't show up when we rerender scene in next step
    }
    // Reset depth function to its default value
    gl.depthFunc(gl.LESS);

    // Now we draw scene, but only within areas where stencil value >= recursionLevel
    gl.enable(gl.STENCIL_TEST);
    gl.stencilMask(0);
    gl.stencilFunc(gl.LEQUAL, recursionLevel, 0xff);
    // Re-enable writing to color buffer
    gl.colorMask(true, true, true, true);

    this._drawScene(cameraWorldMatrix, cameraProjectionMatrix);
  }

  _drawPortal(portal, cameraWorldMatrix, cameraProjectionMatrix) {
    this._tempCamera.matrixWorld = cameraWorldMatrix;
    // NOTE: no need to manually update camera.matrixWorldInverse since the renderer will automatically do that

    this._tempCamera.projectionMatrix = cameraProjectionMatrix;
    this._tempCamera.projectionMatrixInverse
      .copy(cameraProjectionMatrix)
      .invert();

    portal.frameMesh.visible = true;
    this.renderer.render(portal.frameMesh, this._tempCamera);
    // Hide portal material after render since we don't want to actually see it
    portal.frameMesh.visible = false;
  }

  _drawScene(cameraWorldMatrix, cameraProjectionMatrix) {
    this._tempCamera.matrixWorld = cameraWorldMatrix;
    // NOTE: no need to manually update camera.matrixWorldInverse since the renderer will automatically do that

    this._tempCamera.projectionMatrix = cameraProjectionMatrix;
    this._tempCamera.projectionMatrixInverse
      .copy(cameraProjectionMatrix)
      .invert();

    this.renderer.render(this.scene, this._tempCamera);
  }

  _getDestPortalCameraWorldMatrix(
    inPortalWorldMatrix,
    outPortalWorldMatrix,
    cameraWorldMatrix
  ) {
    const outCameraTransform = inPortalWorldMatrix
      .clone()
      .invert()
      .multiply(cameraWorldMatrix);

    outCameraTransform.premultiply(new THREE.Matrix4().makeRotationY(Math.PI));
    outCameraTransform.premultiply(outPortalWorldMatrix);

    return outCameraTransform;
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
