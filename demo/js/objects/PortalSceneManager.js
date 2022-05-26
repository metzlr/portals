import * as THREE from "three";
import FirstPersonControls from "./FirstPersonControls";
import Stats from "three/examples/jsm/libs/stats.module";
import SceneGUI from "./SceneGUI";

import PortalRenderer from "../../../src/PortalRenderer";
import PortalTraveller from "../../../src/PortalTraveller";
import Portal from "../../../src/Portal.js";

// SceneManager that demonstrates how to use portals in a scene. Used in the demo.
class PortalSceneManager {
  constructor(canvas, scene) {
    if (scene === undefined) {
      console.error("'scene' is undefined");
    }

    /* ----- OPTIONS ----- */
    this.portalTeleporting = true;

    /* ----- OBJECTS ----- */
    this.scene = scene;
    this.renderer = new PortalRenderer(canvas);
    this.renderer._debugDrawPortalColliders = true;
    // Use clear color instead of scene background
    this.renderer.setClearColor(this.scene.background ?? "#D1D7E5");
    if (this.scene.background) this.scene.background = null;

    this._cameraNearDistance = 0.005;
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      this._cameraNearDistance,
      50
    );

    this._clock = new THREE.Clock();

    this.stats = new Stats();
    this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(this.stats.dom);

    this.controls = new FirstPersonControls(
      this.camera,
      this.renderer.domElement
    );
    this.scene.add(this.controls.getObject());

    this._collidables = [];
    this._portals = [];
    this._travellers = [new PortalTraveller(this.camera)];

    // Setup GUI last since it requires some fields in SceneManager to be created
    this.GUI = SceneGUI.createGUI(this);
  }

  get cameraNearDistance() {
    return this._cameraNearDistance;
  }
  set cameraNearDistance(value) {
    this._cameraNearDistance = value;
    this.camera.near = value;
    this.camera.updateProjectionMatrix();
  }

  setPortals(portals) {
    this._portals = portals;
    this.renderer.setPortals(portals);
  }
  getPortals() {
    return this._portals;
  }

  getCollidables() {
    return this._collidables;
  }
  setCollidables(collidables) {
    if (collidables === null) {
      this._collidables = [];
      return;
    }

    // Make shallow copy
    this._collidables = [...collidables];

    return this._collidables;
  }

  /** Searches scene object tree for any object with 'userData.collidable = true` */
  extractCollidablesFromObject(object) {
    const collidables = [];
    object.traverse((obj) => {
      if (obj.type === "Group") return;
      if (obj.userData?.collidable === true) {
        collidables.push(obj);
      }
    });

    this.setCollidables(collidables);
  }

  /** Searches scene object tree for any object with 'userData.collidable = true` */
  extractPortalsFromObject(object) {
    const portalMap = new Map();
    // Find and create portals
    object.traverse((obj) => {
      if (obj.type === "Group") return;
      if (obj.name.length >= 2 && obj.name.substring(0, 2) === "p_") {
        const portal = new Portal(obj, {
          doubleSided: obj.userData?.doubleSided ?? false,
        });
        portalMap.set(obj.name, portal);
      }
    });

    // Assign destinations
    portalMap.forEach((portal) => {
      if (
        !portal.mesh.userData ||
        portal.mesh.userData.destination === undefined
      ) {
        console.warn("Portal missing destination");
        return;
      }
      portal.destination = portalMap.get(portal.mesh.userData.destination);
    });

    this.setPortals([...portalMap.values()]);
  }

  update() {
    this.deltaTime = this._clock.getDelta(); // Get time since last frame

    if (this._resizeRendererToDisplaySize(this.renderer)) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.getSize(this.screenSize);
    }

    for (let i = 0; i < this._portals.length; i++) {
      this._portals[i].update();
    }

    this.controls.update(this.deltaTime, this._collidables);
    this.stats.update();

    if (this.portalTeleporting) {
      for (let i = 0; i < this._travellers.length; i++) {
        this._travellers[i].update(this._portals);
      }
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  _resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width = (canvas.clientWidth * pixelRatio) | 0;
    const height = (canvas.clientHeight * pixelRatio) | 0;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }
}

export default PortalSceneManager;
