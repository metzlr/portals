import * as THREE from "three";

class Portal {
  constructor(mesh, destination = null) {
    if (!(mesh.geometry instanceof THREE.PlaneGeometry)) {
      console.error("Portal object should be a plane");
    }

    const color = "#0335fc";
    const borderWidth = 0.1;

    this.mesh = mesh;
    this.mesh.material = new THREE.MeshBasicMaterial({ color: color });
    this.mesh.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    this.mesh.geometry.boundingBox.getSize(size);
    // this.mesh.visible = false;
    this.mesh.material.transparent = true;
    // this.mesh.material.opacity = 0.3;

    this._interior = new THREE.Mesh(
      new THREE.PlaneGeometry(
        size.x - borderWidth * 2,
        size.y - borderWidth * 2
      ),
      new THREE.MeshBasicMaterial({ color: color })
    );
    this.mesh.add(this._interior);
    // Offset a bit so portal interior isn't completely flush with background (causing flickering)
    this._interior.translateZ(0.005);

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
}

export default Portal;
