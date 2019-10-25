export declare type Filter = (node: HTMLElement) => boolean;
export declare type Options = {
    width?: number;
    height?: number;
    style?: CSSStyleDeclaration;
    bgcolor?: string;
    quality?: number;
    imagePlaceholder?: string;
    cacheBust?: boolean;
    filter?: Filter;
};
declare function toSvg(node: HTMLElement, options?: Options): Promise<string>;
export declare function toPixelData(node: HTMLElement, options: Options): Promise<Uint8ClampedArray>;
export declare function toPng(node: HTMLElement, options?: Options): Promise<String>;
export declare function toJpeg(node: HTMLElement, options?: Options): Promise<String>;
export declare function toBlob(node: HTMLElement, options?: Options): Promise<Blob>;
declare const _default: {
    toSvg: typeof toSvg;
    toPng: typeof toPng;
    toJpeg: typeof toJpeg;
    toBlob: typeof toBlob;
    toPixelData: typeof toPixelData;
};
export default _default;
