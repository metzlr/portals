import NonEuclideanScene from "./NonEuclidean.js";
import Stats from "three/examples/jsm/libs/stats.module";

(function () {
  const canvas = document.getElementById("main-canvas");
  const sceneManager = new NonEuclideanScene(canvas);
  const stats = setupStatDisplay();
  if (stats != undefined) {
    document.body.appendChild(stats.dom);
  }

  renderScene();

  function renderScene() {
    requestAnimationFrame(renderScene);
    sceneManager._update();
    if (stats != undefined) {
      stats.update();
    }
  }

  function setupStatDisplay() {
    let stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    return stats;
  }
})();
