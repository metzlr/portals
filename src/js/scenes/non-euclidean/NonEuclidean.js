import * as THREE from "three";
import SceneManager from "../../objects/SceneManager";
import sceneJSON from "../../../static/scenes/non_euclidean.json";

// import { GUI } from "three/examples/jsm/libs/dat.gui.module";

class NonEuclideanScene extends SceneManager {
  constructor(canvas) {
    super(canvas, sceneJSON);

    this.camera.position.set(0, 10, 15);

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

    // Assign portal destinations
    let tunnel1,
      tunnel2,
      house1,
      house2 = null;
    for (let i = 0; i < portals.length; i++) {
      const portal = portals[i];
      switch (portal.mesh.name) {
        case "p_tunnel_1":
          tunnel1 = portal;
          break;
        case "p_tunnel_2":
          tunnel2 = portal;
          break;
        case "p_house_1":
          house1 = portal;
          break;
        case "p_house_2":
          house2 = portal;
          break;
        default:
          console.warn("Unknown portal found in scene");
      }
    }

    tunnel1.destination = tunnel2;
    tunnel2.destination = tunnel1;
    house1.destination = house2;
    house2.destination = house1;
  }

  update() {}
}

export default NonEuclideanScene;
