!function(){function e(e){return e&&e.__esModule?e.default:e}var t=("undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{}).parcelRequireeca4,r=t("6vfhM"),n=t("3zl6C"),a={};var c=function(e){var t=a[e];if(null==t)throw new Error("Could not resolve bundle with id "+e);return t};(function(e){for(var t=Object.keys(e),r=0;r<t.length;r++)a[t[r]]=e[t[r]]})(JSON.parse('{"39cdL":"scenes/portal-recursive.c960e6ca.js","23LtK":"portal_recursive.5598b4f6.json","3OHlw":"dark_grid.fa233325.png","iCKli":"scenes/portal-basic.2bd43395.js"}')),r(),n();var l=null;var o,i=function(){return l||(l=function(){try{throw new Error}catch(t){var e=(""+t.stack).match(/(https?|file|ftp):\/\/[^)\n]+/g);if(e)return(""+e[0]).replace(/^((?:https?|file|ftp):\/\/.+)\/[^/]+$/,"$1")+"/"}return"/"}()),l},f=c;function s(e){if(""===e)return".";var t="/"===e[e.length-1]?e.slice(0,e.length-1):e,r=t.lastIndexOf("/");return-1===r?".":t.slice(0,r)}function u(e,t){if(e===t)return"";var r=e.split("/");"."===r[0]&&r.shift();var n,a,c=t.split("/");for("."===c[0]&&c.shift(),n=0;(n<c.length||n<r.length)&&null==a;n++)r[n]!==c[n]&&(a=n);var l=[];for(n=0;n<r.length-a;n++)l.push("..");return c.length>a&&l.push.apply(l,c.slice(a)),l.join("/")}(o=function(e,t){return u(s(f(e)),f(t))})._dirname=s,o._relative=u;var d=e(i()+o("39cdL","23LtK")),p=e(i()+o("39cdL","3OHlw"));!function(){let e;function t(){requestAnimationFrame(t),e.update(),e.render()}n().setupScene(d,"main-canvas",(n=>{e=n,e.camera.position.set(0,6,6),e.camera.lookAt(new(r().Vector3)(0,0,0));const a=e.scene.getObjectByName("world");e.extractCollidablesFromObject(a),e.extractPortalsFromObject(a);const c=(new(r().TextureLoader)).load(p);c.wrapS=r().RepeatWrapping,c.wrapT=r().RepeatWrapping,c.repeat.set(10,10);const l=new(r().MeshStandardMaterial)({map:c});e.scene.getObjectByName("floor").material=l,t()}))}()}();
//# sourceMappingURL=portal-recursive.c960e6ca.js.map
