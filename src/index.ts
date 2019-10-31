import util from "./util";
import fontFaces from "./fontFaces";
import images from "./images";

export type Options = {
  width?: number;
  height?: number;
  style?: CSSStyleDeclaration;
  bgcolor?: string;
  quality?: number;
  imagePlaceholder?: string;
  cacheBust?: boolean;
};

const defaultOptions: Options = {
  imagePlaceholder: undefined,
  cacheBust: false
};

async function toSvg(
  node: HTMLElement,
  options: Options = {}
): Promise<string> {
  const applyOptions = (clone: HTMLElement) => {
    const { bgcolor, width, height, style } = options;

    if (bgcolor) clone.style.backgroundColor = bgcolor;

    if (width) clone.style.width = width + "px";
    if (height) clone.style.height = height + "px";
    if (!style) return clone;

    clone.setAttribute(
      "style",
      Object.entries(style)
        .map((k, v) => `${k}:${v}`)
        .join(";")
    );
    return clone;
  };
  const mergedOptions = { ...defaultOptions, ...options };
  let clone = node.cloneNode(true) as HTMLElement;
  clone = await fontFaces.inlineAll(clone);
  clone = await images.inlineAll(node);
  clone = applyOptions(clone);

  return makeSvgDataUri(
    clone,
    mergedOptions.width || node.clientWidth,
    mergedOptions.height || node.clientHeight
  );
}

export async function toPixelData(node: HTMLElement, options: Options) {
  const canvas = await draw(node, options || {});
  return canvas
    .getContext("2d")
    .getImageData(0, 0, node.clientWidth, node.clientHeight).data;
}

export async function toPng(
  node: HTMLElement,
  options: Options = {}
): Promise<String> {
  const canvas = await draw(node, options);
  return canvas.toDataURL();
}

export async function toJpeg(
  node: HTMLElement,
  options: Options = {}
): Promise<String> {
  const canvas = await draw(node, options);
  return canvas.toDataURL("image/jpeg", options.quality || 1);
}

export async function toBlob(
  node: HTMLElement,
  options: Options = {}
): Promise<Blob> {
  const canvas = await draw(node, options);

  if (!canvas.toBlob) {
    throw new Error("canvas.toBlob is not supported by browser");
  }
  return new Promise(resolve => {
    canvas.toBlob(resolve);
  });
}

async function draw(domNode: HTMLElement, options: Options) {
  const svg = await toSvg(domNode, options);
  const img = await util.makeImage(svg);

  await util.sleep(100);

  const canvas = document.createElement("canvas");
  canvas.width = options.width || domNode.clientWidth;
  canvas.height = options.height || domNode.clientHeight;

  if (options.bgcolor) {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = options.bgcolor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  canvas.getContext("2d").drawImage(img, 0, 0);
  return canvas;
}

function makeSvgDataUri(node: Element, width: number, height: number) {
  node.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  const xmlStr = new XMLSerializer().serializeToString(node);
  const xml = util.escapeXhtml(xmlStr);

  const foreignObject = `
        <foreignObject x="0" y="0" width="100%" height="100%">
          ${xml}
        </foreignObject>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" 
                  width="${width}" 
                  height="${height}"
               >
                    ${foreignObject}
               </svg>`;
  return "data:image/svg+xml;charset=utf-8," + svg;
}

export default {
  toSvg,
  toPng,
  toJpeg,
  toBlob,
  toPixelData
};
