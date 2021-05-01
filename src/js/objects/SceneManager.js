import * as THREE from "three";
import FirstPersonControls from "./FirstPersonControls";
import PortalTraveller from "./PortalTraveller";
import Portal from "./Portal.js";
import Stats from "three/examples/jsm/libs/stats.module";
import SceneGUI from "./SceneGUI";

class SceneManager {
  constructor(canvas, scene) {
    if (scene === undefined) {
      console.error("'scene' is undefined");
    }

    /* ----- OPTIONS ----- */
    this.maxPortalRecursion = 1;
    this.destinationNearPlaneOffset = 0.02;
    this.destinationObliqueCutoff = 0.009;
    this.renderPortals = true;
    this.portalTeleporting = true;
    this._doubleSidedPortals = false;
    this.drawPortalCameras = false;
    this.drawPortalColliders = false;
    this.frustumCullPortals = true;
    this.portalObliqueViewFrustum = true;

    this._cameraNearDistance = 0.005;

    /* ----- OBJECTS ----- */
    this.scene = scene;

    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      this._cameraNearDistance,
      50
    );

    this._tempCamera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      this._cameraNearDistance,
      50
    );
    // Since we'll be updating tempCamera matrices anyway, no need for auto updates
    this._tempCamera.matrixAutoUpdate = false;

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.autoClear = false;
    this.renderer.info.autoReset = false;
    this.renderer.setClearColor("#bbb");
    this.screenSize = new THREE.Vector2();
    this.renderer.getSize(this.screenSize);

    this._clock = new THREE.Clock();

    this.stats = new Stats();
    this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(this.stats.dom);

    this.controls = new FirstPersonControls(
      this.camera,
      this.scene,
      this.renderer.domElement
    );

    this._portalColliderHelper = new THREE.Box3Helper(
      new THREE.Box3(),
      "#00ff00"
    );
    this._portalColliderHelper.matrixAutoUpdate = false;
    this._portalCameraHelpers = [];
    this._portalCameras = []; // These cameras are just used for the camera helpers, not in the actual rendering
    this._collidables = [];
    this._portals = [];
    this._portalPrimitives = [];
    this._travellers = [new PortalTraveller(this.camera)];
    this._tempGroup = new THREE.Group();
    this._tempGroup.matrixAutoUpdate = false;

    // Extract userData variables from scene object
    this.extractSceneOptionsFromObject(this.scene);

    // Setup GUI last since it requires some fields in SceneManager to be created
    this.GUI = SceneGUI.createGUI(this);
  }

  get cameraNearDistance() {
    return this._cameraNearDistance;
  }
  set cameraNearDistance(value) {
    this._cameraNearDistance = value;
    this.camera.near = value;
    this._tempCamera.near = value;
    this.camera.updateProjectionMatrix();
    this._tempCamera.updateProjectionMatrix();
  }

  get doubleSidedPortals() {
    return this._doubleSidedPortals;
  }
  set doubleSidedPortals(value) {
    if (value !== true && value !== false) {
      console.error("'doubleSidedPortals' expects a boolean value");
      return;
    }
    this._doubleSidedPortals = value;

    // Update each portal
    // NOTE: Might be more efficient to just use one static, shared material across every portal (although this would make them less flexible)
    for (let i = 0; i < this._portals.length; i++) {
      this._portals[i].doubleSided = value;
    }
  }

  getPortals() {
    return this._portals;
  }

  getCollidables() {
    return this._collidables;
  }

  extractSceneOptionsFromObject(object) {
    if (object.userData === undefined) return;
    if (object.userData.doubleSidedPortals !== undefined)
      this.doubleSidedPortals = object.userData.doubleSidedPortals;
  }

  extractCollidablesFromObject(object) {
    const collidables = [];
    object.traverse((obj) => {
      if (obj.type === "Group") return;
      if (obj.userData?.collidable === true) {
        collidables.push(obj);
      }
    });

    this.setCollidables(collidables);
  }

  extractPortalsFromObject(object) {
    const portalMap = new Map();
    // Find and create portals
    object.traverse((obj) => {
      if (obj.type === "Group") return;
      if (obj.name.length >= 2 && obj.name.substring(0, 2) === "p_") {
        const portal = new Portal(obj, {
          doubleSided: this.doubleSidedPortals,
        });
        portalMap.set(obj.name, portal);
      }
    });

    // Assign destinations
    portalMap.forEach((portal) => {
      if (
        !portal.mesh.userData ||
        portal.mesh.userData.destination === undefined
      ) {
        console.warn("Portal missing destination");
        return;
      }
      portal.destination = portalMap.get(portal.mesh.userData.destination);
    });

    this.setPortals([...portalMap.values()]);
  }

  setPortals(portals) {
    // Make shallow copy
    this._portals = [...portals];
    this._portalPrimitives = [];
    for (let i = 0; i < portals.length; i++) {
      this._portalPrimitives.push(portals[i].mesh);
    }

    for (let i = 0; i < this._travellers.length; i++) {
      this._travellers[i].setPortals(this._portals);
    }

    // Remove previous helpers
    for (let i = 0; i < this._portalCameraHelpers.length; i++) {
      this.scene.remove(this._portalCameraHelpers[i]);
    }

    this._portalCameraHelpers = [];
    this._portalCameras = [];
    for (let i = 0; i < this._portals.length; i++) {
      const canvas = this.renderer.domElement;
      const cam = new THREE.PerspectiveCamera(
        75,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        10
      );
      const helper = new THREE.CameraHelper(cam);
      helper.visible = false;
      this.scene.add(helper);
      this._portalCameraHelpers.push(helper);
      this._portalCameras.push(cam);
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

  update() {
    this.deltaTime = this._clock.getDelta(); // Get time since last frame

    if (this._resizeRendererToDisplaySize(this.renderer)) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
      this._tempCamera.aspect = canvas.clientWidth / canvas.clientHeight;
      this._tempCamera.updateProjectionMatrix();

      this.renderer.getSize(this.screenSize);
    }

    for (let i = 0; i < this._portals.length; i++) {
      this._portals[i].update();
    }

    this.controls.update(this.deltaTime, this._collidables);
    this.stats.update();

    if (this.portalTeleporting) {
      for (let i = 0; i < this._travellers.length; i++) {
        this._travellers[i].update(this._portals);
      }
    }
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
    if (this.drawPortalColliders) {
      this._debugDrawPortalColliders();
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
    const frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(projScreenMatrix);

    // Render each of the portal interiors first
    for (let i = 0; i < this._portals.length; i++) {
      const portal = this._portals[i];

      // Skip portal we're who's perspective we're currently rendering
      if (portal === skipPortal || portal.destination === null) {
        continue;
      }

      // Check if portal is visible from camera. If not, skip it
      if (this.frustumCullPortals && !frustum.intersectsObject(portal.mesh)) {
        continue;
      }

      gl.colorMask(false, false, false, false);
      gl.enable(gl.DEPTH_TEST);

      gl.depthMask(true);
      gl.depthFunc(gl.LESS);
      gl.disable(gl.STENCIL_TEST);
      gl.stencilMask(0);

      gl.clear(gl.DEPTH_BUFFER_BIT);

      // Restore other portals (not including this one) back into depth buffer so stencil will only be incremented where this portal is actually visible
      this._drawMultiple(
        this._portalPrimitives,
        cameraWorldMatrix,
        cameraProjectionMatrix,
        skipPortal ? [portal.mesh, skipPortal.mesh] : [portal.mesh]
      );

      // Disable writing to color and depth buffers
      gl.depthMask(false);
      gl.enable(gl.STENCIL_TEST);
      // Enable writing to all stencil bits
      gl.stencilMask(0xff);
      // Pass stencil test only when inside portal of previous recursion level
      gl.stencilFunc(gl.EQUAL, recursionLevel, 0xff);
      // Increment the stencil buffer when both stencil and depth function pass
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
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
          this.portalObliqueViewFrustum
            ? portal.destination.getAlignedProjectionMatrix(
                destWorldMatrix,
                destWorldMatrixInverse,
                cameraProjectionMatrix,
                this.destinationNearPlaneOffset,
                this.destinationObliqueCutoff
              )
            : cameraProjectionMatrix,
          [portal.destination.mesh] // Hide the portal destination when drawing from its perspective
        );
      } else {
        // Otherwise recurse using destination world matrix and algined projection matrix
        this._recursivePortalRender(
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

    // Draw portals into depth buffer. This is necessary so they are correctly in the scene render we're about to do
    this._drawMultiple(
      this._portalPrimitives,
      cameraWorldMatrix,
      cameraProjectionMatrix,
      skipPortal ? [skipPortal.mesh] : undefined
    );

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
      skipPortal ? [skipPortal.mesh] : undefined
    );
  }

  _draw(object, cameraWorldMatrix, cameraProjectionMatrix, hideObjects) {
    // NOTE: no need to manually update camera.matrixWorldInverse since the renderer will automatically do that
    this._tempCamera.matrixWorld.copy(cameraWorldMatrix);

    this._tempCamera.projectionMatrix = cameraProjectionMatrix;
    this._tempCamera.projectionMatrixInverse
      .copy(cameraProjectionMatrix)
      .invert();

    if (hideObjects !== undefined) {
      for (let i = 0; i < hideObjects.length; i++) {
        if (hideObjects[i].visible === false)
          console.warn(
            "Object in 'hideObjects' is already hidden and is being unhidden by _draw call"
          );
        hideObjects[i].visible = false;
      }
    }
    this.renderer.render(object, this._tempCamera);
    if (hideObjects !== undefined) {
      for (let i = 0; i < hideObjects.length; i++) {
        hideObjects[i].visible = true;
      }
    }
  }

  // Draw multiple objects. Sets 'objects' to be children of temp group and then calls normal _draw func on that group
  _drawMultiple(
    objects,
    cameraWorldMatrix,
    cameraProjectionMatrix,
    hideObjects
  ) {
    this._tempGroup.children = objects;
    this._draw(
      this._tempGroup,
      cameraWorldMatrix,
      cameraProjectionMatrix,
      hideObjects
    );
  }

  _debugDrawPortalColliders() {
    const helper = this._portalColliderHelper;
    for (let i = 0; i < this._portals.length; i++) {
      const portal = this._portals[i];
      helper.box = portal.globalCollisionBox.clone();
      helper.updateMatrix();
      helper.updateMatrixWorld(true);
      this.renderer.render(helper, this.camera);
    }
  }

  // TODO: It should be possible to render each camera helper using one camera (and one helper).
  // However for some reason this results in only the last helper in the list being drawn
  _debugDrawPortalCameras() {
    const inverseProjection = this.camera.projectionMatrixInverse.clone();
    for (let i = 0; i < this._portals.length; i++) {
      const portal = this._portals[i];
      const destWorldMatrix = portal.getDestCameraWorldMatrix(
        this.camera.matrixWorld
      );
      const cam = this._portalCameras[i];
      cam.matrixWorld.copy(destWorldMatrix);
      cam.projectionMatrixInverse = inverseProjection;
      const helper = this._portalCameraHelpers[i];
      helper.update();
      helper.visible = true;
      this.renderer.render(helper, this.camera);
      helper.visible = false;
    }
    // const inverseProjection = this.camera.projectionMatrixInverse.clone();
    // const helper = this._testCameraHelper;
    // for (let i = 0; i < this._portals.length; i++) {
    //   const portal = this._portals[i];
    //   const destWorldMatrix = portal.getDestCameraWorldMatrix(
    //     this.camera.matrixWorld
    //   );
    //   this._tempCamera.matrixWorld.copy(destWorldMatrix);
    //   this._tempCamera.projectionMatrixInverse.copy(inverseProjection);
    //   helper.update();
    //   this.renderer.render(helper, this.camera);
    // }
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
}

export default SceneManager;
