import * as dat from "dat.gui";

export default class SceneGUI {
  static createGUI(sceneManager) {
    const gui = new dat.GUI({ name: "Settings", width: 350 });
    const portalFolder = gui.addFolder("Portals");
    portalFolder.add(sceneManager, "renderPortals").name("Render Portals");
    portalFolder.add(sceneManager, "portalTeleporting").name("Teleportation");
    portalFolder
      .add(sceneManager, "portalObliqueViewFrustum")
      .name("Oblique View Frustum");
    portalFolder.add(sceneManager, "doubleSidedPortals").name("Double sided");
    portalFolder
      .add(sceneManager, "frustumCullPortals")
      .name("Frustum Culling");
    portalFolder.add(sceneManager, "drawPortalCameras").name("Camera Helpers");
    portalFolder.add(sceneManager, "drawPortalColliders").name("Colliders");
    portalFolder
      .add(sceneManager, "maxPortalRecursion", 0, 20)
      .step(1)
      .name("Max Recursion Level");
    portalFolder
      .add(sceneManager, "destinationNearPlaneOffset", 0.0, 0.1)
      .step(0.001)
      .name("Near Plane Offset");
    portalFolder
      .add(sceneManager, "destinationObliqueCutoff", 0.0, 0.1)
      .step(0.001)
      .name("Oblique Cutoff");

    const sceneFolder = gui.addFolder("Scene");
    sceneFolder
      .add(sceneManager, "cameraNearDistance", 0.0001, 0.1)
      .step(0.0002)
      .name("Camera Near Distance");

    return gui;
  }
}
