/*
=================================
img-touch-canvas - v0.1
http://github.com/rombdn/img-touch-canvas

Zoomage.js - v1.1.0 (Latest)
https://github.com/Becavalier/Zoomage.js

(c) 2013 Romain BEAUDON
This code may be freely distributed under the MIT License.

(c) 2016 YHSPY
This code may be freely distributed under the MIT License.
=================================
*/

let Zoomage = function(options) {
    if (!options || !options.container) {
        throw '[Zoomage.js Error] Zoomage constructor: missing arguments [container].';
    }

    // set container and canvas;
    this.container             = options.container; 
    this.canvas                = document.createElement('canvas');

    // append the canvas;
    this.container.appendChild(this.canvas);
    
    // get canvas context;
    this.context               = this.canvas.getContext('2d');

    // get callback method;
    this.onZoom                = options.onZoom || null;
    this.onRotate              = options.onRotate || null;
    this.onDrag                = options.onDrag || null;

    // save current context;
    this.context.save();

    // get settings;
    this.dbclickZoomThreshold  = Math.abs(options.dbclickZoomThreshold) || 0.1;

    this.maxZoom               = Math.abs(options.maxZoom) || 2;
    this.minZoom               = Math.abs(options.minZoom) || 0.2;

    // whether turn on the switcher of gesture rotate;
    this.enableGestureRotate   = options.enableGestureRotate || false;
    // whether support this feature on desktop version;
    this.enableDesktop         = options.enableDesktop || false;

    // default settings;
    this.imgTexture            = new Image();

    // global flag;
    this.isImgLoaded           = false;

    this.isFirstTimeLoad       = true;

    this.lastZoomScale         = null;

    this.lastX                 = null;
    this.lastY                 = null;

    this.zoomD                 = 1;

    this.mdown                 = false; 

    this.lastTouchEndTimestamp = null;
    this.lastTouchEndObject    = null;

    this.animateHandle         = null;

    this.dbclickZoomToggle     = true; 

    // setting 'requestforanimate';
    this._checkRequestAnimationFrame();
    
    // set listeners;
      if ('transform' in document.body.style) {
          this.prefixedTransform = 'transform';
      } else if ('webkitTransform' in document.body.style) {
          this.prefixedTransform = 'webkitTransform';
      }

      this._setEventListenersTransform();
      requestAnimationFrame(this._animateTransform.bind(this));
};

