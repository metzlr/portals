import * as THREE from "three";
import Utils from "./Utils.js";

class Portal {
  /**
   *
   * @param {THREE.Mesh} mesh Portal mesh. Mesh geometry must a `THREE.PlaneGeometry`
   * @param {object} [options]
   * @param {Portal} [options.destination] This portal's destination portal
   * @param {boolean} [options.doubleSided] Whether or not to render both sides of this portal
   */
  constructor(mesh, options = {}) {
    if (!(mesh.geometry instanceof THREE.PlaneGeometry)) {
      throw new Error("Portal object should be a plane");
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
    this.localCollisionBox.expandByPoint(new THREE.Vector3(0, 0, -2));
    this.localCollisionBox.expandByPoint(new THREE.Vector3(0, 0, 2));

    this.globalCollisionBox = null;
    this.globalBoundingBox = null;
    this._updateGlobalBoundingBoxes();

    this.destinationTransform = null;
    this._updateDestinationTransform();
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

    this._updateDestinationTransform();
  }
  get destination() {
    return this._destination;
  }
  get id() {
    return this.mesh.uuid;
  }

  /**
   * Applies any necessary updates to this portal. This function should be called every frame.
   */
  update() {
    this._updateGlobalBoundingBoxes();
    this._updateDestinationTransform();
  }

  _updateGlobalBoundingBoxes() {
    this.globalCollisionBox = this.localCollisionBox
      .clone()
      .applyMatrix4(this.mesh.matrixWorld);
    this.globalBoundingBox = this.mesh.geometry.boundingBox
      .clone()
      .applyMatrix4(this.mesh.matrixWorld);
  }

  // TODO: Figure out why this ends up with wrong matrix when called only at initial scene setup (when destination is first set)
  _updateDestinationTransform() {
    if (this._destination === null) {
      this.destinationTransform = null;
      return;
    }

    this.destinationTransform = new THREE.Matrix4().makeRotationY(Math.PI);
    this.destinationTransform.premultiply(this.destination.mesh.matrixWorld);
    this.destinationTransform.multiply(this.mesh.matrixWorld.clone().invert());
  }

  /**
   * Calculates and returns a projection matrix whose near plane is aligned with the portal's surface
   * @param {THREE.Matrix4} cameraWorldMatrix
   * @param {THREE.Matrix4} cameraWorldMatrixInverse
   * @param {THREE.Matrix4} cameraProjectionMatrix
   * @param {number} offsetAmount
   * @param {number} cutoff
   * @returns {THREE.Matrix4}
   */
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

    // Offset position by a little bit so near plane is slightly in behind portal surface
    // Here's the tradeoff: Higher offset values means less artifacts (caused by Z-fighting), but means that objects directly behind portal need to be further away
    const dot = norm.dot(portalToCamera);
    const side = dot > 0 ? 1 : -1;
    norm.multiplyScalar(-1 * side);
    // Shrink offset so it remains just in front of camera (when camera is really close)
    // This allows us to squeeze a bit more distance out of the offset oblique proj matrix before just using the normal camera proj matrix
    const dist = Math.abs(dot);
    let adjustedOffset = Math.min(offsetAmount, dist * 0.5);
    if (
      this.globalCollisionBox.containsPoint(cameraPos) &&
      adjustedOffset < cutoff
    ) {
      // If cam is in front of portal and offset gets below this value just use normal projection matrix since just using adjustedOffset still results in flickering
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
