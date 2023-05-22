import * as dotenv from "dotenv";
dotenv.config({ path: "./.env.dev", debug: true });

import { createServer } from "node:http";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { parseValueFromString } from "./utils.js";
import { REGION, HEADER_LENGTH } from "./constants.js";
import { S3 } from "./S3.js";

const storageClient = new S3();

let INDEX_LENGTH = null,
  INDEX_START = null,
  wordIndex = null;

function capitalize(str) {
  const tokens = str.split("");
  tokens[0] = tokens[0].toUpperCase();
  return tokens.join("");
}

async function readKeyFromData(keyName, dataRange) {
  console.log({ keyName, dataRange });
  const [dataStartIndex, keyLength] = dataRange;
  const startIndex = HEADER_LENGTH + INDEX_LENGTH + dataStartIndex;
  const endIndex = startIndex + keyLength + 1;
  const obj = await storageClient.getPartialFile({
    bucket: process.env.BUCKET,
    key: "data_v3.txt",
    range: { start: startIndex, end: endIndex },
  });
  const { Body } = obj;
  let chunks = [];
  for await (const chunk of Body) {
    chunks.push(chunk);
  }
  const chunkStr = chunks.join("");
  console.log(chunkStr);
  return chunkStr;
}

const server = createServer(async (request, response) => {
  const { method, url } = request;
  if (method === "GET") {
    const [, path, key] = url.split("/");
    console.log(url, { path, key });
    // GET => /keys/{keyName}
    if (path === "keys") {
      const keyName = capitalize(key);
      if (wordIndex[keyName] !== undefined) {
        console.log(wordIndex[keyName]);
        const value = await readKeyFromData(keyName, wordIndex[keyName]);
        response.end(value);
      } else {
        response.end("KEY does not Exists");
      }
    }
  } else {
    response.end();
  }
});

server.listen(4000);

async function readIndexFromS3(start, length) {
  const obj = await storageClient.getPartialFile({
    bucket: process.env.BUCKET,
    key: "data_v3.txt",
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
    key: "data_v3.txt",
    range: { start: 0, end: HEADER_LENGTH - 1 },
  });
  const { Body } = obj;
  let chunks = [];
  for await (const chunk of Body) {
    chunks.push(chunk);
  }
  const header = chunks.join("");
  console.log("========> ", header);
  INDEX_START = parseInt(parseValueFromString(header, "index_start"), 10);
  INDEX_LENGTH = parseInt(parseValueFromString(header, "index_length"), 10);
  wordIndex = await readIndexFromS3(INDEX_START, INDEX_LENGTH);
  console.log("Index reading finished");
}

readIndexIntoMemory();
