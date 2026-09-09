declare module "mammoth" {
  export interface Result {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }
  export function extractRawText(options: { buffer: Buffer }): Promise<Result>;
  export function convertToHtml(options: { buffer: Buffer }, options2?: any): Promise<Result>;
  export function convertToMarkdown(options: { buffer: Buffer }): Promise<Result>;
}
