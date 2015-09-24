# DOM to Image

## What is it
**Dom-to-image** is a library which can turn arbitrary DOM node into a vector (SVG) or raster (PNG) image, written in
JavaScript. It's based on the idea from [domvas script by Paul Bakaus](https://github.com/pbakaus/domvas)
and has been completely rewritten, with some bugs fixed and some new features (like web font and image support) added.

## Usage
All the top level functions accept DOM node and rendering options and return promises, which are fulfilled with
corresponding data URLs.  
Get a PNG image base64-encoded data URL and display right away:
```javascript
var node = document.getElementById('my-node');
domtoimage.toPng(node)
    .then(function (dataUrl) {
        var img = new Image();
        img.src = dataUrl;
        document.appendChild(img);
    })
    .catch(function (error) {
        console.error('oops, something went wrong!', error);
    });
```
Get a PNG image blob and download it (using [FileSaver](https://github.com/eligrey/FileSaver.js/), for example):
```javascript
domtoimage.toBlob(document.getElementById('my-node'))
    .then(function (blob) {
        window.saveAs(blob, 'my-node.png');
    });
```
Get an SVG data URL, but filter out all the `<i>` elements:
```javascript
function filter (node) {
    return (node.tagName === 'i');
}

domtoimage.toSvg(document.getElementById('my-node'), {filter: filter})
    .then(function (dataUrl) {
        /* do something */
    });
```
All the functions under `impl` are not public API and are exposed only for unit testing.

## How it works
There might some day exist (or maybe already exists?) a simple and standard way of exporting parts of the HTML to
image (and then this script can only serve as an evidence of all the hoops I had to jump through in order to get such obvious
thing done) but I haven't found one so far.  
This library uses a feature of SVG that allows having arbitrary HTML content inside of the `<foreignObject>` tag.
So, in order to render that DOM node for you, following steps are taken:  
1. Clone the original DOM node recursively
2. Compute the style for the node and each sub-node and copy it to corresponding clone  
 * and don't forget to recreate pseudo-elements, as they are not cloned in any way, of course
3. Embed web fonts
 * find all the `@font-face` declarations that might represent web fonts
 * parse file URLs, download corresponding files
 * base64-encode and inline content as `data:` URLs
 * concatenate all the processed CSS rules and put them into one `<style>` element, then attach it to the clone
4. Embed images
 * embed image URLs in `<img>` elements
 * inline images used in `background` CSS property, in a fashion similar to fonts
5. Serialize the cloned node to XML
6. Wrap XML into the `<foreignObject>` tag, then into the SVG, then make it a data URL
7. Optionally, to get a PNG content, create an Image element with the SVG as a source, and render it on an off-screen
 canvas, that you have also created, then read the content from the canvas
8. Done!

©2015 Anatolii Saienko

©2012 Paul Bakaus

Licensed under MIT.
