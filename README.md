SPIF - Streaming Progressive Image Format
=========================================

SPIF is a proof-of-concept image format that makes images look good on all screen resolutions.

SPIF is easy to use, it behaves like a normal image.

The difference between SPIF and normal images is that SPIF looks good on Retina displays and loads fast on mobile browsers.


How SPIF works
---

A SPIF file contains several versions of the same image at different resolutions.

The SPIF viewer loads the version of the image that's closest to the displayed size.

The SPIF viewer saves bandwidth by not loading the other versions of the image.

The images are stored smallest size first, so the SPIF viewer can show the smaller versions of the image while loading.

The image sizes are fully customizable, so you can serve pixel-perfect content to common devices.

The images can have different content, so you can e.g. optimize GUI elements for usability by scaling text size in a non-linear fashion.


Problems to solve
---

Browsers don't load SPIF images natively. This implementation is using JS to load and parse the SPIF files.

Browsers don't cache partial downloads. This can be worked around in this JS implementation by using client-side storage.

This viewer loads all the smaller versions of the image on its way to the display resolution. This allows the viewer to get away with only one HTTP request per image. A bandwidth-optimal solution would load the SPIF header, then issue a HTTP Range request to load the wanted image version. A <img srcset> or <picture> -style solution lets you skip the header load (as it basically inlines the header in the HTML), but it's more trouble for web developers.

Downloading a higher resolution version of an image when you zoom into it is possible by hanging onto the header and doing a HTTP Range request for the high-res version. Not implemented yet.


JS implementation issues
---

Mobile Safari doesn't support Blobs, so this JS implementation loads the image using a data URL. Data URLs don't work for large images in Mobile Safari.

XMLHttpRequest with ArrayBuffer response type doesn't give you access to partially loaded data, so you can't stop loading early. As a workaround, this implementation uses responseText which is slower but gives you partial results. Mobile Safari doesn't give you access to partially loaded data, so you can't stop loading early on it.

Parsing the images in JavaScript is kinda slow, exacerbated by having to deal with responseText and data URLs. Not a problem on the desktop, but uses more power on mobiles.


Things to investigate
---

Make the images smaller by storing higher-res versions as incremental diffs of the lower-res images.
HiRes = scaleUp(LoRes) + HiResDiff; 
HiResDiff = HiRes - scaleUp(LoRes);

