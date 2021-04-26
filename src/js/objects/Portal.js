import * as THREE from "three";
import Utils from "../Utils.js";

class Portal {
  constructor(mesh, destination = null) {
    if (!(mesh.geometry instanceof THREE.PlaneGeometry)) {
      console.error("Portal object should be a plane");
    }

    this.mesh = mesh;
    this.mesh.material = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      color: "#000",
    });
    // We will do our own frustum culling when rendering the portal
    this.mesh.frustumCulled = false;
    // this.mesh.geometry = new THREE.BoxGeometry(
    //   mesh.geometry.parameters.width,
    //   mesh.geometry.parameters.height,
    //   1,
    //   1,
    //   1,
    //   1
    // );

    this.mesh.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    this.mesh.geometry.boundingBox.getSize(size);
    this.size = new THREE.Vector2(size.x, size.y);

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

  get id() {
    return this.mesh.uuid;
  }

  update() {}

  getDestCameraWorldMatrix(cameraWorldMatrix) {
    const outCameraTransform = this.mesh.matrixWorld
      .clone()
      .invert()
      .multiply(cameraWorldMatrix);

    outCameraTransform.premultiply(new THREE.Matrix4().makeRotationY(Math.PI));
    outCameraTransform.premultiply(this.destination.mesh.matrixWorld);

    return outCameraTransform;
  }

  getScreenRect(screenSize, cameraMatrixWorldInverse, cameraProjectionMatrix) {
    const halfScreenWidth = screenSize.width / 2;
    const halfScreenHeight = screenSize.height / 2;
    const bbox = this.worldBoundingBox;
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

  // View matrix = inverse world matrix
  getAlignedProjectionMatrix(
    cameraWorldMatrix,
    cameraWorldMatrixInverse,
    cameraProjectionMatrix
  ) {
    // Align near plane of camera's projection matrix to portal frame
    // Souce: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
    const cameraPos = new THREE.Vector3();
    const portalPos = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    this.mesh.getWorldQuaternion(rotation);
    this.mesh.getWorldPosition(portalPos);
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
    // portalPos.add(norm.clone().multiplyScalar(1));
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
