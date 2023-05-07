import { open, mkdtemp } from "node:fs/promises";
import {
  createWriteStream,
  statSync,
  readFileSync,
  createReadStream,
} from "node:fs";
import * as fs from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// {
//    [key]: [startIndex, length]
// }
const map = {};
let key = "",
  value = null;
let readingKey = true;

function addValue(obj, currentIndex) {
  if (obj == null) return [currentIndex, 1];
  const [startIndex, length] = obj;
  const updatedLength = currentIndex - startIndex;
  return [startIndex, updatedLength];
}

function parseKeyValue(input) {
  const str = input.toString().split("");
  let index = 0;
  while (index < str.length) {
    switch (str[index]) {
      case " ": {
        if (readingKey === true && str[index + 1] === " ") {
          readingKey = false;
        } else {
          if (readingKey === true) key += str[index];
          else value = addValue(value, index);
        }
        break;
      }
      case "\n": {
        // If we're reading value and encounter a newline then the value is complete.
        if (readingKey === false) {
          // Conclude our reading of key-value pair
          map[key] = value;
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
        if (readingKey === true) key += str[index];
        else value = addValue(value, index);
      }
    }
    index++;
  }
}

async function mergeFiles(filesList, outFile) {
  const read1 = fs.createReadStream("./header.txt");
  const write = fs.createWriteStream("./data.txt");
  read1.pipe(write);

  const anotherRead = fs.createReadStream("./index.txt");
  const anotherWrite = fs.createWriteStream("./data.txt", { start: 56 });
  anotherRead.pipe(anotherWrite);

  const oneMoreRead = fs.createReadStream("./dictionary.txt");
  const oneMoreWrite = fs.createWriteStream("./data.txt", {
    start: 56 + statSync("index.txt").size + 1,
  });
  oneMoreRead.pipe(oneMoreWrite);
}

async function main() {
  const fileHandle = await open("./dictionary.txt");
  const stream = fileHandle.createReadStream({ highWaterMark: 64 * 2048 });
  for await (const chunk of stream) {
    parseKeyValue(chunk);
  }
  if (key !== "" && value !== null) {
    // flush the last pair
    map[key] = value;
  }
  await fileHandle?.close();

  const indexHandle = await open("./index.txt", "w");
  indexHandle.write(JSON.stringify(map));
  await indexHandle?.close();

  const headerFileHandle = await open("./header.txt", "w");
  const size = statSync("index.txt").size;
  console.log(statSync("index.txt"));
  headerFileHandle.write(
    `version: 1.0 \n index_start: 000000 \n index_length: ${size}`
  );
  await headerFileHandle?.close();

  await mergeFiles(["./index.txt", "./header.txt"], "data.txt");
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
