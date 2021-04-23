import * as THREE from "three";
import Utils from "../Utils.js";

class Portal {
  constructor(mesh, destination = null) {
    if (!(mesh.geometry instanceof THREE.PlaneGeometry)) {
      console.error("Portal object should be a plane");
    }

    this.frameMesh = mesh;
    this.frameMesh.material = new THREE.MeshBasicMaterial({
      // colorWrite: false,
      side: THREE.DoubleSide,
      color: "#000",
    });
    // this.frameMesh.visible = false;

    this.frameMesh.geometry.computeBoundingBox();
    this.worldBoundingBox = new THREE.Box3();

    this._destination = destination;
  }

  set destination(destination) {
    if (!(destination instanceof Portal)) {
      console.error("destination is not an instance of Portal");
    }
    this._destination = destination;
  }
  get destination() {
    return this._destination;
  }

  get active() {
    return this._destination !== null;
  }

  update() {
    this.worldBoundingBox.copy(this.frameMesh.geometry.boundingBox);
    this.worldBoundingBox.applyMatrix4(this.frameMesh.matrixWorld);
  }

  // View matrix = inverse world matrix
  getAlignedProjectionMatrix(cameraWorldMatrix, projectionMatrix) {
    const viewMatrix = cameraWorldMatrix.clone().invert();
    // Align near plane of camera's projection matrix to portal frame
    // Souce: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
    const cameraPos = new THREE.Vector3();
    const portalPos = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    this.frameMesh.getWorldQuaternion(rotation);
    this.frameMesh.getWorldPosition(portalPos);
    cameraPos.setFromMatrixPosition(cameraWorldMatrix);
    // Get vector from portal to camera (used to calculate portal normal)
    cameraPos.sub(portalPos);

    // Default normal of PlaneGeometry (aka portal) is (0, 0, 1)
    const norm = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation);
    // Determine which side of portal camera is on. If a destination camera is in front of a portal, normal should be reversed
    const side = norm.dot(cameraPos) > 0 ? -1 : 1;
    norm.multiplyScalar(side);

    let clipPlane = new THREE.Plane();
    // Offset position by a little bit so near plane is slightly in front of portal surface (ensures portal surface isn't visible)
    portalPos.add(norm.clone().multiplyScalar(0.005));
    clipPlane.setFromNormalAndCoplanarPoint(norm, portalPos);
    clipPlane.applyMatrix4(viewMatrix);
    clipPlane = new THREE.Vector4(
      clipPlane.normal.x,
      clipPlane.normal.y,
      clipPlane.normal.z,
      clipPlane.constant
    );
    const newProjectionMatrix = projectionMatrix.clone();
    const q = new THREE.Vector4();
    q.x =
      (Utils.sgn(clipPlane.x) + newProjectionMatrix.elements[8]) /
      newProjectionMatrix.elements[0];
    q.y =
      (Utils.sgn(clipPlane.y) + newProjectionMatrix.elements[9]) /
      newProjectionMatrix.elements[5];
    q.z = -1.0;
    q.w =
      (1.0 + newProjectionMatrix.elements[10]) /
      newProjectionMatrix.elements[14];

    const m3 = clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));
    newProjectionMatrix.elements[2] = m3.x;
    newProjectionMatrix.elements[6] = m3.y;
    newProjectionMatrix.elements[10] = m3.z + 1.0;
    newProjectionMatrix.elements[14] = m3.w;

    return newProjectionMatrix;
  }
}

export default Portal;
