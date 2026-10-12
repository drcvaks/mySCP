export function chunkDisplayCode(code: string): string {
  return code.replace(/^HC\d+-/i, "");
}
