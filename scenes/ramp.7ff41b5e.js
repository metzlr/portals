!function(){function e(e){return e&&e.__esModule?e.default:e}var t=("undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{}).parcelRequireeca4,n=t("6vfhM"),r=t("3C9n1"),a={};var o=function(e){var t=a[e];if(null==t)throw new Error("Could not resolve bundle with id "+e);return t};(function(e){for(var t=Object.keys(e),n=0;n<t.length;n++)a[t[n]]=e[t[n]]})(JSON.parse('{"5XRmE":"scenes/ramp.7ff41b5e.js","3BKhV":"ramp.add82e03.json","1Hp3b":"dark_grid.fa233325.png","2vT1i":"scenes/portal-basic.9c19c9d0.js"}')),n(),r();var l=null;var i,c=function(){return l||(l=function(){try{throw new Error}catch(t){var e=(""+t.stack).match(/(https?|file|ftp):\/\/[^)\n]+/g);if(e)return(""+e[0]).replace(/^((?:https?|file|ftp):\/\/.+)\/[^/]+$/,"$1")+"/"}return"/"}()),l},f=o;function s(e){if(""===e)return".";var t="/"===e[e.length-1]?e.slice(0,e.length-1):e,n=t.lastIndexOf("/");return-1===n?".":t.slice(0,n)}function u(e,t){if(e===t)return"";var n=e.split("/");"."===n[0]&&n.shift();var r,a,o=t.split("/");for("."===o[0]&&o.shift(),r=0;(r<o.length||r<n.length)&&null==a;r++)n[r]!==o[r]&&(a=r);var l=[];for(r=0;r<n.length-a;r++)l.push("..");return o.length>a&&l.push.apply(l,o.slice(a)),l.join("/")}(i=function(e,t){return u(s(f(e)),f(t))})._dirname=s,i._relative=u;var d=e(c()+i("5XRmE","3BKhV")),p=e(c()+i("5XRmE","1Hp3b"));!function(){const e=document.getElementById("main-canvas");let t;function a(){requestAnimationFrame(a),t.update(),t.render()}(new(n().ObjectLoader)).load(d,(o=>{t=new(r().default)(e,o),t.camera.position.set(0,6,6),t.camera.lookAt(new(n().Vector3)(0,0,0));const l=t.scene.getObjectByName("world");t.extractCollidablesFromObject(l),t.extractPortalsFromObject(l);const i=(new(n().TextureLoader)).load(p);i.wrapS=n().RepeatWrapping,i.wrapT=n().RepeatWrapping,i.repeat.set(10,10);const c=new(n().MeshStandardMaterial)({map:i});t.scene.getObjectByName("floor").material=c,a()}))}()}();
//# sourceMappingURL=ramp.7ff41b5e.js.map