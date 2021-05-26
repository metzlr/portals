import * as THREE from "three";
import { setupScene } from "../scene-setup.js";
import sceneURL from "url:../../static/scenes/house.json";
import darkGridTexture from "url:../../static/textures/dark_grid.png";

(function () {
  let manager;
  setupScene(sceneURL, "main-canvas", (sceneManager) => {
    manager = sceneManager;
    manager.camera.position.set(0, 6, 8);
    manager.camera.lookAt(new THREE.Vector3(0, 0, 0));

    const world = manager.scene.getObjectByName("world");
    manager.extractCollidablesFromObject(world);
    manager.extractPortalsFromObject(world);

    const textureLoader = new THREE.TextureLoader();
    const floorTexture = textureLoader.load(darkGridTexture);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture });
    const floor = manager.scene.getObjectByName("floor");
    floor.material = floorMaterial;
    renderScene();
  });

  function renderScene() {
    requestAnimationFrame(renderScene);
    manager.update();
    manager.render();
  }
})();
