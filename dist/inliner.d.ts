import { Options } from ".";
declare function inlineAll(str: string, baseUrl?: string, options?: Options): Promise<string>;
declare const _default: {
    inlineAll: typeof inlineAll;
    shouldProcess: (str: string) => boolean;
    readUrls: (str: string) => string[];
    inline: (str: string, url: string, baseUrl?: string, options?: Options) => Promise<string>;
};
export default _default;
