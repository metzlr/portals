import * as THREE from "three";

class SceneManager {
  constructor(canvas, sceneJSON) {
    if (sceneJSON === undefined) {
      console.error("'sceneJSON' is undefined");
    }
    const loader = new THREE.ObjectLoader();
    this.scene = loader.parse(sceneJSON);

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
    });

    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 0, 10);

    this._clock = new THREE.Clock();
    this.deltaTime = undefined;

    this.sceneObjects = [];
  }

  _update() {
    this.deltaTime = this._clock.getDelta(); // Get time since last frame

    if (this._resizeRendererToDisplaySize(this.renderer)) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    }

    this.update();
    this.sceneObjects.forEach((item) => {
      item.update(this.deltaTime);
    });

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

  /* Overridable methods */

  update() {}
}

export default SceneManager;
