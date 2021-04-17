import * as THREE from "three";
import { Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Portal from "./Portal.js";

function sgn(x) {
  if (x > 0.0) return 1.0;
  if (x < 0.0) return -1.0;
  return 0.0;
}

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
    this.renderer.autoClear = false;

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
      for (let i = 0; i < portals.children.length; i++) {
        const portal = new Portal(portals.children[i]);
        this.sceneObjects.portals.push(portal);
      }
    }
  }

  _update() {
    this.deltaTime = this._clock.getDelta(); // Get time since last frame

    if (this._resizeRendererToDisplaySize(this.renderer)) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    }

    this.update();

    this.render();
  }

  render() {
    this.renderer.clear();
    this.controls.update();
    this._renderPortals();
  }

  _renderPortals() {
    // this._tempScene.clear();
    const gl = this.renderer.getContext();
    for (let i = 0; i < this.sceneObjects.portals.length; i++) {
      const portal = this.sceneObjects.portals[i];

      if (portal._interior === undefined) {
        console.warn("Portal interior is undefined");
        continue;
      }

      portal._interior.visible = true;

      gl.depthMask(false);
      gl.colorMask(false, false, false, false);
      gl.enable(gl.STENCIL_TEST);
      gl.stencilMask(0xff);
      gl.stencilOp(gl.INCR, gl.KEEP, gl.KEEP);
      gl.stencilFunc(gl.NEVER, 0, 0);
      this.renderer.render(portal._interior, this.camera);

      // Generate view matrix for camera looking out of portal desination
      const portalCamTransform = this._getOutportalCameraTransform(
        portal._interior.matrixWorld,
        portal.destination._interior.matrixWorld,
        this.camera.matrixWorld
      );
      const pos = new THREE.Vector3().setFromMatrixPosition(portalCamTransform);
      const rotation = new THREE.Quaternion().setFromRotationMatrix(
        portalCamTransform
      );
      this._tempCamera.position.set(pos.x, pos.y, pos.z);
      this._tempCamera.rotation.setFromQuaternion(rotation);

      // Update camera matrices (needed immediately for next step)
      this._tempCamera.updateMatrix();
      this._tempCamera.updateMatrixWorld();
      this._tempCamera.updateProjectionMatrix();

      // Souce: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
      portal.destination._interior.getWorldPosition(pos);
      // Default normal of PlaneGeometry (aka portal) is (0, 0, 1)
      portal.destination._interior.getWorldQuaternion(rotation);
      const norm = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation);
      let clipPlane = new THREE.Plane();
      clipPlane.setFromNormalAndCoplanarPoint(norm, pos);
      clipPlane.applyMatrix4(this._tempCamera.matrixWorldInverse);
      clipPlane = new THREE.Vector4(
        clipPlane.normal.x,
        clipPlane.normal.y,
        clipPlane.normal.z,
        clipPlane.constant
      );
      const q = new THREE.Vector4();
      const projectionMatrix = this._tempCamera.projectionMatrix;
      q.x =
        (sgn(clipPlane.x) + projectionMatrix.elements[8]) /
        projectionMatrix.elements[0];
      q.y =
        (sgn(clipPlane.y) + projectionMatrix.elements[9]) /
        projectionMatrix.elements[5];
      q.z = -1.0;
      q.w =
        (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

      const m3 = clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));
      projectionMatrix.elements[2] = m3.x;
      projectionMatrix.elements[6] = m3.y;
      projectionMatrix.elements[10] = m3.z + 1.0;
      projectionMatrix.elements[14] = m3.w;

      // Render scene from perspective of portal destination (stencil ensures it only draws within the portal frame)
      gl.stencilMask(false); // No more writing to stencil
      gl.depthMask(true);
      gl.colorMask(true, true, true, true);
      gl.stencilFunc(gl.LEQUAL, 1, 0xff);
      this.renderer.render(this.scene, this._tempCamera);

      // Clear depth buffer and get depth values for the portal frame
      gl.disable(gl.STENCIL_TEST);
      gl.colorMask(false, false, false, false);
      gl.clearDepth(1.0);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      this.renderer.render(portal._interior, this.camera);

      // Disable the portal frame so its Material doesn't show up when we rerender scene
      portal._interior.visible = false;

      // Re-enable writing to color buffer
      gl.colorMask(true, true, true, true);

      this.renderer.render(this.scene, this.camera);

      break;
    }
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
