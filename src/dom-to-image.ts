import * as util from "./util";
import inliner from "./inliner";
import fontFaces from "./fontFaces";
import images from "./images";

type Options = {
  width?: number;
  height?: number;
  style?: object;
  bgcolor?: string;
  quality?: number;
  imagePlaceholder?: string;
  cacheBust?: boolean;
  filter?(node: Element): boolean;
};
// Default impl options
let defaultOptions: Options = {
  // Default is to fail on error, no placeholder
  imagePlaceholder: undefined,
  // Default cache bust is false, it will use the cache
  cacheBust: false
};

async function toSvg(node: Element, options: Options = {}): Promise<string> {
  copyOptions(options);
  const clone = await cloneNode(node, options.filter);
  //.then(embedFonts)
  //.then(inlineImages)
  //.then(applyOptions)
  //.then( (clone)=> {
  //    return makeSvgDataUri(clone,
  //        options.width || util.width(node),
  //        options.height || util.height(node)
  //    );
  //});
  return clone;

  function applyOptions(clone) {
    if (options.bgcolor) clone.style.backgroundColor = options.bgcolor;

    if (options.width) clone.style.width = options.width + "px";
    if (options.height) clone.style.height = options.height + "px";

    if (options.style)
      Object.keys(options.style).forEach(property => {
        clone.style[property] = options.style[property];
      });

    return clone;
  }
}

export async function toPixelData(node: Element, options: Options) {
  const canvas = await draw(node, options || {});
  return canvas
    .getContext("2d")
    .getImageData(0, 0, util.width(node), util.height(node)).data;
}

/**
 * @param {Node} node - The DOM Node object to render
 * @param {Object} options - Rendering options, @see {@link toSvg}
 * @return {Promise} - A promise that is fulfilled with a PNG image data URL
 * */
async function toPng(node, options) {
  const canvas = await draw(node, options || {});
  return canvas.toDataURL();
}

/**
 * @param {Node} node - The DOM Node object to render
 * @param {Object} options - Rendering options, @see {@link toSvg}
 * @return {Promise} - A promise that is fulfilled with a JPEG image data URL
 * */
async function toJpeg(node, options) {
  options = options || {};
  const canvas = await draw(node, options);
  return canvas.toDataURL("image/jpeg", options.quality || 1);
}

function toBlob(node: Element, options: Options): Promise<Blob> {
  return draw(node, options || {}).then(util.canvasToBlob);
}

function copyOptions(options) {
  // Copy options to impl options for use in impl
  if (typeof options.imagePlaceholder === "undefined") {
    domtoimage.impl.options.imagePlaceholder = defaultOptions.imagePlaceholder;
  } else {
    domtoimage.impl.options.imagePlaceholder = options.imagePlaceholder;
  }

  if (typeof options.cacheBust === "undefined") {
    domtoimage.impl.options.cacheBust = defaultOptions.cacheBust;
  } else {
    domtoimage.impl.options.cacheBust = options.cacheBust;
  }
}

