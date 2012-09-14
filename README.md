MultiRes - Multi-resolution image format
===

MultiRes is a proof-of-concept image format that makes images look good on all screen resolutions, from mobile displays to Retina displays.

When an image is zoomed out, MultiRes loads a smaller version of the image. When you zoom in to the image, MultiRes loads a larger version of the image.

Usage
---

# Create a multires image directory
cmultires 5000px_wide_image.jpg

# Upload the multires directory to your server

# Add an img tag for the image to your HTML
<img id="myImg" src="5000px_wide_image.jpg.13.mres/9.jpg" width="480" height="320">

# Add the multires.js script to the end of your page
<script src="multires.js"></script>

# Animate / manipulate / tweak image size in your page.
# The image loads a sharp version for its current size.

#myImg {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 100%;
  height: 100%;
}


How MultiRes works
---

MultiRes keeps each screen pixel filled with at least one image pixel, up to the maximum resolution of the image. To load the image at the wanted resolution, a MultiRes image directory contains several versions of the same image at different resolutions.

The MultiRes viewer loads the version of the image that's closest to the displayed size. To save bandwidth, the viewer only loads the wanted-resolution image.

Browsers with JavaScript disabled load the version of the image defined in the image src attribute. When JavaScript is enabled, the MultiRes loader kicks in and loads the optimal version of the image.


Specification
---

A MultiRes image is identified by a filename that ends with ".N.mres/D" where N is the size of the largest image in the MultiRes directory and D is the default resolution to load. The images in the MultiRes directory are named by the power of two that's equal or smaller than the longest dimension of the image.

The exception is the largest image size, which can contain an image that's smaller than the power of two of its name.

For example, here's what a 250x125 image would look like:
test.8.mres/ -- 2^8 = 256 >= 250
 |- 8 -- 250x125
 |- 7 -- 128x64
 |- 6 -- 64x32
 |- 5 -- 32x16
 |- 4 -- 16x8
 ...
 \- 0 -- 1x1

Alternatively you could use size halving:
test.7.mres/
 |- 7 -- 250x125
 |- 6 -- 125x63
 |- 5 -- 63x32
 |- 4 -- 32x16
 ...
 \- 0 -- 2x1


Issues
---

The scaled down images have power-of-two dimensions. Display sizes for the most part aren't power-of-twos. Having separate images for popular sizes would help. Using powers of 1.25 would be a closer match to display size scaling.

