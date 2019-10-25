import { Options } from ".";
declare const _default: {
    width: (node: Element) => number;
    height: (node: Element) => number;
    px: (node: Element, styleProperty: string) => number;
    escapeXhtml: (str: string) => string;
    sleep: (ms: number) => Promise<unknown>;
    escape: (str: string) => string;
    dataAsUrl: (content: string, type: string) => string;
    getAndEncode: (url: string, options?: Options) => Promise<string>;
    makeImage: (uri: string) => Promise<HTMLImageElement>;
    uid: () => string;
    resolveUrl: (url: string, baseUrl: string) => string;
    canvasToBlob: (canvas: HTMLCanvasElement) => Promise<Blob>;
    isDataUrl: (url: string) => boolean;
    mimeType: (url: string) => string;
    parseExtension: (url: string) => string;
};
export default _default;
