import util from "./util";
import { Options } from ".";

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
  baseUrl?: string,
  options?: Options
) => {
  const urlAsRegex = (url: string) => {
    return new RegExp(
      "(url\\(['\"]?)(" + util.escape(url) + ")(['\"]?\\))",
      "g"
    );
  };

  const originUrl = baseUrl ? util.resolveUrl(url, baseUrl) : url;
  const data = await util.getAndEncode(originUrl, options);
  const dataUrl = util.dataAsUrl(data, util.mimeType(url));
  return str.replace(urlAsRegex(url), "$1" + dataUrl + "$3");
};

async function inlineAll(
  str: string,
  baseUrl?: string,
  options?: Options /*get: Get */
) {
  const nothingToInline = !shouldProcess(str);

  if (nothingToInline) return str;

  const urls = readUrls(str);

  await Promise.all(
    urls.map(url => inline(str, url, baseUrl, options /**get */))
  );

  return str;
}

export default {
  inlineAll,
  shouldProcess,
  readUrls,
  inline
};
