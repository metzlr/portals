import PortalDimensionsScene from "./PortalDimensionsScene.js";

(function () {
  const canvas = document.getElementById("main-canvas");
  const sceneManager = new PortalDimensionsScene(canvas);

  renderScene();

  function renderScene() {
    requestAnimationFrame(renderScene);
    sceneManager._update();
  }
})();
