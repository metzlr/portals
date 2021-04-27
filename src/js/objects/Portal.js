import * as THREE from "three";
import Utils from "../Utils.js";

class Portal {
  constructor(mesh, options) {
    if (!(mesh.geometry instanceof THREE.PlaneGeometry)) {
      console.error("Portal object should be a plane");
    }

    const { destination, doubleSided } = options;

    this._destination = destination !== undefined ? destination : null;
    this._doubleSided = doubleSided !== undefined ? doubleSided : null;

    this.mesh = mesh;
    this.mesh.material = new THREE.MeshBasicMaterial({
      side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      color: "#000",
    });
    // We will do our own frustum culling when rendering the portal
    this.mesh.frustumCulled = false;

    this.mesh.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    this.mesh.geometry.boundingBox.getSize(size);
    this.size = new THREE.Vector2(size.x, size.y);

    this.localCollisionBox = new THREE.Box3(
      this.mesh.geometry.boundingBox.min,
      this.mesh.geometry.boundingBox.max
    );
    this.localCollisionBox.expandByPoint(new THREE.Vector3(0, 0, -3));
    this.localCollisionBox.expandByPoint(new THREE.Vector3(0, 0, 3));

    this.globalCollisionBox = this.localCollisionBox.clone();
  }

  set doubleSided(value) {
    this._doubleSided = value;
    this.mesh.material.side = value ? THREE.DoubleSide : THREE.FrontSide;
  }
  get doubleSided() {
    return this._doubleSided;
  }

  set destination(destination) {
    if (!destination || !(destination instanceof Portal)) {
      console.error("Invalid portal destination");
      return;
    }
    this._destination = destination;
  }
  get destination() {
    return this._destination;
  }
  get active() {
    return this._destination !== null;
  }
  get id() {
    return this.mesh.uuid;
  }

  update() {
    this.globalCollisionBox = this.localCollisionBox
      .clone()
      .applyMatrix4(this.mesh.matrixWorld);
  }

  getDestCameraWorldMatrix(cameraWorldMatrix) {
    const outCameraTransform = this.mesh.matrixWorld
      .clone()
      .invert()
      .multiply(cameraWorldMatrix);

    outCameraTransform.premultiply(new THREE.Matrix4().makeRotationY(Math.PI));
    outCameraTransform.premultiply(this.destination.mesh.matrixWorld);

    return outCameraTransform;
  }

  // View matrix = inverse world matrix
  getAlignedProjectionMatrix(
    cameraWorldMatrix,
    cameraWorldMatrixInverse,
    cameraProjectionMatrix,
    offsetAmount = 0.05,
    cutoff = 0.008
  ) {
    // Align near plane of camera's projection matrix to portal frame
    // Souce: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
    const cameraPos = new THREE.Vector3();
    const portalPos = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    this.mesh.getWorldQuaternion(rotation);
    this.mesh.getWorldPosition(portalPos);
    // Get vector from portal to camera (used to calculate portal normal)
    cameraPos.setFromMatrixPosition(cameraWorldMatrix);
    const portalToCamera = cameraPos.clone().sub(portalPos);

    // Default normal of PlaneGeometry (aka portal) is (0, 0, 1)
    const norm = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation);

    // Determine which side of portal camera is on. If a destination camera is in front of a portal, normal should be reversed
    let clipPlane = new THREE.Plane();

    // Offset position by a little bit so near plane is slightly in behind portal surface (helps prevent artifacts)
    const dot = norm.dot(portalToCamera);
    const side = dot > 0 ? 1 : -1;
    norm.multiplyScalar(-1 * side);
    // Shrink offset so it remains just in front of camera (when camera is really close)
    const dist = Math.abs(dot);
    let adjustedOffset = Math.min(offsetAmount, dist * 0.5);
    // If cam is in front of portal and offset gets below this value just use normal projection matrix since just using adjustedOffset still results in flickering
    // NOTE: this could result in flickering if there are objects behind portal closer than this cutoff distance
    if (
      this.globalCollisionBox.containsPoint(cameraPos) &&
      adjustedOffset < cutoff
    ) {
      return cameraProjectionMatrix;
    }
    portalPos.add(norm.clone().multiplyScalar(-adjustedOffset));

    clipPlane.setFromNormalAndCoplanarPoint(norm, portalPos);
    clipPlane.applyMatrix4(cameraWorldMatrixInverse);
    clipPlane = new THREE.Vector4(
      clipPlane.normal.x,
      clipPlane.normal.y,
      clipPlane.normal.z,
      clipPlane.constant
    );
    const newProjectionMatrix = cameraProjectionMatrix.clone();
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
