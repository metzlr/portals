import NonEuclideanSceneScene from "./NonEuclideanScene.js";

(function () {
  const canvas = document.getElementById("main-canvas");
  const sceneManager = new NonEuclideanSceneScene(canvas);

  renderScene();

  function renderScene() {
    requestAnimationFrame(renderScene);
    sceneManager._update();
  }
})();
