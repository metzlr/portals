!function(){function e(e){return e&&e.__esModule?e.default:e}var t=("undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{}).parcelRequireeca4,n=t("6vfhM"),r=t("3zl6C"),a={};var l=function(e){var t=a[e];if(null==t)throw new Error("Could not resolve bundle with id "+e);return t};(function(e){for(var t=Object.keys(e),n=0;n<t.length;n++)a[t[n]]=e[t[n]]})(JSON.parse('{"5wRCb":"scene-pages/house.07185f33.js","2t8ta":"house.e9c987ba.json","3OHlw":"dark_grid.fa233325.png","iCKli":"scene-pages/portal-basic.2bd43395.js"}')),n(),r();var o=null;var c,i=function(){return o||(o=function(){try{throw new Error}catch(t){var e=(""+t.stack).match(/(https?|file|ftp):\/\/[^)\n]+/g);if(e)return(""+e[0]).replace(/^((?:https?|file|ftp):\/\/.+)\/[^/]+$/,"$1")+"/"}return"/"}()),o},f=l;function s(e){if(""===e)return".";var t="/"===e[e.length-1]?e.slice(0,e.length-1):e,n=t.lastIndexOf("/");return-1===n?".":t.slice(0,n)}function u(e,t){if(e===t)return"";var n=e.split("/");"."===n[0]&&n.shift();var r,a,l=t.split("/");for("."===l[0]&&l.shift(),r=0;(r<l.length||r<n.length)&&null==a;r++)n[r]!==l[r]&&(a=r);var o=[];for(r=0;r<n.length-a;r++)o.push("..");return l.length>a&&o.push.apply(o,l.slice(a)),o.join("/")}(c=function(e,t){return u(s(f(e)),f(t))})._dirname=s,c._relative=u;var p=e(i()+c("5wRCb","2t8ta")),d=e(i()+c("5wRCb","3OHlw"));!function(){let e;function t(){requestAnimationFrame(t),e.update(),e.render()}r().setupScene(p,"main-canvas",(r=>{e=r,e.camera.position.set(0,6,8),e.camera.lookAt(new(n().Vector3)(0,0,0));const a=e.scene.getObjectByName("world");e.extractCollidablesFromObject(a),e.extractPortalsFromObject(a);const l=(new(n().TextureLoader)).load(d);l.wrapS=n().RepeatWrapping,l.wrapT=n().RepeatWrapping,l.repeat.set(10,10);const o=new(n().MeshStandardMaterial)({map:l});e.scene.getObjectByName("floor").material=o,t()}))}()}();
//# sourceMappingURL=house.07185f33.js.map
