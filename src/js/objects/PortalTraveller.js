import * as THREE from "three";
import Utils from "../Utils.js";

const _vector1 = new THREE.Vector3();
const _vector2 = new THREE.Vector3();
const _vector3 = new THREE.Vector3();

class PortalTraveller {
  constructor(camera) {
    this.camera = camera;

    /*
      Stores data about each portal. Keyed by portal's id.
      Data is of format:
      {
        previousDot (previous dot product with camera),
        canTeleport (whether or not this traveller can teleport through the portal)
      }
    */
    this.portalData = null;
  }

  // NOTE: portals need to be static (as in none of their properties change) for this to work
  setPortals(portals) {
    this.portalData = new Map();
    for (let i = 0; i < portals.length; i++) {
      const portal = portals[i];
      const worldScale = new THREE.Vector3();
      portal.mesh.getWorldScale(worldScale);
      const worldHalfSizeSquared = new THREE.Vector2(
        0.5 * portal.size.x * worldScale.x * (portal.size.x * worldScale.x),
        0.5 * portal.size.y * worldScale.y * (portal.size.y * worldScale.y)
      );
      this.portalData.set(portal.id, {
        previousDot: null,
        previousInRange: false,
        worldHalfSizeSquared: worldHalfSizeSquared,
        // canTeleport: true,
      });
    }
  }

  update(portals) {
    this.camera.getWorldPosition(_vector1);
    const cameraWorldPos = _vector1;
    for (let i = 0; i < 1; i++) {
      const portal = portals[i];

      portal.mesh.getWorldPosition(_vector2);
      _vector2.subVectors(cameraWorldPos, _vector2);
      const portalToCamera = _vector2;
      portal.mesh.getWorldDirection(_vector3);
      const portalWorldDir = _vector3;

      const data = this.portalData.get(portal.id);
      const previousDot = data.previousDot;
      const dot = portalToCamera.dot(portalWorldDir);
      const previousDotSign = Utils.sgn(previousDot);
      const dotSign = Utils.sgn(dot);

      portalWorldDir.multiplyScalar(dot);

      // Check if camera is colliding with portal's collision bbox (which extends in front and behind the portal surface)
      // NOTE: an object going really fast could be a problem here
      const cameraLocalPos = portal.mesh.worldToLocal(cameraWorldPos);
      const inRange = portal.localCollisionBox.containsPoint(cameraLocalPos);

      // Make sure we are either currently in front/behind portal, or that we were last frame (don't want to teleport if we are off to the side)
      if (
        previousDot !== null &&
        dotSign !== previousDotSign &&
        (portal.doubleSided || dotSign < 0) &&
        (inRange || data.previousInRange)
      ) {
        // Valid teleport!
        data.previousDot = null;
        data.previousInRange = false;
        const dest = portal.destination;
        const destData = this.portalData.get(dest.id);
        // If dot is zero, don't multiply by -1
        destData.previousDot = dotSign === 0.0 ? dot : -1 * dot;
        destData.previousInRange = inRange;
        // Teleport camera
        const newWorldMatrix = portal.getDestCameraWorldMatrix(
          this.camera.matrixWorld
        );
        this.camera.position.setFromMatrixPosition(newWorldMatrix);
        this.camera.scale.setFromMatrixScale(newWorldMatrix);
        this.camera.quaternion.setFromRotationMatrix(newWorldMatrix);
        // Ensure camera matrices are up to date
        this.camera.updateMatrix();
        this.camera.updateWorldMatrix(true);

        this.camera.getWorldPosition(cameraWorldPos);
      } else {
        // Invalid, but update data
        this.portalData.get(portal.id).previousDot = dot;
        data.previousInRange = inRange;
      }
    }
  }
}

export default PortalTraveller;
