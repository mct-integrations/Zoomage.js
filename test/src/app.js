var Zoomage = require('../../dist/zoomage.min');

// Initialize the Zoomage.js
var zoomage = new Zoomage({
    container: document.getElementById('container'),
    maxZoom: 3,
    minZoom: 0.1,
    enableGestureRotate: true,
    enableDesktop: true,
    dbclickZoomThreshold: 0.2,
    onDrag: function(data) {
        console.log("[Drag Position X] " + data.x, "[Drag Position Y] " + data.y);
    },
    onZoom: function(data) {
        console.log("[Zoom Scale] " + data.zoom, "\n[Image Width] " + data.scale.width, "\n[Image Height] " + data.scale.height);
    },
    onRotate: function(data) {
        console.log("[Rotate Degree] " + data.rotate);
    }
});

// Load and display the image
zoomage.load("./scenery_image.jpg");