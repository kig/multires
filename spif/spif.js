SPIF = {};

SPIF.create = function(img) {
    var w = img.width;
    var h = img.height;
    var larger = Math.max(w,h);
    var idim = larger;
    var canvas = document.createElement('canvas');
    var pc = document.createElement('canvas');
    pc.width = w;
    pc.height = h;
    var ctx = canvas.getContext('2d');
    var pctx = pc.getContext('2d');
    pctx.drawImage(img, 0, 0, w, h);
    var mipmap = [];
    while (larger >= 64 || (w == img.width && h == img.height)) {
	canvas.width = w;
	canvas.height = h;
	ctx.drawImage(pc, 0, 0, w, h);
	if (larger > 256 || larger < 32 || larger / idim > 0.4) {
	    mipmap.unshift({width: w, height: h, data: atob(canvas.toDataURL('image/jpeg').slice(23))});
	    console.log(w, h, mipmap[0].data.length);
	}
	var tmp = canvas;
	canvas = pc;
	pc = tmp;
	tmp = ctx;
	ctx = pctx;
	pctx = tmp;
	if (w > 1) {
	    w >>= 1;
	}
	if (h > 1) {
	    h >>= 1;
	}
	larger >>= 1;
    }
    if (larger > 32) {
	canvas.width = Math.ceil(32*img.width/idim);
	canvas.height = Math.ceil(32*img.height/idim);
	ctx.drawImage(pc, 0, 0, canvas.width, canvas.height);
	mipmap.unshift({width: canvas.width, height: canvas.height, data: atob(canvas.toDataURL('image/jpeg').slice(23))});
	console.log(canvas.width, canvas.height, mipmap[0].data.length);
    }
    var off = 0;
    var ds = new DataStream();
    ds.writeString("SPIF");
    ds.writeUint32(0x00000001);
    ds.writeUint32(mipmap.length);
    for (var i=0; i<mipmap.length; i++) {
	var m = mipmap[i];
	ds.writeUint16(m.width);
	ds.writeUint16(m.height);
	ds.writeUint32(off+12+mipmap.length*12);
	ds.writeUint32(m.data.length);
	off += m.data.length;
    }
    for (i=0; i<mipmap.length; i++) {
	ds.writeString(mipmap[i].data);
    }
    var segs = img.src.split("/");
    ds.save(segs[segs.length-1].split(".")[0] + ".spif");
};

SPIF.createObjectURL = function(blob) {
    return (window.URL || window.webkitURL).createObjectURL(blob);
};

SPIF.revokeObjectURL = function(url) {
    return (window.URL || window.webkitURL).revokeObjectURL(url);
};

SPIF.createBlob = function(buffer) {
    var blob;
    try {
	blob = new Blob([new Uint8Array(buffer)]);
    } catch(e) {
	var bb = new (window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder)();
	bb.append(buffer);
	blob = bb.getBlob();
    }
    return blob;
};

SPIF.testBlobURLs = function() {
    var blob = SPIF.createBlob(new ArrayBuffer(10));
    var url = SPIF.createObjectURL(blob);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    SPIF.revokeObjectURL(url);
    return xhr.responseText.length == 10;
};

SPIF.createURL = function(buf) {
    if (window.Blob && (window.URL || window.webkitURL) && SPIF.testBlobURLs()) {
	var blob = SPIF.createBlob(buf);
	return SPIF.createObjectURL(blob);
    } else {
	return 'data:image/jpeg;base64,'+btoa(new DataStream(buf).readString(buf.byteLength));
    }
};

SPIF.revokeURL = function(url) {
    if (window.Blob && (window.URL || window.webkitURL)) {
	SPIF.revokeObjectURL(url);
    }
};

SPIF.showImage = function(img, buffer, offsets) {
    var ab;
    if (buffer.slice) {
	ab = buffer.slice(offsets.start, offsets.length+offsets.start); 
    } else {
	var u8 = new Uint8Array(buffer, offsets.start, offsets.length);
	var dst = new Uint8Array(u8.length);
	dst.set(u8);
	ab = dst.buffer;
    }
    var url = SPIF.createURL(ab);
    img.src = url;
    img.addEventListener('load', function() {
	SPIF.revokeURL(url);
    }, true);
};

