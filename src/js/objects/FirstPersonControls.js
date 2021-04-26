import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

export default class FirstPersonControls {
  constructor(camera, scene) {
    this.camera = camera;

    this.moveForward = this.moveBackward = this.moveLeft = this.moveRight = this.canJump = false;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    this._controls = new PointerLockControls(camera, document.body);

    const onKeyDown = (event) => {
      switch (event.code) {
        case "ArrowUp":
        case "KeyW":
          this.moveForward = true;
          break;

        case "ArrowLeft":
        case "KeyA":
          this.moveLeft = true;
          break;

        case "ArrowDown":
        case "KeyS":
          this.moveBackward = true;
          break;

        case "ArrowRight":
        case "KeyD":
          this.moveRight = true;
          break;

        case "Space":
          if (this.canJump === true) this.velocity.y += 0.5;
          this.canJump = false;
          break;
      }
    };

    const onKeyUp = (event) => {
      switch (event.code) {
        case "ArrowUp":
        case "KeyW":
          this.moveForward = false;
          break;

        case "ArrowLeft":
        case "KeyA":
          this.moveLeft = false;
          break;

        case "ArrowDown":
        case "KeyS":
          this.moveBackward = false;
          break;

        case "ArrowRight":
        case "KeyD":
          this.moveRight = false;
          break;
      }
    };
    document.addEventListener("click", () => {
      this._controls.lock();
    });

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    this.raycaster = new THREE.Raycaster(
      new THREE.Vector3(),
      new THREE.Vector3(0, -1, 0),
      0,
      3
    );

    scene.add(this._controls.getObject());
  }

  update(deltaTime, collidables) {
    if (this._controls.isLocked === true) {
      // Test for collision below

      let onObject = false;
      if (collidables.length > 0) {
        this.raycaster.ray.origin.copy(this._controls.getObject().position);
        // this.raycaster.ray.origin.y -= 10;
        const intersections = this.raycaster.intersectObjects(
          collidables,
          true
        );
        onObject = intersections.length > 0;
      }
      // 12 1.75
      this.velocity.x -= this.velocity.x * 10 * deltaTime;
      this.velocity.z -= this.velocity.z * 10 * deltaTime;
      this.velocity.y -= 50 * deltaTime;

      this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
      this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
      this.direction.normalize(); // this ensures consistent movements in all directions

      if (this.moveForward || this.moveBackward)
        this.velocity.z -= this.direction.z * 75 * deltaTime;
      if (this.moveLeft || this.moveRight)
        this.velocity.x -= this.direction.x * 75 * deltaTime;

      if (onObject === true) {
        this.velocity.y = Math.max(0, this.velocity.y);
        this.canJump = true;
      }

      this._controls.moveRight(-this.velocity.x * deltaTime);
      this._controls.moveForward(-this.velocity.z * deltaTime);

      this._controls.getObject().position.y += this.velocity.y * deltaTime;

      if (this._controls.getObject().position.y < 0) {
        this.velocity.y = 0;
        this._controls.getObject().position.y = 0;

        this.canJump = true;
      }

      // Ensure camera matrices are up to date
      this.camera.updateMatrix();
      this.camera.updateWorldMatrix(true);
    }
  }
}
