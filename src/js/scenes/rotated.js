import * as THREE from "three";
import SceneManager from "../objects/SceneManager";
import sceneURL from "url:../../static/scenes/rotated.json";
import darkGridTexture from "url:../../static/textures/dark_grid.png";

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
