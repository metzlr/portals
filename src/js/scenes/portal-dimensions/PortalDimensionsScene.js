import * as THREE from "three";
import SceneManager from "../../objects/SceneManager";
import sceneJSON from "../../../static/scenes/portal_dimensions.json";
import darkGridTexture from "../../../static/textures/dark_grid.png";

class PortalDimensionsScene extends SceneManager {
  constructor(canvas) {
    super(canvas, sceneJSON);

    this.camera.position.set(0, 6, 6);

    const world = this.scene.getObjectByName("world");
    this.extractCollidablesFromObject(world);
    this.extractPortalsFromObject(world);

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

export default PortalDimensionsScene;
