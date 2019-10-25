import inliner from "./inliner";

export const inlineAll = async (node: HTMLElement) => {
  const fonts = (Array.from(document.styleSheets) as CSSStyleSheet[])
    .flatMap(sheet => Array.from(sheet.cssRules))
    .filter(
      (rule): rule is CSSFontFaceRule => rule.type === CSSRule.FONT_FACE_RULE
    )
    .filter(fontFaceRule =>
      inliner.shouldProcess(fontFaceRule.style.getPropertyValue("src"))
    );
  const cssStrings = await Promise.all(
    fonts.map(font => {
      const baseUrl = font.parentStyleSheet.href;
      return inliner.inlineAll(font.cssText, baseUrl);
    })
  );

  const cssText = cssStrings.join("\n");
  const styleNode = document.createElement("style");
  node.appendChild(styleNode);
  styleNode.appendChild(document.createTextNode(cssText));
  return node;
};

export default {
  inlineAll
};