function draw(domNode, options: Options) {
  return toSvg(domNode, options)
    .then(util.makeImage)
    .then(util.delay(100))
    .then(function(image) {
      let canvas = newCanvas(domNode);
      canvas.getContext("2d").drawImage(image, 0, 0);
      return canvas;
    });

  function newCanvas(domNode) {
    let canvas = document.createElement("canvas");
    canvas.width = options.width || util.width(domNode);
    canvas.height = options.height || util.height(domNode);

    if (options.bgcolor) {
      let ctx = canvas.getContext("2d");
      ctx.fillStyle = options.bgcolor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    return canvas;
  }
}

async function cloneNode(node: Node, filter: Options["filter"]) {
  if (filter && !filter(node)) return;

  const makeNodeCopy = (node: Node) => {
    if (node instanceof HTMLCanvasElement)
      return util.makeImage(node.toDataURL());
    return node.cloneNode(false);
  };

  const node_1 = await Promise.resolve(node);
  const clone = await makeNodeCopy(node_1);
  const clone_1 = await cloneChildren(node, clone, filter);
  return processClone(node, clone_1);

  async function cloneChildren(original, clone, filter) {
    let children = original.childNodes;
    if (children.length === 0) return Promise.resolve(clone);

    await cloneChildrenInOrder(clone, util.asArray(children), filter);
    return clone;

    function cloneChildrenInOrder(parent, children, filter) {
      let done = Promise.resolve();
      children.forEach(function(child) {
        done = done
          .then(function() {
            return cloneNode(child, filter);
          })
          .then(function(childClone) {
            if (childClone) parent.appendChild(childClone);
          });
      });
      return done;
    }
  }

  function processClone(original, clone) {
    if (!(clone instanceof Element)) return clone;

    return Promise.resolve()
      .then(cloneStyle)
      .then(clonePseudoElements)
      .then(copyUserInput)
      .then(fixSvg)
      .then(function() {
        return clone;
      });

    function cloneStyle() {
      copyStyle(window.getComputedStyle(original), clone.style);

      function copyStyle(source, target) {
        if (source.cssText) target.cssText = source.cssText;
        else copyProperties(source, target);

        function copyProperties(source, target) {
          util.asArray(source).forEach(function(name) {
            target.setProperty(
              name,
              source.getPropertyValue(name),
              source.getPropertyPriority(name)
            );
          });
        }
      }
    }

    function clonePseudoElements() {
      [":before", ":after"].forEach(function(element) {
        clonePseudoElement(element);
      });

      function clonePseudoElement(element) {
        let style = window.getComputedStyle(original, element);
        let content = style.getPropertyValue("content");

        if (content === "" || content === "none") return;

        let className = util.uid();
        clone.className = clone.className + " " + className;
        let styleElement = document.createElement("style");
        styleElement.appendChild(
          formatPseudoElementStyle(className, element, style)
        );
        clone.appendChild(styleElement);

        function formatPseudoElementStyle(className, element, style) {
          let selector = "." + className + ":" + element;
          let cssText = style.cssText
            ? formatCssText(style)
            : formatCssProperties(style);
          return document.createTextNode(selector + "{" + cssText + "}");

          function formatCssText(style) {
            let content = style.getPropertyValue("content");
            return style.cssText + " content: " + content + ";";
          }

          function formatCssProperties(style) {
            return (
              util
                .asArray(style)
                .map(formatProperty)
                .join("; ") + ";"
            );

            function formatProperty(name) {
              return (
                name +
                ": " +
                style.getPropertyValue(name) +
                (style.getPropertyPriority(name) ? " !important" : "")
              );
            }
          }
        }
      }
    }

    function copyUserInput() {
      if (original instanceof HTMLTextAreaElement)
        clone.innerHTML = original.value;
      if (original instanceof HTMLInputElement)
        clone.setAttribute("value", original.value);
    }

    function fixSvg() {
      if (!(clone instanceof SVGElement)) return;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

      if (!(clone instanceof SVGRectElement)) return;
      ["width", "height"].forEach(function(attribute) {
        let value = clone.getAttribute(attribute);
        if (!value) return;

        clone.style.setProperty(attribute, value);
      });
    }
  }
}

async function embedFonts(node) {
  const cssText = await fontFaces.resolveAll();
  let styleNode = document.createElement("style");
  node.appendChild(styleNode);
  styleNode.appendChild(document.createTextNode(cssText));
  return node;
}

async function inlineImages(node) {
  await images.inlineAll(node);
  return node;
}

function makeSvgDataUri(node, width, height) {
  return Promise.resolve(node)
    .then(function(node) {
      node.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
      return new XMLSerializer().serializeToString(node);
    })
    .then(util.escapeXhtml)
    .then(function(xhtml) {
      return (
        '<foreignObject x="0" y="0" width="100%" height="100%">' +
        xhtml +
        "</foreignObject>"
      );
    })
    .then(function(foreignObject) {
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="' +
        width +
        '" height="' +
        height +
        '">' +
        foreignObject +
        "</svg>"
      );
    })
    .then(function(svg) {
      return "data:image/svg+xml;charset=utf-8," + svg;
    });
}

export default {
  toSvg,
  toPng,
  toJpeg,
  toBlob,
  toPixelData,
  impl: {
    fontFaces,
    images,
    util,
    inliner,
    options: {}
  }
};