// set initialized canvas scale;
Zoomage.prototype = {
    _animateTransform: function() {
        // zoom scale restriction;
        if (this.zoomD > this.maxZoom) {
            this.zoomD = this.maxZoom;
        } else if (this.zoomD < this.minZoom) {
            this.zoomD = this.minZoom;
        }

        if (this.isImgLoaded)
            this.canvas.style[this.prefixedTransform] = 'translate(' + this.moveXD + 'px,' + this.moveYD + 'px) translateZ(0) scale(' + this.zoomD + ') rotate(' + this.rotate.angle + 'deg)';
        
        if (this.isFirstTimeLoad && this.isImgLoaded) {
            this.context.drawImage(
                this.imgTexture, 
                this.position.x, this.position.y, 
                this.scale.x * this.imgTexture.width, 
                this.scale.y * this.imgTexture.height);

            this.isFirstTimeLoad = false;
        }

        requestAnimationFrame(this._animateTransform.bind(this));
    },
    _animateCanvas: function() {
        if (this.imgTexture.src === null) {
            return;
        }

        if (this.isOnTouching || this.mdown) {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.context.restore();
            this.context.save();
        }
        
        if ((this.isOnTouching || this.isFirstTimeLoad || this.mdown) && this.isImgLoaded) {
            this.context.drawImage(
                this.imgTexture, 
                this.position.x, this.position.y, 
                this.scale.x * this.imgTexture.width, 
                this.scale.y * this.imgTexture.height);

            this.isFirstTimeLoad = false;
        } 
        requestAnimationFrame(this._animateCanvas.bind(this));
    },
    _gesturePinchZoom: function(touches) {
        let zoom = false;

        if (touches.length >= 2) {
            let p1 = touches[0],
                p2 = touches[1];

            let zoomScale = Math.sqrt(Math.pow(p2.pageX - p1.pageX, 2) + Math.pow(p2.pageY - p1.pageY, 2)); 

            if (this.lastZoomScale) {
                zoom = zoomScale - this.lastZoomScale;
            }

            this.lastZoomScale = zoomScale;
        }    

        return zoom;
    },
    _enableGestureRotate: function(touches) {
        let rotate = false;
        if (touches.length >= 2) {
            var p1 = touches[0],
                p2 = touches[1];

            let x = p2.pageX - p1.pageX,
                y = p2.pageY - p1.pageY;

            // !!! [NEED TO FIX] (If you continuously rotating more than 180 degree, here will cause a bug);
            var rotateAngel = Math.atan2(y, x) * 180 / Math.PI;
        }  

        rotate = {
            o: p1,
            a: rotateAngel
        };

        return rotate;
    },
    _doZoom: function(zoom) {
        if (!zoom) return;

        // get new scale;
        let currentScale   = this.scale.x,
            newScale       = this.scale.x + zoom;
        
        // get increasing width and height;
        let deltaScale     = newScale - currentScale,
            deltaWidth     = this.imgTexture.width * deltaScale,
            deltaHeight    = this.imgTexture.height * deltaScale;

        let newPosX        = this.position.x - deltaWidth / 2,
            newPosY        = this.position.y - deltaHeight / 2;

        // zoom restriction;
        if (newScale > this.maxZoom || newScale < this.minZoom) {
            return false;
        }

        // adjust scale and position;
        this.scale.x       = newScale;
        this.scale.y       = newScale;
        this.position.x    = newPosX;
        this.position.y    = newPosY;

        this.isOnTouching  = true;

        this.zoomD         = newScale;

        this._runCallback('onZoom');

        return true;
    },
    _doMove: function(relativeX, relativeY) {
        if (this.lastX && this.lastY) {
            let deltaX = relativeX - this.lastX,
                deltaY = relativeY - this.lastY;

            this.position.x += deltaX;
            this.position.y += deltaY;
        }

        this.lastX = relativeX;
        this.lastY = relativeY;
    },
    _doRotate: function(rotateArr) {
      if ( this.enableGestureRotate ) {
        if (this.lastTouchRotateAngle !== null) {
            this.rotate.angle = this.rotate.angle + 1.5 * (rotateArr.a - this.lastTouchRotateAngle);
            this.rotate.center = rotateArr.o;
        }

        this.lastTouchRotateAngle = rotateArr.a;

        this._runCallback('onRotate');
      }
    },  
    _zoomInAnimCanvas: function() {
        let zoomThreshold = this.dbclickZoomLength / 10 * 2;

        if (this.dbclickZoomLength > 0.01) {
            if (!this._doZoom(zoomThreshold)) {
                cancelAnimationFrame(t);
                return false;
            }
            this.dbclickZoomLength = this.dbclickZoomLength - zoomThreshold;
            this.animateHandle = requestAnimationFrame(this._zoomInAnimCanvas.bind(this));
        } else {
            cancelAnimationFrame(this.animateHandle);
        }

        return true;
    },
    _zoomOutAnimCanvas: function() {
        let zoomThreshold = this.dbclickZoomLength / 10 * 2;

        if (this.dbclickZoomLength > 0.01) {
            if (!this._doZoom(-zoomThreshold)) {
                cancelAnimationFrame(t);
                return false;
            }
            this.dbclickZoomLength = this.dbclickZoomLength - zoomThreshold;
            this.animateHandle = requestAnimationFrame(this._zoomOutAnimCanvas.bind(this));
        } else {
            cancelAnimationFrame(this.animateHandle);
        }

        return true;
    },
    _zoomInAnimTransform: function() {
        let zoomThreshold = this.dbclickZoomLength / 10 * 2;

        if (this.dbclickZoomLength > 0.01) {
            this.zoomD += zoomThreshold;
            this.dbclickZoomLength = this.dbclickZoomLength - zoomThreshold;
            this.animateHandle = requestAnimationFrame(this._zoomInAnimTransform.bind(this));
        } else {
            cancelAnimationFrame(this.animateHandle);
        }

        return true;
    },

    _zoomOutAnimTransform: function() {
        let zoomThreshold = this.dbclickZoomLength / 10 * 2;

        if (this.dbclickZoomLength > 0.01) {
            this.zoomD -= zoomThreshold;
            this.dbclickZoomLength = this.dbclickZoomLength - zoomThreshold;
            this.animateHandle = requestAnimationFrame(this._zoomOutAnimTransform.bind(this));
        } else {
            cancelAnimationFrame(this.animateHandle);
        }

        return true;
    },
    _gestureDbClick: function(e, callback) {
        let touch = e.changedTouches[0];

        if (this.lastTouchEndTimestamp === null || this.lastTouchEndObject === null) {
            this.lastTouchEndTimestamp = Math.round(new Date().getTime());
            this.lastTouchEndObject = touch;
        } else {
            let currentTimestamp = Math.round(new Date().getTime());
            if (currentTimestamp - this.lastTouchEndTimestamp < 300) {
                if (Math.abs(this.lastTouchEndObject.pageX - touch.pageX) < 20 &&
                    Math.abs(this.lastTouchEndObject.pageY - touch.pageY < 20)) {

                    callback && callback();
                }
            }

            this.lastTouchEndTimestamp = currentTimestamp;
            this.lastTouchEndObject = touch;
        }
    },
    _runCallback: function(flag, arg) {
        switch(flag) {
            case 'onDrag':
            if (this._type(this.onDrag) === 'function') {
                this.onDrag.call(this, { 
                    x: this.lastX.toFixed(3),
                    y: this.lastY.toFixed(3)
                });
            }
            break;

            case 'onRotate':
            if (this._type(this.onRotate) === 'function') {
                this.onRotate.call(this, { 
                    rotate: (this.rotate.angle % 360).toFixed(3)
                });
            }
            break;

            case 'onZoom':
            if (this._type(this.onZoom) === 'function') {
                this.onZoom.call(this, {
                    zoom: this.zoomD.toFixed(3), 
                    scale: {
                        width: (this.zoomD * this.imgTexture.width).toFixed(3) ,
                        height: (this.zoomD * this.imgTexture.height).toFixed(3)
                    }
                });
            }
            break;
        }
    },
    _setEventListenersTransform: function() {
        this.container.addEventListener('touchend', function(e) {
            this.lastZoomScale         = null;
            this.lastTouchRotateAngle  = null;

            // this event will be conflicted with the system event 'dblclick', so disable it when 'enableDesktop' enabled;
            if (!this.enableDesktop) {
                this._gestureDbClick(e, function() {
                    this.dbclickZoomLength = this.dbclickZoomThreshold;

                    if (this.dbclickZoomToggle) {
                        if (!this._zoomInAnimTransform()) {
                            this._zoomOutAnimTransform();
                        }
                    } else {
                        if (!this._zoomOutAnimTransform()) {
                            this._zoomInAnimTransform();
                        }
                    }

                    this.dbclickZoomToggle = !this.dbclickZoomToggle;
                }.bind(this));
            }     
        }.bind(this));

        this.container.addEventListener('touchstart', function(e) {
            this.lastX = null;
            this.lastY = null;
        }.bind(this));

        this.container.addEventListener('touchmove', function(e) {
            e.preventDefault();

            // use e.touches instead of e.targetTouches;
            if (e.touches.length == 2) { 
                // zoom; 
                this.zoomD = this.zoomD + this._gesturePinchZoom(e.touches) / 250;

                // callback [onZoom];
                this._runCallback('onZoom');

                // rotate;
                if ( this.enableGestureRotate ) {
                  this._doRotate(this._enableGestureRotate(e.touches));
                }
            } else if (e.touches.length == 1) {
                // just drag;
                if (this.lastX !== null && this.lastY !== null) {
                    this.moveXD += (e.touches[0].pageX - this.lastX);
                    this.moveYD += (e.touches[0].pageY - this.lastY);
                }
                this.lastX = e.touches[0].pageX;
                this.lastY = e.touches[0].pageY;
                this._runCallback('onDrag');
            }
        }.bind(this));

        this.imgTexture.addEventListener('load', function(e) {
            this.moveXD               = 0;
            this.moveYD               = 0;
            this.zoomD                = 1;

            this.lastTouchRotateAngle = null;
            // current rotate info (center, angle - abs);
            this.rotate               = {
                center: {},
                angle: 0
            };

            // initail scale;
            this.canvas.width   = this.imgTexture.width;
            this.canvas.height  = this.imgTexture.height;

            this.canvas.setAttribute('width', this.imgTexture.width + 'px');
            this.canvas.setAttribute('height', this.imgTexture.height + 'px');

            this.moveXD = (this.canvas.parentNode.clientWidth - this.imgTexture.width) / 2;
            this.moveYD = (this.canvas.parentNode.clientHeight - this.imgTexture.height) / 2;

            if ( (this.canvas.parentNode.clientWidth < this.imgTexture.width) || (this.canvas.parentNode.clientWidth < this.imgTexture.width) ) {
              if ( ( this.canvas.parentNode.clientWidth / this.imgTexture.width ) > ( this.canvas.parentNode.clientHeight / this.imgTexture.height ) ) {
                this.zoomD = this.canvas.parentNode.clientHeight / this.imgTexture.height;
              } else {
                this.zoomD = this.canvas.parentNode.clientWidth / this.imgTexture.width;
              }

              this.moveXD = -this.imgTexture.width * (1 - this.zoomD) / 2;
              this.moveYD = -this.imgTexture.height * (1 - this.zoomD) / 2;

              if ( this.canvas.parentNode.clientWidth < this.imgTexture.width ) {
                this.moveXD = (this.canvas.parentNode.clientWidth - this.zoomD * this.imgTexture.width) / 2 - this.imgTexture.width * (1 - this.zoomD) / 2;
              }
              if ( this.canvas.parentNode.clientHeight < this.imgTexture.height ) {
                this.moveYD = (this.canvas.parentNode.clientHeight - this.zoomD * this.imgTexture.height) / 2 - this.imgTexture.height * (1 - this.zoomD) / 2;
              }
            }

            this.isImgLoaded = true;
        }.bind(this));
        
        // support desktop?
        if (this.enableDesktop) {
            window.addEventListener('keyup', function(e) {
                if (e.keyCode == 187) { 
                    this.zoomD += 0.1;
                } else if (e.keyCode == 189) {
                    this.zoomD -= 0.1;
                }

                if (e.keyCode == 187 || e.keyCode == 189) {
                    this._runCallback('onZoom');
                }
            }.bind(this));

            window.addEventListener('mousedown', function(e) {
                this.mdown = true;
                this.lastX = null;
                this.lastY = null;
            }.bind(this));

            window.addEventListener('mouseup', function(e) {
                this.mdown = false;
            }.bind(this));

            window.addEventListener('mousemove', function(e) {
                if (this.mdown) {
                    if (this.lastX !== null && this.lastY !== null) {
                        this.moveXD += (e.pageX - this.lastX);
                        this.moveYD += (e.pageY - this.lastY);
                    }

                    this.lastX = e.pageX;
                    this.lastY = e.pageY;

                    this._runCallback('onDrag');
                }
            }.bind(this));

            window.addEventListener('dblclick', function(e) {      
                this.dbclickZoomLength = this.dbclickZoomThreshold;

                if (this.dbclickZoomToggle) {
                    if (!this._zoomInAnimTransform()) {
                        this._zoomOutAnimTransform();
                    } 
                } else {
                    if (!this._zoomOutAnimTransform()) {
                        this._zoomInAnimTransform();
                    }
                }

                this.dbclickZoomToggle = !this.dbclickZoomToggle;
            }.bind(this));
        }
    },
    _setEventListenersCanvas: function() {
        // 'bind()' is not supported in IE6/7/8;
        this.canvas.addEventListener('touchend', function(e) {
            this.isOnTouching  = false;
            this.lastZoomScale = null;

            // this event will be conflicted with the system event 'dblclick', so disable it when 'enableDesktop' enabled;
            if (!this.enableDesktop) {
                this._gestureDbClick(e, function() {
                    // zoom!
                    this.dbclickZoomLength = this.dbclickZoomThreshold;

                    if (this.dbclickZoomToggle) {
                        if (!this._zoomInAnimCanvas()) {
                            this._zoomOutAnimCanvas();
                        }
                    } else {
                        if (!this._zoomOutAnimCanvas()) {
                            this._zoomInAnimCanvas();
                        }
                    }

                    this.dbclickZoomToggle = !this.dbclickZoomToggle;
                }.bind(this));
            }
        }.bind(this));

        this.canvas.addEventListener('touchstart', function(e) {
            this.isOnTouching   = true;

            this.lastX          = null;
            this.lastY          = null;
        }.bind(this));

        this.canvas.addEventListener('touchmove', function(e) {
            e.preventDefault();
            
            if (e.targetTouches.length == 2) { 
                this._doZoom(this._gesturePinchZoom(e.targetTouches) / 250);
            } else if (e.targetTouches.length == 1) {
                let relativeX = e.targetTouches[0].pageX - this.canvas.getBoundingClientRect().left,
                    relativeY = e.targetTouches[0].pageY - this.canvas.getBoundingClientRect().top; 

                this._doMove(relativeX, relativeY);

                this._runCallback('onDrag');   
            }
        }.bind(this));

        this.imgTexture.addEventListener('load', function(e) {
            this.isOnTouching          = false;

            this.lastTouchEndTimestamp = null;
            this.lastTouchEndObject    = null;

            this.dbclickZoomLength     = 0;

            if (this.imgTexture.width && this.imgTexture.height) {
                let scaleRatio = 1;

                if (this.imgTexture.width > this.imgTexture.height) {
                    if (this.canvas.clientWidth < this.imgTexture.width) {
                        scaleRatio = this.canvas.clientWidth / this.imgTexture.width;
                        this.position.y = (this.canvas.clientHeight - scaleRatio * this.imgTexture.height) / 2;
                    } else {
                        this.position.x = (this.canvas.clientWidth - this.imgTexture.width) / 2;
                        this.position.y = (this.canvas.clientHeight - this.imgTexture.height) / 2;
                    }
                } else {
                    if (this.canvas.clientWidth < this.imgTexture.width) {
                        scaleRatio = this.canvas.clientHeight / this.imgTexture.height;
                        this.position.x = (this.canvas.clientWidth - scaleRatio * this.imgTexture.width) / 2;
                    } else {
                        this.position.x = (this.canvas.clientWidth - this.imgTexture.width) / 2;
                        this.position.y = (this.canvas.clientHeight - this.imgTexture.height) / 2;
                    }
                }

                this.scale.x = scaleRatio;
                this.scale.y = scaleRatio;
            }

            this.isImgLoaded = true;
        }.bind(this));

        if (this.enableDesktop) {
            window.addEventListener('keyup', function(e) {
                if (e.keyCode == 187) { 
                    this._doZoom(0.05);
                }
                else if (e.keyCode == 189) {
                    this._doZoom(-0.05);
                }
            }.bind(this));

            window.addEventListener('mousedown', function(e) {
                this.mdown = true;
                this.lastX = null;
                this.lastY = null;
            }.bind(this));

            window.addEventListener('mouseup', function(e) {
                this.mdown = false;
            }.bind(this));

            window.addEventListener('mousemove', function(e) {
                let relativeX = e.pageX - this.canvas.getBoundingClientRect().left,
                    relativeY = e.pageY - this.canvas.getBoundingClientRect().top;

                if (e.target == this.canvas && this.mdown) {
                    this._doMove(relativeX, relativeY);
                }

                if (relativeX <= 0 || relativeX >= this.canvas.clientWidth || relativeY <= 0 || relativeY >= this.canvas.clientHeight) {
                    this.mdown = false;
                }

                this.mdown && this._runCallback('onDrag');
            }.bind(this));

            window.addEventListener('dblclick', function(e) {
                // zoom!
                this.dbclickZoomLength = this.dbclickZoomThreshold;

                if (this.dbclickZoomToggle) {
                    if (!this._zoomInAnimCanvas()) {
                        this._zoomOutAnimCanvas();
                    }
                } else {
                    if (!this._zoomOutAnimCanvas()) {
                        this._zoomInAnimCanvas();
                    }
                }

                this.dbclickZoomToggle = !this.dbclickZoomToggle;
            }.bind(this));
        }
    },
    _type: function(obj) {
        let class2type = {},
            toString = class2type.toString;

        class2type['[object Function]'] = 'function';

        if (obj == null) {
            return obj + '';
        }

        // support: Android<4.0, iOS<6 (functionish RegExp);
        return typeof obj === 'object' || typeof obj === 'function' ?
            class2type[ toString.call( obj ) ] || 'object' :
            typeof obj;
    },
    _checkRequestAnimationFrame: function() {
        let lastTime = 0;
        let vendors = ['ms', 'moz', 'webkit', 'o'];
        for (let x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
            window.cancelAnimationFrame  = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
        }

        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = function(callback, element) {
                let currTime   = new Date().getTime();
                let timeToCall = Math.max(0, 16 - (currTime - lastTime));
                let id         = window.setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);
                lastTime       = currTime + timeToCall;
                return id;
            };
        }

        if (!window.cancelAnimationFrame) {
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
        }
    },
    // public functions;
    zoom: function(zoom) {
        this.dbclickZoomLength = Math.abs(zoom);

        if (this.enableGestureRotate) {
            zoom > 0 ? this._zoomInAnimTransform() : this._zoomOutAnimTransform();
        } else {
            zoom > 0 ? this._zoomInAnimCanvas() : this._zoomOutAnimCanvas();
        }
    },
    load: function(path) {
        // clear screen;
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // reset flags;
        this.position = {
            x: 0,
            y: 0
        };

        this.scale = {
            x: 1,
            y: 1
        };

        this.isImgLoaded           = false;

        this.isFirstTimeLoad       = true;

        this.lastZoomScale         = null;

        this.lastX                 = null;
        this.lastY                 = null;

        this.mdown                 = false; 

        this.lastTouchEndTimestamp = null;
        this.lastTouchEndObject    = null;

        // replace image path;
        this.imgTexture.src = path;
    }
};

export default Zoomage;
