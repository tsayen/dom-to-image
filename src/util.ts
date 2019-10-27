import { Options } from ".";
/**
 * Only WOFF and EOT mime types for fonts are 'real'
 * @see http://www.iana.org/assignments/media-types/media-types.xhtml
 */

const WOFF = "application/font-woff";
const JPEG = "image/jpeg";

export const mimes :Record<string, string>= {
  woff: WOFF,
  woff2: WOFF,
  ttf: "application/font-truetype",
  eot: "application/vnd.ms-fontobject",
  png: "image/png",
  jpg: JPEG,
  jpeg: JPEG,
  gif: "image/gif",
  tiff: "image/tiff",
  svg: "image/svg+xml",
};

export const parseExtension = (url: string) => {
  const match = /\.([^\.\/]*?)$/g.exec(url);
  return match ? match[1] : "";
};

export const mimeType = (url: string) => {
  const extension = parseExtension(url).toLowerCase();
  return mimes[extension] ?? "";
};

export const isDataUrl = (url:string) => {
  return url.search(/^(data:)/) !== -1;
};

export const canvasToBlob = (canvas: HTMLCanvasElement) :Promise<Blob> => {
  if (canvas.toBlob) {
    return new Promise(resolve => {
      canvas.toBlob(resolve);
    });
  }

  const toBlobPolyfill = async (canvas:HTMLCanvasElement):Promise<Blob> => {
    return new Promise(resolve=> {
      const binaryString = window.atob(canvas.toDataURL().split(",")[1]);
      const length = binaryString.length;
      const binaryArray = new Uint8Array(length);
      [...Array(length).keys()].forEach(
        i => binaryArray[i] = binaryString.charCodeAt(i)
      );

      resolve(
        new Blob([binaryArray], {
          type: "image/png",
        })
      );
    });
  };

  return toBlobPolyfill(canvas);
};

export const resolveUrl = (url: string, baseUrl: string) => {
  const doc = document.implementation.createHTMLDocument();
  const base = doc.createElement("base");
  doc.head.appendChild(base);
  const a = doc.createElement("a");
  doc.body.appendChild(a);
  base.href = baseUrl;
  a.href = url;
  return a.href;
};

export const uid = () => {
  let index = 0;

  const gen = () => {
    const fourRandomChars = () => {
      /** @see http://stackoverflow.com/a/6248722/2519373 */
      return (
        "0000" + ((Math.random() * Math.pow(36, 4)) << 0).toString(36)
      ).slice(-4);
    };
    return "u" + fourRandomChars() + index++;
  };
  return gen();
};

export const makeImage = (uri: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = reject;
    image.src = uri;
  });
};

export const getAndEncode = async (url: string, options?:Options) => {
  // TODO: implement timeout
  // const TIMEOUT = 30000;

  if (options?.cacheBust) {
    // Cache bypass so we dont have CORS issues with cached images
    // Source: https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache
    url += (/\?/.test(url) ? "&" : "?") + new Date().getTime();
  }

  const res = await fetch(url);
  const data = await res.blob();
  const dataUrl = URL.createObjectURL(data);
  return dataUrl;
};

export const dataAsUrl = (content: string, type: string) => {
  return "data:" + type + ";base64," + content;
};

export const escape = (str: string) => {
  return str.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
};

export const sleep = (ms: number) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

export const escapeXhtml = (str: string) => {
  return str.replace(/#/g, "%23").replace(/\n/g, "%0A");
};

export const width = (node: Element) => {
  const leftBorder = px(node, "border-left-width");
  const rightBorder = px(node, "border-right-width");
  return node.scrollWidth + leftBorder + rightBorder;
};

export const height = (node: Element) => {
  const topBorder = px(node, "border-top-width");
  const bottomBorder = px(node, "border-bottom-width");
  return node.scrollHeight + topBorder + bottomBorder;
};

export const px = (node: Element, styleProperty: string) => {
  const value = window.getComputedStyle(node).getPropertyValue(styleProperty);
  return parseFloat(value.replace("px", ""));
};

export default {
  width,
  height,
  px,
  escapeXhtml,
  sleep,
  escape,
  dataAsUrl,
  getAndEncode,
  makeImage,
  uid,
  resolveUrl,
  canvasToBlob,
  isDataUrl,
  mimeType,
  parseExtension,
};
