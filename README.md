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
<img src="5000px_wide_image.jpg.13.mres/9.jpg" width="480" height="320">

# Add the multires.js script to the end of your page
<script src="multires.js"></script>


How MultiRes works
---

MultiRes keeps each screen pixel filled with at least one image pixel, up to the maximum resolution of the image. To load the image at the wanted resolution, a MultiRes image directory contains several versions of the same image at different resolutions.

The MultiRes viewer loads the version of the image that's closest to the displayed size. To save bandwidth, the viewer only loads the wanted-resolution image.

Browsers with JavaScript disabled load the version of the image defined in the image src attribute. When JavaScript is enabled, the MultiRes loader kicks in and loads the optimal version of the image.
