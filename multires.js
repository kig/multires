MultiRes = {};

MultiRes.create = function(img) {
    var w = img.width;
    var h = img.height;
    var larger = Math.max(w,h);
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var mipmap = [];
    while (larger >= 1) {
	canvas.width = w;
	canvas.height = h;
	ctx.drawImage(img, 0, 0, w, h);
	mipmap.unshift({width:w, height:h, data:atob(canvas.toDataURL('image/jpeg',80).slice(23))});
	if (w > 1) {
	    w >>= 1;
	}
	if (h > 1) {
	    h >>= 1;
	}
	larger >>= 1;
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

MultiRes.createObjectURL = function(blob) {
    return (window.URL || window.webkitURL).createObjectURL(blob);
};

MultiRes.revokeObjectURL = function(url) {
    return (window.URL || window.webkitURL).revokeObjectURL(url);
};

MultiRes.showImage = function(img, blob, offsets) {
    var b = blob.slice(offsets.start, offsets.length+offsets.start);
    var url = MultiRes.createObjectURL(b);
    img.src = url;
    img.addEventListener('load', function() {
	MultiRes.revokeObjectURL(url);
    }, true);
};

MultiRes.parseHeader = function(ab) {
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
    MultiRes.log('original image size: '+orig.width+'x'+orig.height);
    return s.imgs;
};

MultiRes.alreadyLoaded = function(ev, offsets) {
    return ev.loaded >= offsets.start + offsets.length;
};

MultiRes.getHeaderImage = function(header, wantedSize) {
    var himg = null;
    for (var i=0; i<header.length; i++) {
	himg = header[i];
	if (himg.width >= wantedSize.width && himg.height >= wantedSize.height) {
	    break;
	}
    }
    return himg;
};

MultiRes.getWantedImageSize = function(img) {
    return {
	width : window.devicePixelRatio * img.width,
	height : window.devicePixelRatio * img.height
    };
};

MultiRes.LOG_TO_CONSOLE = false;
MultiRes.LOG_TO_PAGE = false;

MultiRes.log = function(msg) {
    if (MultiRes.LOG_TO_CONSOLE && window.console) {
	console.log.apply(console, arguments);
    }
    if (MultiRes.LOG_TO_PAGE) {
	var arr = [];
	for (var i=0; i<arguments.length; i++) {
	    arr.push(arguments[i]);
	}
	var elem = document.createElement('pre');
	elem.appendChild(document.createTextNode(arr.join(" ")+"\n"));
	document.body.appendChild(elem);
    }
};

MultiRes.load = function(img) {
    var wantedSize = MultiRes.getWantedImageSize(img);
    MultiRes.log('img size in layout pixels: '+img.width+'x'+img.height);
    MultiRes.log('img size in screen pixels: '+img.width*window.devicePixelRatio+'x'+img.height*window.devicePixelRatio);
    MultiRes.log('load size: '+wantedSize.width+'x'+wantedSize.height);
    var xhr = new XMLHttpRequest();
    //xhr.responseType = 'arraybuffer';
    var header = null;
    var done = false;
    xhr.onprogress = xhr.onload = function(ev) {
	if (!xhr.responseText || done) {
	    return;
	}
	var ds = new DataStream();
	if (!header) {
	    ds.writeString(xhr.responseText);
	    header = MultiRes.parseHeader(ds.buffer);
	    MultiRes.log('got header with', header.length, 'entries');
	    MultiRes.log('total file size', ev.total);
	}
	if (header) {
	    var himg = MultiRes.getHeaderImage(header, wantedSize);
	    if (MultiRes.alreadyLoaded(ev, himg)) {
		MultiRes.log('loaded size: '+himg.width+'x'+himg.height);
		if (ds.byteLength == 0) {
		    ds.writeString(xhr.responseText);
		}
		MultiRes.log('stopped loading at', ev.loaded);
		MultiRes.log('loaded', Math.round(100*ev.loaded/ev.total), 'percent of file');
		done = true;
		this.abort();
		MultiRes.showImage(img, new Blob([new Uint8Array(ds.buffer)]), himg);
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
};