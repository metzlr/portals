import * as THREE from "three";
import SceneManager from "../objects/SceneManager";
import sceneJSON from "../../static/scenes/ramp.json";
import darkGridTexture from "../../static/textures/dark_grid.png";

(function () {
  const canvas = document.getElementById("main-canvas");
  const manager = new SceneManager(canvas, sceneJSON);

  manager.camera.position.set(0, 6, 6);
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

  function renderScene() {
    requestAnimationFrame(renderScene);
    manager.update();
    manager.render();
  }
})();
