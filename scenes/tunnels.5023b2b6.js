!function(){function e(e){return e&&e.__esModule?e.default:e}var n=("undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{}).parcelRequireeca4,t=n("6vfhM"),r=n("3zl6C"),l={};var a=function(e){var n=l[e];if(null==n)throw new Error("Could not resolve bundle with id "+e);return n};(function(e){for(var n=Object.keys(e),t=0;t<n.length;t++)l[n[t]]=e[n[t]]})(JSON.parse('{"74mqQ":"scenes/tunnels.5023b2b6.js","5A1gJ":"tunnels.eb76dfd7.json","iCKli":"scenes/portal-basic.2bd43395.js"}')),t(),r();var f=null;var i,o=function(){return f||(f=function(){try{throw new Error}catch(n){var e=(""+n.stack).match(/(https?|file|ftp):\/\/[^)\n]+/g);if(e)return(""+e[0]).replace(/^((?:https?|file|ftp):\/\/.+)\/[^/]+$/,"$1")+"/"}return"/"}()),f},c=a;function s(e){if(""===e)return".";var n="/"===e[e.length-1]?e.slice(0,e.length-1):e,t=n.lastIndexOf("/");return-1===t?".":n.slice(0,t)}function u(e,n){if(e===n)return"";var t=e.split("/");"."===t[0]&&t.shift();var r,l,a=n.split("/");for("."===a[0]&&a.shift(),r=0;(r<a.length||r<t.length)&&null==l;r++)t[r]!==a[r]&&(l=r);var f=[];for(r=0;r<t.length-l;r++)f.push("..");return a.length>l&&f.push.apply(f,a.slice(l)),f.join("/")}(i=function(e,n){return u(s(c(e)),c(n))})._dirname=s,i._relative=u;var d=e(o()+i("74mqQ","5A1gJ"));!function(){let e;function n(){requestAnimationFrame(n),e.update(),e.render()}r().setupScene(d,"main-canvas",(r=>{e=r,e.camera.position.set(0,6,6),e.camera.lookAt(new(t().Vector3)(0,0,0));const l=e.scene.getObjectByName("world");e.extractCollidablesFromObject(l),e.extractPortalsFromObject(l),n()}))}()}();
//# sourceMappingURL=tunnels.5023b2b6.js.map
