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
    this._recursivePortalRender();
    // this._renderPortals();
    // this.renderer.render(this.scene, this.camera);
  }

  _drawPortal(portal, cameraWorldMatrix, cameraProjectionMatrix) {
    // const pos = new THREE.Vector3().setFromMatrixPosition(cameraWorldMatrix);
    // const rotation = new THREE.Quaternion().setFromRotationMatrix(
    //   cameraWorldMatrix
    // );
    // this._tempCamera.position.set(pos.x, pos.y, pos.z);
    // this._tempCamera.rotation.setFromQuaternion(rotation);

    // this._tempCamera.updateMatrix();
    // this._tempCamera.updateMatrixWorld();
    this._tempCamera.matrixWorld = cameraWorldMatrix;

    this._tempCamera.projectionMatrix = cameraProjectionMatrix;
    this._tempCamera.projectionMatrixInverse
      .clone(cameraProjectionMatrix)
      .invert();

    this.renderer.render(portal.frameMesh, this._tempCamera);
  }

  _drawScene(cameraWorldMatrix, cameraProjectionMatrix) {
    // const pos = new THREE.Vector3().setFromMatrixPosition(cameraWorldMatrix);
    // const rotation = new THREE.Quaternion().setFromRotationMatrix(
    //   cameraWorldMatrix
    // );
    // this._tempCamera.position.set(pos.x, pos.y, pos.z);
    // this._tempCamera.rotation.setFromQuaternion(rotation);

    // this._tempCamera.updateMatrix();
    // this._tempCamera.updateMatrixWorld();
    // this._tempCamera.matrixAutoUpdate = false;
    this._tempCamera.matrixWorld = cameraWorldMatrix;

    this._tempCamera.projectionMatrix = cameraProjectionMatrix;
    this._tempCamera.projectionMatrixInverse
      .clone(cameraProjectionMatrix)
      .invert();

    this.renderer.render(this.scene, this._tempCamera);
  }

  _recursivePortalRender() {
    const gl = this.renderer.getContext();

    gl.enable(gl.STENCIL_TEST);
    gl.stencilOp(gl.INCR, gl.KEEP, gl.KEEP);

    // Render each of the portal interiors first
    for (let i = 0; i < this.sceneObjects.portals.length; i++) {
      const portal = this.sceneObjects.portals[i];

      portal.frameMesh.visible = true;
      // First we increment the stencil buffer inside the portal frame
      // Disable color and depth buffers
      gl.depthMask(false);
      gl.colorMask(false, false, false, false);
      // Enable writing to all stencil bits
      gl.stencilMask(0xff);
      // Ensure stencil buffer always fails (so every pixel in portal will be incremented)
      gl.stencilFunc(gl.NEVER, 0, 0);
      // Start with empty stencil buffer
      gl.clear(gl.STENCIL_BUFFER_BIT);
      // this.renderer.render(portal.frameMesh, this.camera);
      this._drawPortal(
        portal,
        this.camera.matrixWorld,
        this.camera.projectionMatrix
      );

      // Now generate view matrix for camera looking out of portal desination
      const destWorldMatrix = this._getOutportalCameraTransform(
        portal.frameMesh.matrixWorld,
        portal.destination.frameMesh.matrixWorld,
        this.camera.matrixWorld
      );
      const alignedProjectionMatrix = portal.destination.getAlignedProjectionMatrix(
        destWorldMatrix.clone().invert(),
        this.camera.projectionMatrix
      );

      // Render scene from perspective of portal destination (stencil ensures it only draws within the portal frame)
      // No more writing to stencil
      gl.stencilMask(false);
      // Enable writing to depth and color buffers
      gl.depthMask(true);
      gl.colorMask(true, true, true, true);
      // Only draw where ref <= stencil value (i.e. where stencil value is >= 1)
      gl.stencilFunc(gl.LEQUAL, 1, 0xff);
      // this.renderer.render(this.scene, this._tempCamera);
      this._drawScene(destWorldMatrix, alignedProjectionMatrix);
    }

    // Disable stencil test and writing to color/stencil buffers
    gl.disable(gl.STENCIL_TEST);
    gl.stencilMask(0);
    gl.colorMask(false, false, false, false);
    // Now clear the depth buffer (it currently has depth data from portal cam's perspective) and update depth values for each portal frame
    gl.clearDepth(1.0);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.depthFunc(gl.ALWAYS);

    for (let i = 0; i < this.sceneObjects.portals.length; i++) {
      const portal = this.sceneObjects.portals[i];
      // Clear depth buffer and get depth values for the portal frame
      this._drawPortal(
        portal,
        this.camera.matrixWorld,
        this.camera.projectionMatrix
      );
      // Disable the portal frame so its Material doesn't show up when we rerender scene
      portal.frameMesh.visible = false;
    }
    gl.depthFunc(gl.LESS);

    // Re-enable writing to color buffer for normal scene render
    gl.colorMask(true, true, true, true);

    this._drawScene(this.camera.matrixWorld, this.camera.projectionMatrix);
  }

  _getOutportalCameraTransform(
    inPortalWorldMatrix,
    outPortalWorldMatrix,
    mainCameraWorldMatrix
  ) {
    const outCameraTransform = inPortalWorldMatrix
      .clone()
      .invert()
      .multiply(mainCameraWorldMatrix);

    outCameraTransform.premultiply(new THREE.Matrix4().makeRotationY(Math.PI));
    outCameraTransform.premultiply(outPortalWorldMatrix);

    return outCameraTransform;
  }

  // _alignedCameraProjectionMatrix(portal, camera) {
  //   // Align near plane of portal cam to frame of portal
  //   // Souce: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
  //   const pos = new THREE.Vector3();
  //   const rotation = new THREE.Vector3();
  //   portal.destination.frameMesh.getWorldPosition(pos);
  //   portal.destination.frameMesh.getWorldQuaternion(rotation);

  //   // Default normal of PlaneGeometry (aka portal) is (0, 0, 1)
  //   const norm = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation);
  //   let clipPlane = new THREE.Plane();
  //   clipPlane.setFromNormalAndCoplanarPoint(norm, pos);
  //   clipPlane.applyMatrix4(this._tempCamera.matrixWorldInverse);
  //   clipPlane = new THREE.Vector4(
  //     clipPlane.normal.x,
  //     clipPlane.normal.y,
  //     clipPlane.normal.z,
  //     clipPlane.constant
  //   );
  //   const q = new THREE.Vector4();
  //   q.x =
  //     (sgn(clipPlane.x) + projectionMatrix.elements[8]) /
  //     projectionMatrix.elements[0];
  //   q.y =
  //     (sgn(clipPlane.y) + projectionMatrix.elements[9]) /
  //     projectionMatrix.elements[5];
  //   q.z = -1.0;
  //   q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

  //   const m3 = clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));
  //   projectionMatrix.elements[2] = m3.x;
  //   projectionMatrix.elements[6] = m3.y;
  //   projectionMatrix.elements[10] = m3.z + 1.0;
  //   projectionMatrix.elements[14] = m3.w;

  //   this._tempCamera.projectionMatrixInverse.copy(projectionMatrix).invert();
  // }

  // _renderPortals() {
  //   const gl = this.renderer.getContext();

  //   gl.enable(gl.STENCIL_TEST);
  //   gl.stencilOp(gl.INCR, gl.KEEP, gl.KEEP);

  //   // Render each of the portal interiors first
  //   for (let i = 0; i < this.sceneObjects.portals.length; i++) {
  //     const portal = this.sceneObjects.portals[i];

  //     portal.frameMesh.visible = true;
  //     // First we increment the stencil buffer inside the portal frame
  //     // Disable color and depth buffers
  //     gl.depthMask(false);
  //     gl.colorMask(false, false, false, false);
  //     // Enable writing to all stencil bits
  //     gl.stencilMask(0xff);
  //     // Ensure stencil buffer always fails (so every pixel in portal will be incremented)
  //     gl.stencilFunc(gl.NEVER, 0, 0);
  //     // Start with empty stencil buffer
  //     gl.clear(gl.STENCIL_BUFFER_BIT);
  //     this.renderer.render(portal.frameMesh, this.camera);

  //     // Now generate view matrix for camera looking out of portal desination
  //     const portalCamTransform = this._getOutportalCameraTransform(
  //       portal.frameMesh.matrixWorld,
  //       portal.destination.frameMesh.matrixWorld,
  //       this.camera.matrixWorld
  //     );
  //     const pos = new THREE.Vector3().setFromMatrixPosition(portalCamTransform);
  //     const rotation = new THREE.Quaternion().setFromRotationMatrix(
  //       portalCamTransform
  //     );
  //     this._tempCamera.position.set(pos.x, pos.y, pos.z);
  //     this._tempCamera.rotation.setFromQuaternion(rotation);

  //     // Update camera matrices (needed immediately for next step)
  //     this._tempCamera.updateMatrix();
  //     this._tempCamera.updateMatrixWorld();
  //     this._tempCamera.updateProjectionMatrix();

  //     // Align near plane of portal cam to frame of portal
  //     // Souce: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
  //     portal.destination.frameMesh.getWorldPosition(pos);
  //     // Default normal of PlaneGeometry (aka portal) is (0, 0, 1)
  //     portal.destination.frameMesh.getWorldQuaternion(rotation);
  //     const norm = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation);
  //     let clipPlane = new THREE.Plane();
  //     clipPlane.setFromNormalAndCoplanarPoint(norm, pos);
  //     clipPlane.applyMatrix4(this._tempCamera.matrixWorldInverse);
  //     clipPlane = new THREE.Vector4(
  //       clipPlane.normal.x,
  //       clipPlane.normal.y,
  //       clipPlane.normal.z,
  //       clipPlane.constant
  //     );
  //     const q = new THREE.Vector4();
  //     const projectionMatrix = this._tempCamera.projectionMatrix;
  //     q.x =
  //       (sgn(clipPlane.x) + projectionMatrix.elements[8]) /
  //       projectionMatrix.elements[0];
  //     q.y =
  //       (sgn(clipPlane.y) + projectionMatrix.elements[9]) /
  //       projectionMatrix.elements[5];
  //     q.z = -1.0;
  //     q.w =
  //       (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

  //     const m3 = clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));
  //     projectionMatrix.elements[2] = m3.x;
  //     projectionMatrix.elements[6] = m3.y;
  //     projectionMatrix.elements[10] = m3.z + 1.0;
  //     projectionMatrix.elements[14] = m3.w;

  //     this._tempCamera.projectionMatrixInverse.copy(projectionMatrix).invert();

  //     // Render scene from perspective of portal destination (stencil ensures it only draws within the portal frame)
  //     // No more writing to stencil
  //     gl.stencilMask(false);
  //     // Enable writing to depth and color buffers
  //     gl.depthMask(true);
  //     gl.colorMask(true, true, true, true);
  //     // Only draw where ref <= stencil value (i.e. where stencil value is >= 1)
  //     gl.stencilFunc(gl.LEQUAL, 1, 0xff);
  //     this.renderer.render(this.scene, this._tempCamera);
  //   }

  //   // Disable stencil test and writing to color/stencil buffers
  //   gl.disable(gl.STENCIL_TEST);
  //   gl.stencilMask(0);
  //   gl.colorMask(false, false, false, false);
  //   // Now clear the depth buffer (it currently has depth data from portal cam's perspective) and update depth values for each portal frame
  //   gl.clearDepth(1.0);
  //   gl.clear(gl.DEPTH_BUFFER_BIT);
  //   gl.depthFunc(gl.ALWAYS);

  //   for (let i = 0; i < this.sceneObjects.portals.length; i++) {
  //     const portal = this.sceneObjects.portals[i];
  //     // Clear depth buffer and get depth values for the portal frame
  //     this.renderer.render(portal.frameMesh, this.camera);
  //     // Disable the portal frame so its Material doesn't show up when we rerender scene
  //     portal.frameMesh.visible = false;
  //   }
  //   gl.depthFunc(gl.LESS);

  //   // Re-enable writing to color buffer for normal scene render
  //   gl.colorMask(true, true, true, true);
  // }

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
