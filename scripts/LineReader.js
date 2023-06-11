import { resolve } from "node:path";
import { open } from "node:fs/promises";

export class LineReader {
  constructor(filePath) {
    this.filePath = filePath;
    this.fileHandle = null;
    this.lines = [];
    this.fileClosed = false;
  }

  onClose = () => {
    this.fileClosed = true;
  };

  openFile = async () => {
    if (this.fileHandle) return this.fileHandle;
    this.fileHandle = await open(resolve(this.filePath));
    this.fileHandle.on("close", this.onClose);
    return this.fileHandle;
  };

  readLine = async () => {
    try {
      if (this.lines.length > 0) {
        let line = this.lines.shift();
        while (line === "" && this.lines.length > 0) {
          line = this.lines.shift();
        }
        return line !== "" ? line : null;
      }
      if (this.fileClosed) {
        return null;
      }
      await this.openFile();
      const rLines = this.fileHandle.readLines();
      for await (const line of rLines) {
        this.lines.push(line);
      }
      return this.lines.shift();
    } catch (err) {
      console.error(err);
      console.log("Error while reading ", this.filePath);
    }
  };

  async close() {
    await this.fileHandle.close();
    this.fileHandle = null;
  }
}

// const originalFileReader = new LineReader("./src/data/dictionary.txt");
// await originalFileReader.readLine();
