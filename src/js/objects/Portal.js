import * as THREE from "three";

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
}

export default Portal;
