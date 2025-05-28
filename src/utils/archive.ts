import * as fs from "fs";
import * as archiver from "archiver";

export function createZip(
  inputPath: string,
  outputPath: string
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const output = fs.createWriteStream(`${outputPath}/build.zip`);
    const archive = archiver.create("zip");

    output.on("close", function () {
      resolve();
    });

    archive.on("error", (err: any) => {
      reject(err);
    });

    archive.pipe(output);

    archive.directory(inputPath, "build");

    await archive.finalize();
  });
}
