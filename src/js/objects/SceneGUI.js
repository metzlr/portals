import { GUI } from "three/examples/jsm/libs/dat.gui.module";

export default class SceneGUI {
  static createGUI(sceneManager) {
    const gui = new GUI({ name: "Settings" });
    const portalFolder = gui.addFolder("Portals");
    portalFolder.add(sceneManager, "renderPortals").name("Render Portals");
    portalFolder.add(sceneManager, "portalTeleporting").name("Teleportation");
    portalFolder.add(sceneManager, "doubleSidedPortals").name("Double sided");
    portalFolder
      .add(sceneManager, "maxPortalRecursion", 0, 20)
      .step(1)
      .name("Recursion levels");

    return gui;
  }
}
