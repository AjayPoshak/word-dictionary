import * as fs from "node:fs";

async function main() {
  const read1 = fs.createReadStream("./header.txt");
  const write = fs.createWriteStream("./data.txt");
  read1.pipe(write);

  const anotherRead = fs.createReadStream("./index.txt");
  const anotherWrite = fs.createWriteStream("./data.txt", { start: 56 });
  anotherRead.pipe(anotherWrite);
}
main();
