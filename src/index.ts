import util from "./util";
import fontFaces from "./fontFaces";
import images from "./images";

export type Filter = (node: HTMLElement) => boolean;
export type Options = {
  width?: number;
  height?: number;
  style?: CSSStyleDeclaration;
  bgcolor?: string;
  quality?: number;
  imagePlaceholder?: string;
  cacheBust?: boolean;
  filter?: Filter;
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
    const { bgcolor, width, height } = options;

    if (bgcolor) clone.style.backgroundColor = bgcolor;

    if (width) clone.style.width = width + "px";
    if (height) clone.style.height = height + "px";

    const cloneStyle = { ...clone.style, ...option.style };

    clone.setAttribute(
      "style",
      Object.entries(cloneStyle)
        .map((k, v) => `${k}:${v}`)
        .join(";")
    );
    return clone;
  };
  const option = { ...defaultOptions, ...options };
  let clone = await cloneNode(node, options.filter);
  clone = await fontFaces.inlineAll(clone);
  clone = await images.inlineAll(node);
  clone = applyOptions(clone);

  return makeSvgDataUri(
    clone,
    options.width || util.width(node),
    options.height || util.height(node)
  );
}

export async function toPixelData(node: HTMLElement, options: Options) {
  const canvas = await draw(node, options || {});
  return canvas
    .getContext("2d")
    .getImageData(0, 0, util.width(node), util.height(node)).data;
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
  return util.canvasToBlob(canvas);
}

async function draw(domNode: HTMLElement, options: Options) {
  const svg = await toSvg(domNode, options);
  const img = await util.makeImage(svg);

  await util.sleep(100);

  let canvas = document.createElement("canvas");
  canvas.width = options.width || util.width(domNode);
  canvas.height = options.height || util.height(domNode);

  if (options.bgcolor) {
    let ctx = canvas.getContext("2d");
    ctx.fillStyle = options.bgcolor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  canvas.getContext("2d").drawImage(img, 0, 0);
  return canvas;
}

async function cloneNode(
  node: HTMLElement,
  filter: Filter
): Promise<HTMLElement> {
  if (filter && !filter(node)) return;

  const makeNodeCopy = (node: HTMLElement): Promise<HTMLElement> => {
    if (node instanceof HTMLCanvasElement)
      return util.makeImage(node.toDataURL());
    return new Promise(resolve =>
      resolve((node.cloneNode(false) as any) as HTMLElement)
    );
  };

  const cloneChildren = async (
    original: HTMLElement,
    clone: HTMLElement,
    filter: Filter
  ) => {
    let children = original.childNodes;
    if (children.length === 0) return clone;

    const childrenList = Array.from(children);

    childrenList.forEach(async child => {
      const childClone = await cloneNode(child as HTMLElement, filter);
      if (childClone) clone.appendChild(childClone);
    });
  };

  const clone = await makeNodeCopy(node);
  const childrenClone = await cloneChildren(node, clone, filter);
  console.log(childrenClone);
  return processClone(node, childrenClone);
}

const processClone = async (original: HTMLElement, clone: HTMLElement) => {
  if (!(clone instanceof Element)) return clone;

  const cloneStyle = () => {
    const source = window.getComputedStyle(original);
    const target = clone.style;
    if (source.cssText) target.cssText = source.cssText;
    else {
      Array.from(source).forEach(name => {
        target.setProperty(
          name,
          source.getPropertyValue(name),
          source.getPropertyPriority(name)
        );
      });
    }
  };

  type PseudoElementName = ":before" | ":after";

  const clonePseudoElements = () => {
    const names: PseudoElementName[] = [":before", ":after"];

    const clonePseudoElement = (name: PseudoElementName) => {
      const style = window.getComputedStyle(original, name);
      const content = style.getPropertyValue("content");

      if (content === "" || content === "none") return;

      const className = util.uid();
      clone.classList.add(className);

      const formatPseudoElementStyle = (
        className: string,
        element: PseudoElementName,
        style: CSSStyleDeclaration
      ) => {
        let selector = `.${className}:${element}`;

        const formatCssText = (style: CSSStyleDeclaration) => {
          let content = style.getPropertyValue("content");
          return style.cssText + " content: " + content + ";";
        };

        const formatCssProperties = (style: CSSStyleDeclaration) => {
          return (
            Array.from(style)
              .map(
                name =>
                  name +
                  ": " +
                  style.getPropertyValue(name) +
                  (style.getPropertyPriority(name) ? " !important" : "")
              )
              .join("; ") + ";"
          );
        };

        let cssText = style.cssText
          ? formatCssText(style)
          : formatCssProperties(style);

        return document.createTextNode(`${selector}{${cssText}}`);
      };

      const styleElement = document.createElement("style");
      styleElement.appendChild(
        formatPseudoElementStyle(className, name, style)
      );

      clone.appendChild(styleElement);
    };

    names.forEach(name => {
      clonePseudoElement(name);
    });
  };

  const copyUserInput = () => {
    if (original instanceof HTMLTextAreaElement)
      clone.innerHTML = original.value;
    if (original instanceof HTMLInputElement)
      clone.setAttribute("value", original.value);
  };

  const fixSvg = () => {
    if (!(clone instanceof SVGElement)) return;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    if (!(clone instanceof SVGRectElement)) return;
    ["width", "height"].forEach(function(attribute) {
      let value = clone.getAttribute(attribute);
      if (!value) return;

      clone.style.setProperty(attribute, value);
    });
  };

  cloneStyle();
  clonePseudoElements();
  copyUserInput();
  fixSvg();

  return clone;
};

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
