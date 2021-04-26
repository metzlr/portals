import PortalBasicScene from "./PortalBasicScene";

(function () {
  const canvas = document.getElementById("main-canvas");
  const sceneManager = new PortalBasicScene(canvas);

  renderScene();

  function renderScene() {
    requestAnimationFrame(renderScene);
    sceneManager._update();
  }
})();
