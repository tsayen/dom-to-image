/**
 * Only WOFF and EOT mime types for fonts are 'real'
 * @see http://www.iana.org/assignments/media-types/media-types.xhtml
 */

const WOFF = "application/font-woff";
const JPEG = "image/jpeg";

export const mimes :Record<string,string>= {
  woff: WOFF,
  woff2: WOFF,
  ttf: "application/font-truetype",
  eot: "application/vnd.ms-fontobject",
  png: "image/png",
  jpg: JPEG,
  jpeg: JPEG,
  gif: "image/gif",
  tiff: "image/tiff",
  svg: "image/svg+xml"
};

export const parseExtension = (url: string) => {
  const match = /\.([^\.\/]*?)$/g.exec(url);
  return match ? match[1] : "";
};

export const mimeType = (url: string) => {
  const extension = parseExtension(url).toLowerCase();
  return  mimes[extension] ?? "";
};

export const isDataUrl = (url:string) => {
  return url.search(/^(data:)/) !== -1;
}

export const canvasToBlob = (canvas: HTMLCanvasElement) => {
  if (canvas.toBlob)
{    return new Promise(resolve => {
      canvas.toBlob(resolve);
    });}

    const toBlobPolyfill = async (canvas:HTMLCanvasElement):Promise<Blob> => {
       return new Promise((resolve)=> {
         const binaryString = window.atob(canvas.toDataURL().split(",")[1]);
         const length = binaryString.length;
         const binaryArray = new Uint8Array(length);
         [...Array(length).keys()].forEach(i=>binaryArray[i] = binaryString.charCodeAt(i));
     
         resolve(
           new Blob([binaryArray], {
             type: "image/png"
           })
         );
       });
     }

  return toBlobPolyfill(canvas);
}

export const resolveUrl = (url: string, baseUrl: string) => {
  const doc = document.implementation.createHTMLDocument();
  const base = doc.createElement("base");
  doc.head.appendChild(base);
  let a = doc.createElement("a");
  doc.body.appendChild(a);
  base.href = baseUrl;
  a.href = url;
  return a.href;
}

export const uid = () => {
  let index = 0;

  return () => {
    const fourRandomChars = () => {
      /** @see http://stackoverflow.com/a/6248722/2519373 */
      return (
        "0000" + ((Math.random() * Math.pow(36, 4)) << 0).toString(36)
      ).slice(-4);
    };
    return "u" + fourRandomChars() + index++;
  };
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
}

export const getAndEncode = (url: string):Promise<string> => {
  const TIMEOUT = 30000;
  if (domtoimage.impl.options.cacheBust) {
    // Cache bypass so we dont have CORS issues with cached images
    // Source: https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache
    url += (/\?/.test(url) ? "&" : "?") + new Date().getTime();
  }

  return new Promise((resolve) => {
    let request = new XMLHttpRequest();

    request.onreadystatechange = done;
    request.ontimeout = timeout;
    request.responseType = "blob";
    request.timeout = TIMEOUT;
    request.open("GET", url, true);
    request.send();

    let placeholder;
    if (domtoimage.impl.options.imagePlaceholder) {
      let split = domtoimage.impl.options.imagePlaceholder.split(/,/);
      if (split && split[1]) {
        placeholder = split[1];
      }
    }

    function done() {
      if (request.readyState !== 4) return;

      if (request.status !== 200) {
        if (placeholder) {
          resolve(placeholder);
        } else {
          fail("cannot fetch resource: " + url + ", status: " + request.status);
        }

        return;
      }

      let encoder = new FileReader();
      encoder.onloadend = function() {
        let content = encoder.result.split(/,/)[1];
        resolve(content);
      };
      encoder.readAsDataURL(request.response);
    }

    function timeout() {
      if (placeholder) {
        resolve(placeholder);
      } else {
        fail(
          "timeout of " + TIMEOUT + "ms occured while fetching resource: " + url
        );
      }
    }

    function fail(message) {
      console.error(message);
      resolve("");
    }
  });
}

export const dataAsUrl = (content: string, type: string) => {
  return "data:" + type + ";base64," + content;
};

export const escape = (str: string) => {
  return str.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
};

export const delay = (ms: number): (<T>(arg: T) => Promise<T>) => {
  return arg => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(arg);
      }, ms);
    });
  };
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
