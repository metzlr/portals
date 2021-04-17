import SceneManager from "../../objects/SceneManager";
import sceneJSON from "../../../static/scenes/portal_basic.json";

// import { GUI } from "three/examples/jsm/libs/dat.gui.module";

class BasicPortalsScene extends SceneManager {
  constructor(canvas) {
    super(canvas, sceneJSON);

    this.camera.position.set(-6, 4, 9);
    this.controls.target = this.sceneObjects.portals[0].group.position.clone();

    this.sceneObjects.portals[0].destination = this.sceneObjects.portals[1];
    this.sceneObjects.portals[1].destination = this.sceneObjects.portals[0];
  }

  update() {}
}

export default BasicPortalsScene;
