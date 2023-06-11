import { createServer } from "node:http";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { HEADER_LENGTH } from "./constants.js";
import { storageClient } from "./utils/S3.js";
import { bootstrap } from "./bootstrap.js";

/**
 * First read the index from S3 into memory before starting the server
 */
const {
  wordIndex,
  indexStart: INDEX_START,
  indexLength: INDEX_LENGTH,
} = await bootstrap();

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
    key: "after_update_data_v2.txt",
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
      console.log("======> ", { keyName });
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

server.listen(4000, () => {
  console.log("server has started listening on 4000");
});
