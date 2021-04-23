import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Portal from "./Portal.js";
import backgroundVertexShader from "../shaders/background.vert";
import fullScreenQuadVertexShader from "../shaders/fullscreen-quad.vert";
import backgroundFragmentShader from "../shaders/background.frag";

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

    this.orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.autoClear = false;
    this.renderer.info.autoReset = false;

    // Quad rendered as scene background
    const fullScreenQuadGeometry = new THREE.BufferGeometry();
    const vertices = [-1, -1, 3, -1, -1, 3];
    fullScreenQuadGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 2)
    );

    this.background = new THREE.Mesh(
      fullScreenQuadGeometry,
      new THREE.RawShaderMaterial({
        vertexShader: fullScreenQuadVertexShader,
        fragmentShader: backgroundFragmentShader,
        // depthTest: false,
        depthWrite: false,
      })
    );
    this.background.frustumCulled = false;

    this.fullScreenQuad = new THREE.Mesh(
      fullScreenQuadGeometry,
      new THREE.RawShaderMaterial({
        vertexShader: fullScreenQuadVertexShader,
        fragmentShader: backgroundFragmentShader,
        // colorWrite: false,
      })
    );
    this.fullScreenQuad.frustumCulled = false;

    this._clock = new THREE.Clock();
    this.deltaTime = undefined;
    this.screenSize = new THREE.Vector2();
    this.screenRect = new THREE.Box2();
    this.renderer.getSize(this.screenSize);

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
    }
    this.maxPortalRecursion = 0;

    this._portalHelpers = [];
    this._portalHelperCameras = [];

    for (let i = 0; i < this.sceneObjects.portals.length; i++) {
      const cam = new THREE.PerspectiveCamera(
        75,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        2000
      );
      const helper = new THREE.CameraHelper(cam);
      helper.visible = false;
      this.scene.add(helper);
      this._portalHelpers.push(helper);
      this._portalHelperCameras.push(cam);
    }
    // this._testCamera = new THREE.PerspectiveCamera(
    //   75,
    //   canvas.clientWidth / canvas.clientHeight,
    //   0.1,
    //   2000
    // );

    // this._testHelper = new THREE.CameraHelper(this._testCamera);
    // this._testHelper.visible = false;
    // this.scene.add(this._testHelper);

    this.drawPortalCameras = false;
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

    this.controls.update();
    this.update();
    for (let i = 0; i < this.sceneObjects.portals.length; i++) {
      if (i == 0) {
        // console.log(
        //   this._constrainCameraViewToPortal(
        //     this.sceneObjects.portals[i],
        //     this.camera
        //   )
        // );
      }
      this.sceneObjects.portals[i].update(this.screenSize);
    }

    this.render();
  }

  render() {
    this.renderer.clear();
    this._recursivePortalRender(
      this.camera.matrixWorld,
      this.camera.projectionMatrix,
      0,
      null
    );
    if (this.drawPortalCameras) {
      this._debugDrawPortalCameras();
    }
    this.renderer.info.reset();
  }

  // _recursivePortalRender(
  //   cameraWorldMatrix,
  //   cameraProjectionMatrix,
  //   recursionLevel,
  //   skipPortal = null
  // ) {
  //   const gl = this.renderer.getContext();
  //   // Enable writing to depth/color buffers
  //   // gl.colorMask(true, true, true, true);
  //   // Enable stencil
  //   gl.enable(gl.STENCIL_TEST);
  //   // Disable writing to stencil
  //   gl.stencilMask(0);
  //   // Only draw in areas where stencil value == recursionLevel
  //   gl.stencilFunc(gl.EQUAL, recursionLevel, 0xff);
  //   // Enable depth testing
  //   gl.enable(gl.DEPTH_TEST);
  //   gl.depthMask(true);
  //   // Use fresh depth buffer

  //   // gl.clear(gl.DEPTH_BUFFER_BIT);
  //   // gl.depthFunc(gl.ALWAYS);
  //   // gl.colorMask(false, false, false, false);
  //   gl.colorMask(true, true, true, true);
  //   // if (recursionLevel > 0) {
  //   //   this.renderer.render(this.fullScreenQuad, this.orthographicCamera);
  //   // }

  //   gl.depthFunc(gl.LESS);

  //   gl.clear(gl.DEPTH_BUFFER_BIT);

  //   this._drawScene(cameraWorldMatrix, cameraProjectionMatrix);

  //   // Base case - max recursion level reached
  //   if (recursionLevel === this.maxPortalRecursion) return;

  //   for (let i = 0; i < this.sceneObjects.portals.length; i++) {
  //     const portal = this.sceneObjects.portals[i];

  //     gl.colorMask(false, false, false, false);
  //     // gl.stencilMask(0);
  //     // gl.disable(gl.STENCIL_TEST);
  //     gl.enable(gl.DEPTH_TEST);
  //     gl.depthMask(true);
  //     gl.depthFunc(gl.LESS);
  //     this._drawScene(cameraWorldMatrix, cameraProjectionMatrix);

  //     // Disable writing to color and depth buffers
  //     gl.depthMask(false);
  //     // gl.colorMask(false, false, false, false);
  //     // Set depth func to LEQUAL since depth values for the portal already exist (from scene render), which would incorrectly fail depth test if func was LESS
  //     gl.depthFunc(gl.LESS);

  //     gl.enable(gl.STENCIL_TEST);
  //     // Enable writing to all stencil bits
  //     gl.stencilMask(0xff);
  //     // Pass stencil (i.e. increment value) only when inside portal of previous recursion level
  //     gl.stencilFunc(gl.EQUAL, recursionLevel, 0xff);
  //     // Increment the stencil buffer when stencil func and depth func pass
  //     gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
  //     // This will increment the stencil buffer everywhere this portal lies within portal from previous recursionLevel
  //     this._drawPortal(portal, cameraWorldMatrix, cameraProjectionMatrix);

  //     // Now generate view matrix for portal destination
  //     const destWorldMatrix = this._getDestPortalCameraWorldMatrix(
  //       portal.frameMesh.matrixWorld,
  //       portal.destination.frameMesh.matrixWorld,
  //       cameraWorldMatrix
  //     );

  //     this._recursivePortalRender(
  //       destWorldMatrix,
  //       portal.destination.getAlignedProjectionMatrix(
  //         destWorldMatrix,
  //         cameraProjectionMatrix
  //       ),
  //       recursionLevel + 1,
  //       portal.destination // We can skip rendering the portal destination when recursing from its perspective
  //     );

  //     // Now we decrement stencil buffer to cleanup the incremented values.
  //     // This is necessary so stencil values relative to this portal are reset for the next portal in the for-loop
  //     // We also replace the depth values in the portal area so other portals are properly occluded

  //     // Disable color writing
  //     gl.colorMask(false, false, false, false);
  //     // Always write depth values for portal

  //     // Enable stencil test/writing
  //     gl.enable(gl.STENCIL_TEST);
  //     gl.stencilMask(0xff);
  //     // Fail when inside this portals frame
  //     gl.stencilFunc(gl.EQUAL, recursionLevel + 1, 0xff);
  //     // Decrement regardless of depth test
  //     // NOTE: must use this method to decrement stencil (as opposed to using NOTEQAUL and DECR on fail) since failed stencil tests won't update depth value
  //     gl.stencilOp(gl.KEEP, gl.DECR, gl.DECR);

  //     this._drawPortal(portal, cameraWorldMatrix, cameraProjectionMatrix);
  //   }

  //   // Reset values
  //   gl.colorMask(true, true, true, true);
  //   gl.depthFunc(gl.LESS);
  //   gl.disable(gl.STENCIL_TEST);
  //   gl.stencilMask(0);
  // }

  _recursivePortalRender(
    cameraWorldMatrix,
    cameraProjectionMatrix,
    recursionLevel,
    skipPortal = null
  ) {
    const gl = this.renderer.getContext();

    // Render each of the portal interiors first
    for (let i = 0; i < this.sceneObjects.portals.length; i++) {
      const portal = this.sceneObjects.portals[i];

      // Skip portal we're who's perspective we're currently rendering
      // if (portal === skipPortal) {
      //   continue;
      // }

      // // // Check if portal is visible from camera. If not, skip it
      // const box = this._getPortalScreenRect(
      //   portal,
      //   cameraWorldMatrix.clone().invert(),
      //   cameraProjectionMatrix
      // );
      // if (!box.intersectsBox(this.screenRect)) {
      //   continue;
      // }

      gl.colorMask(false, false, false, false);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.depthFunc(gl.LESS);
      gl.disable(gl.STENCIL_TEST);
      gl.stencilMask(0);

      for (let j = 0; j < this.sceneObjects.portals.length; j++) {
        if (j === i) continue;
        const otherPortal = this.sceneObjects.portals[j];
        this._draw(
          otherPortal.frameMesh,
          cameraWorldMatrix,
          cameraProjectionMatrix
        );
      }

      // Disable writing to color and depth buffers
      gl.depthMask(false);

      // gl.disable(gl.DEPTH_TEST);

      gl.enable(gl.STENCIL_TEST);
      // Enable writing to all stencil bits
      gl.stencilMask(0xff);
      // Fail stencil (i.e. increment value) only when inside portal of previous recursion level
      gl.stencilFunc(gl.EQUAL, recursionLevel, 0xff);
      // Increment the stencil buffer when stencil func fails
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
      // This will increment the stencil buffer everywhere this portal lies within portal from previous recursionLevel
      this._draw(portal.frameMesh, cameraWorldMatrix, cameraProjectionMatrix);

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
            cameraProjectionMatrix
          )
        );
      } else {
        // Otherwise recurse using destination world matrix and algined projection matrix
        this._recursivePortalRender(
          destWorldMatrix,
          portal.destination.getAlignedProjectionMatrix(
            destWorldMatrix,
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

      this._draw(portal.frameMesh, cameraWorldMatrix, cameraProjectionMatrix);
    }

    // Disable stencil test and writing to color/stencil buffers
    gl.disable(gl.STENCIL_TEST);
    gl.stencilMask(0);
    gl.colorMask(false, false, false, false);
    // Now clear the depth buffer (it currently has depth data from portal cam's perspective) and update depth values for each portal frame
    gl.enable(gl.DEPTH_TEST);
    // gl.depthFunc(gl.ALWAYS);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    // if (skipPortal !== null) skipPortal.visible = false;
    // Draw portals into depth buffer. This is necessary so they are correctly occluded in scene
    for (let i = 0; i < this.sceneObjects.portals.length; i++) {
      const portal = this.sceneObjects.portals[i];
      // Skip portal we're who's perspective we're currently rendering
      // if (portal === skipPortal) {
      //   continue;
      // }
      // Clear depth buffer and get depth values for the portal frame
      this._draw(portal.frameMesh, cameraWorldMatrix, cameraProjectionMatrix);
      // Disable the portal frame so its Material doesn't show up when we rerender scene in next step
    }
    // Reset depth function to its default value
    // gl.depthFunc(gl.LESS);

    // Now we draw scene, but only within areas where stencil value >= recursionLevel
    gl.enable(gl.STENCIL_TEST);
    gl.stencilMask(0);
    gl.stencilFunc(gl.LEQUAL, recursionLevel, 0xff);
    // Re-enable writing to color buffer
    gl.colorMask(true, true, true, true);

    this._draw(this.scene, cameraWorldMatrix, cameraProjectionMatrix);
  }

  _draw(object, cameraWorldMatrix, cameraProjectionMatrix) {
    this._tempCamera.matrixWorld.copy(cameraWorldMatrix);
    // NOTE: no need to manually update camera.matrixWorldInverse since the renderer will automatically do that

    this._tempCamera.projectionMatrix = cameraProjectionMatrix;
    this._tempCamera.projectionMatrixInverse
      .copy(cameraProjectionMatrix)
      .invert();

    // portal.frameMesh.visible = true;
    this.renderer.render(object, this._tempCamera);
    // Hide portal material after render since we don't want to actually see it
    // portal.frameMesh.visible = false;
  }

  _drawPortal(portal, cameraWorldMatrix, cameraProjectionMatrix) {
    // this._tempCamera.matrixWorld = cameraWorldMatrix;
    this._tempCamera.matrixWorld.copy(cameraWorldMatrix);
    // NOTE: no need to manually update camera.matrixWorldInverse since the renderer will automatically do that

    this._tempCamera.projectionMatrix = cameraProjectionMatrix;
    this._tempCamera.projectionMatrixInverse
      .copy(cameraProjectionMatrix)
      .invert();

    // portal.frameMesh.visible = true;
    this.renderer.render(portal.frameMesh, this._tempCamera);
    // Hide portal material after render since we don't want to actually see it
    // portal.frameMesh.visible = false;
  }

  _drawScene(cameraWorldMatrix, cameraProjectionMatrix) {
    const gl = this.renderer.getContext();
    // First render scene background
    const saveDepthFunc = gl.getParameter(gl.DEPTH_FUNC);
    gl.depthFunc(gl.LEQUAL);
    this.renderer.render(this.background, this.orthographicCamera);
    gl.depthFunc(saveDepthFunc);

    this._tempCamera.matrixWorld.copy(cameraWorldMatrix);
    // NOTE: no need to manually update camera.matrixWorldInverse since the renderer will automatically do that

    this._tempCamera.projectionMatrix = cameraProjectionMatrix;
    this._tempCamera.projectionMatrixInverse
      .copy(cameraProjectionMatrix)
      .invert();

    this.renderer.render(this.scene, this._tempCamera);
  }

  _getPortalScreenRect(
    portal,
    cameraMatrixWorldInverse,
    cameraProjectionMatrix
  ) {
    const halfScreenWidth = this.screenSize.width / 2;
    const halfScreenHeight = this.screenSize.height / 2;
    const bbox = portal.worldBoundingBox;
    const screenBox = new THREE.Box2();

    const screenPoint = new THREE.Vector2();
    const point = new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z);
    // Project into camera space
    point
      .applyMatrix4(cameraMatrixWorldInverse)
      .applyMatrix4(cameraProjectionMatrix);
    screenPoint.set(
      point.x * halfScreenWidth + halfScreenWidth,
      -point.y * halfScreenHeight + halfScreenHeight
    );
    screenBox.expandByPoint(screenPoint);

    point.set(bbox.max.x, bbox.min.y, bbox.min.z);
    point
      .applyMatrix4(cameraMatrixWorldInverse)
      .applyMatrix4(cameraProjectionMatrix);
    screenPoint.set(
      point.x * halfScreenWidth + halfScreenWidth,
      -point.y * halfScreenHeight + halfScreenHeight
    );
    screenBox.expandByPoint(screenPoint);

    point.set(bbox.min.x, bbox.max.y, bbox.min.z);
    point
      .applyMatrix4(cameraMatrixWorldInverse)
      .applyMatrix4(cameraProjectionMatrix);
    screenPoint.set(
      point.x * halfScreenWidth + halfScreenWidth,
      -point.y * halfScreenHeight + halfScreenHeight
    );
    screenBox.expandByPoint(screenPoint);

    point.set(bbox.min.x, bbox.min.y, bbox.max.z);
    point
      .applyMatrix4(cameraMatrixWorldInverse)
      .applyMatrix4(cameraProjectionMatrix);
    screenPoint.set(
      point.x * halfScreenWidth + halfScreenWidth,
      -point.y * halfScreenHeight + halfScreenHeight
    );
    screenBox.expandByPoint(screenPoint);

    point.set(bbox.max.x, bbox.max.y, bbox.min.z);
    point
      .applyMatrix4(cameraMatrixWorldInverse)
      .applyMatrix4(cameraProjectionMatrix);
    screenPoint.set(
      point.x * halfScreenWidth + halfScreenWidth,
      -point.y * halfScreenHeight + halfScreenHeight
    );
    screenBox.expandByPoint(screenPoint);

    point.set(bbox.min.x, bbox.max.y, bbox.max.z);
    point
      .applyMatrix4(cameraMatrixWorldInverse)
      .applyMatrix4(cameraProjectionMatrix);
    screenPoint.set(
      point.x * halfScreenWidth + halfScreenWidth,
      -point.y * halfScreenHeight + halfScreenHeight
    );
    screenBox.expandByPoint(screenPoint);

    point.set(bbox.max.x, bbox.min.y, bbox.max.z);
    point
      .applyMatrix4(cameraMatrixWorldInverse)
      .applyMatrix4(cameraProjectionMatrix);
    screenPoint.set(
      point.x * halfScreenWidth + halfScreenWidth,
      -point.y * halfScreenHeight + halfScreenHeight
    );
    screenBox.expandByPoint(screenPoint);

    point.set(bbox.max.x, bbox.max.y, bbox.max.z);
    point
      .applyMatrix4(cameraMatrixWorldInverse)
      .applyMatrix4(cameraProjectionMatrix);
    screenPoint.set(
      point.x * halfScreenWidth + halfScreenWidth,
      -point.y * halfScreenHeight + halfScreenHeight
    );
    screenBox.expandByPoint(screenPoint);

    return screenBox;
  }

  // TODO: It should be possible to render each camera helper using one camera (and one helper).
  // However for some reason this results in only the last helper in the list being drawn
  _debugDrawPortalCameras() {
    const inverseProjection = this.camera.projectionMatrixInverse.clone();
    for (let i = 0; i < this.sceneObjects.portals.length; i++) {
      const portal = this.sceneObjects.portals[i];
      const destWorldMatrix = this._getDestPortalCameraWorldMatrix(
        portal.frameMesh.matrixWorld,
        portal.destination.frameMesh.matrixWorld,
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
