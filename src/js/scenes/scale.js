import * as THREE from "three";
import SceneManager from "../objects/SceneManager";
import sceneURL from "url:../../static/scenes/scale.json";

(function () {
  const canvas = document.getElementById("main-canvas");
  let manager;

  const loader = new THREE.ObjectLoader();
  loader.load(sceneURL, (obj) => {
    manager = new SceneManager(canvas, obj);
    manager.camera.position.set(0, 6, 6);
    manager.camera.lookAt(new THREE.Vector3(0, 0, 0));

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
