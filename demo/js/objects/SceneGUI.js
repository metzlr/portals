import * as dat from "dat.gui";

export default class SceneGUI {
  static createGUI(sceneManager) {
    const gui = new dat.GUI({ name: "Settings", width: 350 });
    const rendererFolder = gui.addFolder("Portal Renderer");
    rendererFolder
      .add(sceneManager.renderer, "renderPortals")
      .name("Render Portals");
    rendererFolder
      .add(sceneManager.renderer, "portalObliqueViewFrustum")
      .name("Oblique View Frustum");
    rendererFolder
      .add(sceneManager.renderer, "frustumCullPortals")
      .name("Frustum Culling");
    rendererFolder
      .add(sceneManager.renderer, "drawPortalCameras")
      .name("Camera Helpers");
    rendererFolder
      .add(sceneManager.renderer, "drawPortalColliders")
      .name("Colliders");
    rendererFolder
      .add(sceneManager.renderer, "maxPortalRecursion", 0, 20)
      .step(1)
      .name("Max Recursion Level");
    rendererFolder
      .add(sceneManager.renderer, "destinationNearPlaneOffset", 0.0, 0.1)
      .step(0.001)
      .name("Near Plane Offset");
    rendererFolder
      .add(sceneManager.renderer, "destinationObliqueCutoff", 0.0, 0.1)
      .step(0.001)
      .name("Oblique Cutoff");

    const sceneFolder = gui.addFolder("Scene");
    sceneFolder
      .add(sceneManager, "cameraNearDistance", 0.0001, 0.1)
      .step(0.0002)
      .name("Camera Near Distance");
    sceneFolder.add(sceneManager, "portalTeleporting").name("Teleportation");

    return gui;
  }
}
