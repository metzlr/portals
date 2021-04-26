import * as THREE from "three";
import SceneManager from "../../objects/SceneManager";
import sceneJSON from "../../../static/scenes/portal_geometry.json";
import darkGridTexture from "../../../static/textures/dark_grid.png";

// import { GUI } from "three/examples/jsm/libs/dat.gui.module";

class BasicPortalsScene extends SceneManager {
  constructor(canvas) {
    super(canvas, sceneJSON);

    this.camera.position.set(-6, 4, 9);
    this.controls.target = this.sceneObjects.portals[0].mesh.position.clone();

    this.sceneObjects.portals[0].destination = this.sceneObjects.portals[1];
    this.sceneObjects.portals[1].destination = this.sceneObjects.portals[0];

    const textureLoader = new THREE.TextureLoader();
    const floorTexture = textureLoader.load(darkGridTexture);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture });
    const floor = this.scene.getObjectByName("floor");
    floor.material = floorMaterial;
  }

  update() {}
}

export default BasicPortalsScene;
