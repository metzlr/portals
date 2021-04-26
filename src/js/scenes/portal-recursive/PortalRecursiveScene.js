import * as THREE from "three";
import SceneManager from "../../objects/SceneManager";
import sceneJSON from "../../../static/scenes/portal_double.json";
import darkGridTexture from "../../../static/textures/dark_grid.png";

// import { GUI } from "three/examples/jsm/libs/dat.gui.module";

class PortalRecursiveScene extends SceneManager {
  constructor(canvas) {
    super(canvas, sceneJSON);

    this.camera.position.set(0, 6, 6);
    // this.controls.target = this.scene.getObjectByName("bunny").position.clone();

    const portalPrimitives = [];
    const collidables = [];
    this.scene.getObjectByName("world").traverse((obj) => {
      if (obj.type === "Group") return;
      if (obj.name.length >= 2 && obj.name.substring(0, 2) === "p_") {
        portalPrimitives.push(obj);
        return;
      }
      collidables.push(obj);
    });

    const portals = this.setPortals(portalPrimitives);
    this.setCollidables(collidables);

    portals[0].destination = portals[1];
    portals[1].destination = portals[0];

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

export default PortalRecursiveScene;