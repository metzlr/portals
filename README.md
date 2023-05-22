# portals

Recursive, interactable portals implemented using THREE.js

## <a href="https://metzlr.github.io/portals">Live Demo</a>

<img src="https://user-images.githubusercontent.com/54820894/116798303-09753700-aaa3-11eb-8848-f596891aec26.png" width="45%"></img>
<img src="https://user-images.githubusercontent.com/54820894/116798305-0b3efa80-aaa3-11eb-8c25-0187fd7f8212.png" width="45%"></img>

## How to use

All necessary code is in the `src` directory.

A scene using portals must be rendered with `PortalRender`, a custom wrapper around WebGLRenderer.

Portals are defined with the `Portal` class, which requires a mesh that will be used as the portal surface. The geometry of the mesh must be a plane. The mesh material can be anything since `Portal` replaces it with a different one regardless. To connect one portal to another, set the `destination` property to another portal.

Portal teleportation can be added by creating a new `PortalTraveller` object, passing the camera you want to be able to travel through portals.

For an example, see the SceneManager class used in the demo scenes:
[PortalSceneManager](demo/js/objects/PortalSceneManager.js)
