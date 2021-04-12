import * as THREE from "three";

class BiDirectionalLighting {
  constructor(scene) {
    this.scene = scene;
    this.objectGroup = new THREE.Group();

    this.topLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.topLight.position.set(0, 1, 0);
    this.bottomLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.bottomLight.position.set(0, -1, 0);
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.2);

    this.objectGroup.add(this.topLight);
    this.objectGroup.add(this.bottomLight);
    this.objectGroup.add(this.ambientLight);

    this.scene.add(this.objectGroup);
  }

  update() {}
}

export { BiDirectionalLighting };
