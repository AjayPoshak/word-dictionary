import * as dotenv from "dotenv";
dotenv.config({ path: "./.env.dev", debug: !!process.env.PRODUCTION });

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { REGION } from "./constants.js";

class S3 {
  constructor() {
    this.s3Client = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
      },
    });
  }

  async getPartialFile({ bucket, key, range }) {
    if (range.start === undefined)
      throw new Error("start key missing in range");
    if (range.end === undefined) throw new Error("end key missing in range");
    const { start, end } = range;
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: `bytes=${start}-${end}`,
    });
    console.log("=======> range ", { start, end });
    const obj = await this.s3Client.send(command);
    return obj;
  }
}

export const storageClient = new S3();
