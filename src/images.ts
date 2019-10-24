import * as util from "./util";
import inliner from "./inliner";

const inline = async (element: HTMLImageElement): Promise<Event> => {
  if (util.isDataUrl(element.src)) return;

  const data = await util.getAndEncode(element.src);
  const dataUrl = util.dataAsUrl(data, util.mimeType(element.src));

  return new Promise((resolve, reject) => {
    element.onload = resolve;
    element.onerror = reject;
    element.src = dataUrl;
  });
};

export const inlineAll = async (node: Node): Promise<any> => {
  if (!(node instanceof HTMLElement)) return node;

  let background = node.style.getPropertyValue("background");

  if (!background) return node;

  const inlined = await inliner.inlineAll(background);
  node.style.setProperty(
    "background",
    inlined,
    node.style.getPropertyPriority("background")
  );

  if (node instanceof HTMLImageElement) {
    return inline(node);
  } else {
    return Promise.all(
      Array.from(node.childNodes).map(child => inlineAll(child))
    );
  }
};

export default {
  inlineAll
};
