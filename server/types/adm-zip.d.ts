declare module 'adm-zip' {
  interface ZipEntry {
    entryName: string;
    name: string;
    isDirectory: boolean;
    getData(): Buffer;
    getDataAsync(callback: (data: Buffer) => void): void;
  }

  class AdmZip {
    constructor(zipFilePath?: string | Buffer);
    extractAllTo(targetPath: string, overwrite?: boolean): void;
    extractEntryTo(entry: string | ZipEntry, targetPath: string, maintainEntryPath?: boolean, overwrite?: boolean): boolean;
    getEntries(): ZipEntry[];
    getEntry(entryName: string): ZipEntry | null;
    readAsText(entry: string | ZipEntry, encoding?: string): string;
    readFile(entry: string | ZipEntry): Buffer;
    addFile(entryPath: string, data: Buffer | string, comment?: string, attrs?: any): void;
    addLocalFile(localPath: string, zipPath?: string, zipName?: string): void;
    addLocalFolder(localPath: string, zipPath?: string): void;
    writeZip(targetFileName?: string, callback?: (error: Error | null) => void): Buffer;
    toBuffer(): Buffer;
  }

  export = AdmZip;
}