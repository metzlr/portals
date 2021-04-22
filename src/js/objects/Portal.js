import * as THREE from "three";
import Utils from "../Utils.js";

class Portal {
  constructor(mesh, outline = false, destination = null) {
    if (!(mesh.geometry instanceof THREE.PlaneGeometry)) {
      console.error("Portal object should be a plane");
    }

    const borderColor = "#003cff";
    const borderWidth = 0.125;

    this.frameMesh = mesh;
    this.frameMesh.visible = false;

    const size = new THREE.Vector3();
    this.frameMesh.geometry.computeBoundingBox();
    this.frameMesh.geometry.boundingBox.getSize(size);

    this.outlineMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(
        size.x + borderWidth * 2,
        size.y + borderWidth * 2
      ),
      new THREE.MeshBasicMaterial({ color: borderColor })
    );
    // Offset a bit so portal frame isn't completely flush with background (causing flickering)
    this.outlineMesh.translateZ(-0.005);
    if (!outline) {
      this.outlineMesh.visible = false;
    }

    this.group = new THREE.Group();
    this.group.add(this.frameMesh);
    this.group.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
    this.group.rotation.set(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z);
    this.group.scale.set(mesh.scale.x, mesh.scale.y, mesh.scale.z);
    this.frameMesh.rotation.set(0, 0, 0);
    this.frameMesh.position.set(0, 0, 0);
    this.frameMesh.scale.set(1, 1, 1);

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

  // View matrix = inverse world matrix
  getAlignedProjectionMatrix(viewMatrix, projectionMatrix) {
    // Align near plane of camera's projection matrix to portal frame
    // Souce: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
    const pos = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    this.frameMesh.getWorldPosition(pos);
    this.frameMesh.getWorldQuaternion(rotation);

    // Default normal of PlaneGeometry (aka portal) is (0, 0, 1)
    const norm = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation);
    let clipPlane = new THREE.Plane();
    clipPlane.setFromNormalAndCoplanarPoint(norm, pos);
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
