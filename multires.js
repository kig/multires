if (typeof MultiRes === 'undefined') {

    MultiRes = {};

    MultiRes.monitoredImages = [];
    MultiRes.uid = 0;
    MultiRes.imageIndex = {};
    MultiRes.initDone = false;

    MultiRes.getPhysicalImageSize = function(img, ratio, iw, ih) {
        var bb = img.getBoundingClientRect();
        var w = ratio * bb.width;
        var h = ratio * bb.height;
        var vw=0, vh=0, vtop=0, vleft=0;
        if (!(bb.right < 0 || bb.bottom < 0 || bb.left > iw || bb.top > ih)) {
            // visible
            vw = bb.width;
            vh = bb.height;
            vtop = 0;
            vleft = 0;
            if (bb.left < 0) {
                vw += bb.left;
                vleft -= bb.left;
                bb.left = 0;
            }
            if (bb.top < 0) {
                vh += bb.top;
                vtop -= bb.top;
                bb.top = 0;
            }
            if (bb.right > iw) {
                vw -= bb.right - iw;
                bb.right = iw;
            }
            if (bb.bottom > ih) {
                vh -= bb.bottom - ih;
                bb.bottom = ih;
            }
            vtop *= ratio;
            vleft *= ratio;
            vw *= ratio;
            vh *= ratio;
        }
        return {
            width : w,
            height : h,
            intersect : {top: vtop, left: vleft, width: vw, height: vh}
        };
    };

    MultiRes.stopMonitoring = function(img) {
        if (!this.imageIndex[img.__uid]) {
            return;
        }
        delete this.imageIndex[img.__uid];
        var idx = this.monitoredImages.indexOf(img);
        this.monitoredImages.splice(idx, 1);
    };

    MultiRes.startMonitoring = function(img) {
        if (this.imageIndex[img.__uid]) {
            return;
        }
        img.__uid = this.uid++;
        this.monitoredImages.push(img);
        this.imageIndex[img.__uid] = img;
    };

    MultiRes.load = function(img) {
        if (!/\.\d+\.mres\/\d+$/i.test(img.src)) {
            // Not a MultiRes image, skip it.
            return false;
        } else if (this.imageIndex[img.__uid] !== undefined) {
            // Already monitoring, skip it.
            return false;
        }
        img.__multiResSrc = img.src.split("/").slice(0,-1).join("/");
        var segs = img.src.split(".");
        img.__maxZ = parseInt(segs[segs.length-2]);
        this.startMonitoring(img);
        img.addEventListener('DOMNodeRemoved', function(ev) {
            if (ev.target === this) {
                MultiRes.stopMonitoring(this);
            }
        }, true);
        img.addEventListener('DOMNodeInserted', function(ev) {
            if (ev.target === this) {
                MultiRes.startMonitoring(this);
            }
        }, true);
        return true;
    };

    MultiRes.loadDeviceResolution = function(img, z) {
        if (z > img.__maxZ) {
            z = img.__maxZ;
        }
        var src = img.__multiResSrc + '/' + z;
        if (img.src !== src && 
            (!img.__loadingImage || img.__loadingImage.src !== src)) {
            if (!img.__loadingImage) {
                img.__loadingImage = new Image();
                img.__loadingImage.img = img;
                img.__loadingImage.onload = this.loadingImageLoaded;
            }
            img.__loadingImage.src = src;
        }
    };

    MultiRes.loadingImageLoaded = function(){
        this.img.src = this.src;
    };


    MultiRes.updateImages = function() {
        var iw = window.innerWidth;
        var ih = window.innerHeight;
        var ow = window.outerWidth;
        var oh = window.outerHeight;
        var dpr = window.devicePixelRatio || 1;
        var ratio = dpr * (ow/iw);
        if (isNaN(ratio)) {
            ratio = 1;
        }
        var i = 0;
        var needUpdate = false;
        for (i = 0; i < this.monitoredImages.length; i++) {
            needUpdate = false;
            var img = this.monitoredImages[i];
            var phySz = this.getPhysicalImageSize(img, ratio, iw, ih);
            if (img.deviceWidth !== phySz.width || 
                img.deviceHeight !== phySz.height)
            {
                img.deviceWidth = phySz.width;
                img.deviceHeight = phySz.height;
                needUpdate = true;
            }
            if (needUpdate) {
                var z = Math.ceil(
                    Math.log(Math.max(phySz.width, phySz.height)) / Math.LN2);
                this.loadDeviceResolution(img, z);
            }
        }
    };

    MultiRes.nodeInserted = function(ev) {
        if (ev.target.tagName == "IMG") {
            this.load(ev.target);
        }
    };

    MultiRes.requestUpdate = function() {
        if (this.updateTimeout !== null) {
            return;
        }
        this.updateTimeout = setTimeout(this.updater, 100);
    };

    MultiRes.updater = (function() {
        this.updateTimeout = null;
        this.updateImages();
    }).bind(MultiRes);


    MultiRes.init = function() {
        if (this.initDone) {
            return;
        }
        this.initDone = true;
        var i = 0;
        for (i = 0; i < document.images.length; i++) {
            this.load(document.images[i]);
        }
        this.updateTimeout = null;
        window.addEventListener('DOMNodeInserted', 
                                this.nodeInserted.bind(this), 
                                true);
        window.addEventListener('resize', this.requestUpdate.bind(this), true);
        window.addEventListener('scroll', this.requestUpdate.bind(this), true);
        this.updateImages();
    };

    MultiRes.init();

}