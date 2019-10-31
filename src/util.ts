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
  return url.startsWith("data:");
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

  if (options.cacheBust) {
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

export default {
  escapeXhtml,
  sleep,
  escape,
  dataAsUrl,
  getAndEncode,
  makeImage,
  resolveUrl,
  isDataUrl,
  mimeType,
  parseExtension,
};
