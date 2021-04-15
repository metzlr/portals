import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import PortalObject from "../../objects/PortalObject.js";
import SceneManager from "../../objects/SceneManager";
import sceneJSON from "../../../static/scenes/portal_basic.json";

// import { GUI } from "three/examples/jsm/libs/dat.gui.module";

class PortalBasicScene extends SceneManager {
  constructor(canvas) {
    super(canvas, sceneJSON);
    this.controls = this._setupOrbitControls(this.camera, this.renderer);
    this.portals = [
      new PortalObject(
        this.scene.getObjectByName("portal1_b"),
        this.scene.getObjectByName("portal1_a")
      ),
    ];
    this.camera.position.set(-6, 4, 9);
    this.controls.target = this.portals[0].entrance.position.clone();
    this.controls.update();
  }

  _setupOrbitControls(camera, renderer) {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.zoomSpeed = 0.25;
    controls.rotateSpeed = 0.5;
    return controls;
  }

  update() {}
}

export default PortalBasicScene;
