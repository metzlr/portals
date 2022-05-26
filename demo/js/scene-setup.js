import * as THREE from "three";
import PortalSceneManager from "./objects/PortalSceneManager";
import { WebGLIncompatibilityError } from "../../src/CustomErrors";

const setupScene = (jsonUrl, canvasId, onSuccess) => {
  const canvas = document.getElementById(canvasId);
  if (canvas === null) {
    displayError(`Unable to find canvas with ID: ${canvasId}`);
    return;
  }

  const loader = new THREE.ObjectLoader();
  loader.load(
    jsonUrl,
    (sceneObj) => {
      try {
        const manager = new PortalSceneManager(canvas, sceneObj);
        onSuccess(manager);
      } catch (error) {
        console.log(error);
        if (error instanceof WebGLIncompatibilityError) {
          displayError(
            "Looks like your browser doesn't support WebGL2 yet. Try visiting this page in the latest version of Chrome or Firefox."
          );
        } else {
          throw error;
        }
      }
    },
    undefined,
    (error) => {
      displayError("Failed to load scene data: " + error);
    }
  );
};

const errorHtml = `
  <div class="error-container">
    <h2>Whoops...</h2>
    <p id="error-message">Unknown error</p>
  </div>  
`;

const displayError = (message) => {
  console.error(message);
  document.body.innerHTML = errorHtml;
  const messageElement = document.getElementById("error-message");
  messageElement.innerText = message;
};

export { setupScene };
