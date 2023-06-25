/**
 * This file deals with update to the original dictionary.
 * It expects the modifications/additions in a text file, where key and value are separated by two spaces, values end with newline.
 *
 * Output is a new dictionary.txt where the updated is applied on the original dictionary.
 */
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { createReadStream } from "node:fs";
import { open } from "node:fs/promises";
import { LineReader } from "../src/utils/LineReader.js";
import { FileWriter } from "../src/utils/FileWriter.js";

function merge(listA, listB) {
  const mergedList = [];
  let ptrA = 0;
  let ptrB = 0;
  while (ptrA < listA.length && ptrB < listB.length) {
    if (listA[ptrA] < listB[ptrB]) {
      mergedList.push(listA[ptrA]);
      ptrA++;
    } else {
      mergedList.push(listB[ptrB]);
      ptrB++;
    }
  }
  while (ptrA < listA.length) {
    mergedList.push(listA[ptrA]);
    ptrA++;
  }
  while (ptrB < listB.length) {
    mergedList.push(listB[ptrB]);
    ptrB++;
  }
  return mergedList;
}

function getKey(str) {
  try {
    const splitStr = str.split(" ");
    return splitStr[0];
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function mergeLines(originalFileReader, changedFileReader, destination) {
  let line1 = await originalFileReader.readLine();
  let line2 = await changedFileReader.readLine();
  while (line1 && line2) {
    const key1 = getKey(line1);
    const key2 = getKey(line2);
    console.log({ key1, key2 });
    const comparison = key1.localeCompare(key2);
    if (comparison === 0) {
      // If both keys are same then the updated data overwrites the existing data
      await destination.write(line2);
      line2 = await changedFileReader.readLine();
      line1 = await originalFileReader.readLine();
    } else if (comparison === -1) {
      // `key1` is smaller than `key2`
      await destination.write(line1);
      line1 = await originalFileReader.readLine();
    } else {
      await destination.write(line2);
      line2 = await changedFileReader.readLine();
    }
  }
  while (line1) {
    await destination.write(line1);
    line1 = await originalFileReader.readLine();
  }

  while (line2) {
    await destination.write(line2);
    line2 = await changedFileReader.readLine();
  }
}

function parseCommandValues() {
  const options = {
    source: {
      type: "string",
    },
    modified: {
      type: "string",
    },
    dest: {
      type: "string",
    },
  };
  const { values } = parseArgs({ options });
  return {
    originalFilePath: values.source,
    modifiedFilePath: values.modified,
    destinationFilePath: values.dest,
  };
}

async function main() {
  const { originalFilePath, modifiedFilePath, destinationFilePath } =
    parseCommandValues();
  const originalFileReader = new LineReader(`./src/data/${originalFilePath}`);
  const changedFileReader = new LineReader(`./src/data/${modifiedFilePath}`);
  const destination = new FileWriter(`./src/data/${destinationFilePath}`);
  await mergeLines(originalFileReader, changedFileReader, destination);
  originalFileReader.close();
  changedFileReader.close();
  destination.close();
}

main();
