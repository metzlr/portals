import NonEuclideanScene from "./NonEuclidean.js";

(function () {
  const canvas = document.getElementById("main-canvas");
  const sceneManager = new NonEuclideanScene(canvas);

  renderScene();

  function renderScene() {
    requestAnimationFrame(renderScene);
    sceneManager._update();
  }
})();
