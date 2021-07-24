import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

const _vector1 = new THREE.Vector3();

export default class FirstPersonControls {
  constructor(camera, domElement) {
    this.camera = camera;

    this.moveForward = this.moveBackward = this.moveLeft = this.moveRight = this.canJump = this.freeCam = this.flyUp = this.flyDown = false;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    this._controls = new PointerLockControls(camera, domElement);

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

        case "KeyC":
          this.freeCam = !this.freeCam;
          break;

        case "Space":
          if (this.freeCam) {
            this.flyUp = true;
          } else {
            if (this.canJump === true) this.velocity.y += 12;
            this.canJump = false;
          }
          break;
        case "ShiftLeft":
          if (this.freeCam) {
            this.flyDown = true;
          }
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

        case "Space":
          if (this.freeCam) {
            this.flyUp = false;
          }
          break;
        case "ShiftLeft":
          if (this.freeCam) {
            this.flyDown = false;
          }
          break;
      }
    };
    domElement.addEventListener("click", () => {
      this._controls.lock();
    });

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    this.distToFeet = 3;
    this.raycaster = new THREE.Raycaster(
      new THREE.Vector3(),
      new THREE.Vector3(0, -1, 0),
      0,
      this.distToFeet + 0.001 // Fudge factor to reduce false positives/negatives
    );
  }

  getObject() {
    return this._controls.getObject();
  }

  update(deltaTime, collidables) {
    this.camera.getWorldScale(_vector1);
    const cameraWorldScale = _vector1;
    if (this._controls.isLocked === true) {
      // Test for collision below

      let onObject = null;
      if (collidables.length > 0 && !this.freeCam) {
        this.raycaster.ray.origin.copy(this._controls.getObject().position);
        // this.raycaster.ray.origin.y -= 10;
        const intersections = this.raycaster.intersectObjects(
          collidables,
          true
        );
        onObject = intersections.length > 0 ? intersections[0] : null;
      }

      this.velocity.x -= this.velocity.x * 10 * deltaTime;
      this.velocity.z -= this.velocity.z * 10 * deltaTime;
      if (!this.freeCam) {
        // Gravity
        this.velocity.y -= 50 * deltaTime;
      } else {
        this.velocity.y -= this.velocity.y * 15 * deltaTime;
      }

      this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
      this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
      if (this.freeCam) {
        this.direction.y = Number(this.flyDown) - Number(this.flyUp);
      }
      this.direction.normalize(); // this ensures consistent movements in all directions

      const speed = this.freeCam ? 110 : 70;
      if (this.moveForward || this.moveBackward)
        this.velocity.z -= this.direction.z * speed * deltaTime;
      if (this.moveLeft || this.moveRight)
        this.velocity.x -= this.direction.x * speed * deltaTime;
      if ((this.freeCam && this.flyUp) || this.flyDown) {
        this.velocity.y -= this.direction.y * speed * deltaTime;
      }

      if (!this.freeCam && onObject !== null) {
        this.velocity.y = Math.max(0, this.velocity.y);
        this.canJump = true;
        this._controls.getObject().position.y =
          onObject.point.y + this.distToFeet * cameraWorldScale.y;
      }

      this._controls.moveRight(-this.velocity.x * deltaTime);
      this._controls.moveForward(-this.velocity.z * deltaTime);

      this._controls.getObject().position.y += this.velocity.y * deltaTime;

      if (this._controls.getObject().position.y < 0 && !this.freeCam) {
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
