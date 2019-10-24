import * as util from "./util";

const URL_REGEX = /url\(['"]?([^'"]+?)['"]?\)/g;

export const shouldProcess = (str: string) => {
  return str.search(URL_REGEX) !== -1;
};

export const readUrls = (str: string) => {
  const result = [...str.matchAll(URL_REGEX)]
    .map(m => m[0])
    .filter(url => !util.isDataUrl(url));
  return result;
};

//type Get = (str: string) => Promise<string>;
export const inline = async (
  str: string,
  url: string,
  baseUrl?: string
  //  get: Get
) => {
  const urlAsRegex = (url: string) => {
    return new RegExp(
      "(url\\(['\"]?)(" + util.escape(url) + ")(['\"]?\\))",
      "g"
    );
  };

  return Promise.resolve(url)
    .then(url => {
      return baseUrl ? util.resolveUrl(url, baseUrl) : url;
    })
    .then(util.getAndEncode)
    .then(data => {
      return util.dataAsUrl(data, util.mimeType(url));
    })
    .then(dataUrl => {
      return str.replace(urlAsRegex(url), "$1" + dataUrl + "$3");
    });
};

async function inlineAll(str: string, baseUrl?: string /*get: Get */) {
  const nothingToInline = !shouldProcess(str);

  if (nothingToInline) return str;

  const urls = readUrls(str);

  await Promise.all(urls.map(url => inline(str, url, baseUrl /**get */)));

  return str;
}

export default {
  inlineAll,
  shouldProcess,
  readUrls,
  inline
};
