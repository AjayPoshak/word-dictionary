import { open } from "node:fs/promises";
import { resolve } from "node:path";

export class FileWriter {
  constructor(filePath) {
    this.filePath = filePath;
    this.fileHandle = null;
  }

  async openFile() {
    if (this.fileHandle) return this.fileHandle;
    this.fileHandle = await open(resolve(this.filePath), "a");
    return this.fileHandle;
  }

  async write(line) {
    console.log(line);
    await this.openFile();
    await this.fileHandle.write(line + "\n");
  }

  async close() {
    await this.fileHandle?.close();
    this.fileHandle = null;
  }
}
