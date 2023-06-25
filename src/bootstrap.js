/**
 * This file runs before starting the server.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: "./.env.dev", debug: !!process.env.PRODUCTION });

import { storageClient } from "./utils/S3.js";
import { HEADER_LENGTH, S3_FILE_NAME } from "./constants.js";
import { parseValueFromString } from "./utils/utils.js";

async function readIndexFromS3(start, length) {
  const obj = await storageClient.getPartialFile({
    bucket: process.env.BUCKET,
    key: S3_FILE_NAME,
    range: { start: start, end: start + length - 1 },
  });
  const { Body } = obj;
  let chunks = [];
  for await (const chunk of Body) {
    chunks.push(chunk);
  }
  const chunkStr = chunks.join("");
  const chunkObj = JSON.parse(chunkStr);
  return chunkObj;
}

async function readIndexIntoMemory() {
  const obj = await storageClient.getPartialFile({
    bucket: process.env.BUCKET,
    key: S3_FILE_NAME,
    range: { start: 0, end: HEADER_LENGTH - 1 },
  });
  const { Body } = obj;
  let chunks = [];
  for await (const chunk of Body) {
    chunks.push(chunk);
  }
  const header = chunks.join("");
  const indexStart = parseInt(parseValueFromString(header, "index_start"), 10);
  const indexLength = parseInt(
    parseValueFromString(header, "index_length"),
    10
  );
  const wordIndex = await readIndexFromS3(indexStart, indexLength);
  console.log("Index reading finished");
  return { wordIndex, indexLength, indexStart };
}

export async function bootstrap() {
  const response = await readIndexIntoMemory();
  return response;
}
