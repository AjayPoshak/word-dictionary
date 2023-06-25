import { open, mkdtemp } from "node:fs/promises";
import {
  createWriteStream,
  statSync,
  readFileSync,
  createReadStream,
} from "node:fs";
import * as fs from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { HEADER_LENGTH } from "../src/constants.js";
import { parseArgs } from "node:util";

const map = {};
let key = "",
  value = null,
  bytesCount = 0;
let readingKey = true;

function addValue(obj, currentIndex) {
  if (obj == null) return [currentIndex, 1];
  const [startIndex, length] = obj;
  const updatedLength = currentIndex - startIndex + 1;
  return [startIndex, updatedLength];
}

function parseKeyValue(input) {
  const buffer = Buffer.from(input, "utf8");
  let index = 0;
  while (index < buffer.length) {
    switch (buffer[index]) {
      // Whitespace
      case 32: {
        // Read key until next index is a whitespace
        if (readingKey === true && buffer[index + 1] === 32) {
          readingKey = false;
        } else {
          if (readingKey === true) key += String.fromCharCode(buffer[index]);
          else value = addValue(value, bytesCount);
        }
        break;
      }
      // Newline character
      case 10: {
        // If we're reading value and encounter a newline then the value is complete.
        if (readingKey === false) {
          // Conclude our reading of key-value pair
          const [startIndex, length] = value;
          map[key] = [startIndex, length];
          key = "";
          value = null;
          // Start reading new key
          readingKey = true;
        } else {
          // If we encounter new line while reading key, then ignore that key
          key = "";
        }
        break;
      }
      default: {
        if (readingKey === true) key += String.fromCharCode(buffer[index]);
        else value = addValue(value, bytesCount);
      }
    }
    index++;
    bytesCount++;
  }
}

async function mergeFiles({
  headerFilePath,
  indexFilePath,
  sourceFilePath,
  destinationFilePath,
}) {
  const read1 = fs.createReadStream(headerFilePath);
  const write = fs.createWriteStream(destinationFilePath);
  read1.pipe(write);

  const anotherRead = fs.createReadStream(indexFilePath);
  const anotherWrite = fs.createWriteStream(destinationFilePath, {
    start: HEADER_LENGTH,
    encoding: "utf-8",
  }); // Start writing from next byte
  anotherRead.pipe(anotherWrite);

  const oneMoreRead = fs.createReadStream(sourceFilePath);
  console.log("starting write from ", 56 + statSync(indexFilePath).size + 1);
  const oneMoreWrite = fs.createWriteStream(destinationFilePath, {
    start: HEADER_LENGTH + statSync(indexFilePath).size + 1,
    encoding: "utf-8",
  });
  oneMoreRead.pipe(oneMoreWrite);
}

function parseCommandValues() {
  const options = {
    source: {
      type: "string",
    },
    dest: {
      type: "string",
    },
  };
  const { values } = parseArgs({ options });
  return { sourceFile: values.source, destFile: values.dest };
}

async function main() {
  const { sourceFile, destFile } = parseCommandValues();
  const fileHandle = await open(resolve(`./src/data/${sourceFile}`));
  const stream = fileHandle.createReadStream({ highWaterMark: 64 * 2048 });
  for await (const chunk of stream) {
    parseKeyValue(chunk);
  }
  if (key !== "" && value !== null) {
    // flush the last pair
    map[key] = value;
  }
  await fileHandle?.close();

  const indexHandle = await open(resolve("./src/data/index.txt"), "w");
  indexHandle.write(JSON.stringify(map));
  await indexHandle?.close();

  const headerFileHandle = await open(resolve("./src/data/header.txt"), "w");
  const size = statSync("./src/data/index.txt").size;
  headerFileHandle.write(
    "version: 1.0\nindex_start: 000053\nindex_length: " + size
  );
  await headerFileHandle?.close();

  await mergeFiles({
    headerFilePath: "./src/data/header.txt",
    indexFilePath: "./src/data/index.txt",
    sourceFilePath: `./src/data/${sourceFile}`,
    destinationFilePath: `./src/data/${destFile}`,
  });
}

main();

/**
 * File should have a header at top. This header keeps information like where does the index start and where does it end.
 * So that the file can be queried partially just to load the index in memory while the entire file can stay on disk.
 *
 * Header itself should be of fixed length, no matter the data in it.  So that it can be queried deterministically by the server.
 *
 * version: 1.0
 * index_start: some_number
 * index_length: some_number
 * data_start: some_number
 * data_length: some_number
 */
