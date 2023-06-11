/**
 * This file deals with update to the original dictionary.
 * It expects the modifications/additions in a text file, where key and value are separated by space, values end with newline.
 *
 * Output is a new dictionary.txt where the updated is applied on the original dictionary.
 */
import { resolve } from "node:path";
import { createReadStream } from "node:fs";
import { open } from "node:fs/promises";
import { LineReader } from "./LineReader.js";
import { FileWriter } from "./FileWriter.js";

const MODIFICATIONS_FILE_NAME = "update_dictionary.txt";
const ORIGINAL_FILE_NAME = "dictionary.txt";
const OUTPUT_FILE_NAME = "new_dictionary.txt";

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
    console.log("==========> ", str);
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
    if (key1 === key2) {
      // If both keys are same then the updated data overwrites the existing data
      await destination.write(line2);
      line2 = await changedFileReader.readLine();
      line1 = await originalFileReader.readLine();
    } else if (key1 < key2) {
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

async function main() {
  const originalFileReader = new LineReader(
    "./src/data/original_dictionary.txt"
  );
  const changedFileReader = new LineReader("./src/data/update_dictionary.txt");
  const destination = new FileWriter("./src/data/new_dictionary.txt");
  await mergeLines(originalFileReader, changedFileReader, destination);
  originalFileReader.close();
  changedFileReader.close();
  destination.close();
}

main();
