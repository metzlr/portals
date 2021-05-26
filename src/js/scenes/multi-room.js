import * as THREE from "three";
import { setupScene } from "../scene-setup.js";
import sceneURL from "url:../../static/scenes/multi_room.json";

(function () {
  let manager;
  setupScene(sceneURL, "main-canvas", (sceneManager) => {
    manager = sceneManager;
    manager.camera.position.set(0, 3, -4);
    manager.camera.lookAt(new THREE.Vector3(0, 0, -6));

    const world = manager.scene.getObjectByName("world");
    manager.extractCollidablesFromObject(world);
    manager.extractPortalsFromObject(world);

    renderScene();
  });

  function renderScene() {
    requestAnimationFrame(renderScene);
    manager.update();
    manager.render();
  }
})();