SPIF.parseHeader = function(ab) {    
    var ds = new DataStream(ab);
    var s;
    try {
	var tag = ds.readString(4);
	var tag2 = ds.readUint32();
	if (tag !== 'SPIF' || tag2 !== 1) {
	    return false;
	}
	s = ds.readStruct([
	    'imgCount', 'uint32',
	    'imgs', ['[]', [
		'width', 'uint16',
		'height', 'uint16',
		'start', 'uint32',
		'length', 'uint32'
	    ], 'imgCount']
	]);
    } catch(e) {}
    var orig = s.imgs[s.imgs.length-1];
    SPIF.log('original image size: '+orig.width+'x'+orig.height);
    return s.imgs;
};

SPIF.alreadyLoaded = function(ev, offsets) {
    return ev.loaded >= offsets.start + offsets.length;
};

SPIF.getHeaderImage = function(header, wantedSize) {
    var himg = null;
    for (var i=0; i<header.length; i++) {
	himg = header[i];
	if (himg.width >= wantedSize.width && himg.height >= wantedSize.height) {
	    break;
	}
    }
    return himg;
};

SPIF.getLargestLoaded = function(header, ev) {
    var himg = null;
    for (var i=0; i<header.length; i++) {
	himg = header[i];
	if (himg.start + himg.length > ev.loaded) {
	    break;
	}
    }
    return header[i-1];
};

SPIF.getWantedImageSize = function(img) {
    var w = (window.devicePixelRatio || 1) * (window.outerWidth/window.innerWidth) * img.width;
    var h = (window.devicePixelRatio || 1) * (window.outerWidth/window.innerWidth) * img.height;
    if (isNaN(w)) {
	w = img.width;
    }
    if (isNaN(h)) {
	h = img.height;
    }
    return {
	width : w,
	height : h
    };
};

SPIF.LOG_TO_CONSOLE = false;
SPIF.LOG_TO_PAGE = false;

SPIF.log = function(msg) {
    if (SPIF.LOG_TO_CONSOLE && window.console) {
	console.log.apply(console, arguments);
    }
    if (SPIF.LOG_TO_PAGE) {
	var arr = [];
	for (var i=0; i<arguments.length; i++) {
	    arr.push(arguments[i]);
	}
	var elem = document.createElement('pre');
	elem.appendChild(document.createTextNode(arr.join(" ")+"\n"));
	(document.getElementById('log') || document.body).appendChild(elem);
    }
};

SPIF.load = function(img) {
    if (!img.dataset || !img.dataset.src || (!/\.spif$/i.test(img.dataset.src) && !img.getAttribute('spif'))) {
	// Not a SPIF image, skip it.
	return false;
    }
    var wantedSize = SPIF.getWantedImageSize(img);
    SPIF.log('img size in layout pixels: '+img.width+'x'+img.height);
    SPIF.log('img size in screen pixels: '+Math.ceil(wantedSize.width)+'x'+Math.ceil(wantedSize.height));
    var xhr = new XMLHttpRequest();
    //xhr.responseType = 'arraybuffer';
    var header = null;
    var done = false;
    var lastWidth = 0;
    xhr.onprogress = xhr.onload = function(ev) {
	if (!xhr.responseText || done) {
	    return;
	}
	var ds = new DataStream();
	if (!header) {
	    SPIF.log('reading header');
	    ds.writeString(xhr.responseText);
	    header = SPIF.parseHeader(ds.buffer);
	    SPIF.log('got header with', header.length, 'entries');
	    SPIF.log('total file size', ev.total);
	}
	if (header) {
	    var himg = SPIF.getHeaderImage(header, wantedSize);
	    if (SPIF.alreadyLoaded(ev, himg)) {
		SPIF.log('loaded target size: '+himg.width+'x'+himg.height);
		if (ds.byteLength === 0) {
		    ds.writeString(xhr.responseText);
		}
		SPIF.log('stopped loading at', ev.loaded);
		SPIF.log('loaded', Math.round(100*ev.loaded/ev.total), 'percent of file');
		done = true;
		SPIF.log("aborting the rest of the request");
		this.abort();
		SPIF.showImage(img, ds.buffer, himg);
	    } else {
		var limg = SPIF.getLargestLoaded(header, ev);
		if (limg && limg.width > lastWidth) {
		    lastWidth = limg.width;
		    if (ds.byteLength === 0) {
			ds.writeString(xhr.responseText);
		    }
		    SPIF.log('loaded size: '+limg.width+'x'+limg.height);
		    SPIF.showImage(img, ds.buffer, limg);
		}
	    }
	} else if (header === false) {
	    done = true;
	    this.abort();
	}
    };
    xhr.open("GET", img.dataset.src, true);
    xhr.overrideMimeType("text/plain; charset=x-user-defined");
    xhr.setRequestHeader("Content-Type", "text/plain");
    xhr.send(null);
    return true;
};