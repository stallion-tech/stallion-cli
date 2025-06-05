const fs = require("fs/promises");
const path = require("path");
const rimraf = require("rimraf");
const prettier = require("prettier");
const chalk = require("chalk");
const { exec } = require("child_process");

const rootPath = path.resolve(__dirname, "../", "stallion-package");
const distPath = path.resolve(__dirname, "../", "dist");
const pkgJsonPath = path.resolve(__dirname, "../", "package.json");
const readmePath = path.resolve(__dirname, "../", "README.md");

async function prepRelease() {
  try {
    await deleteRoot();
    //create package dir
    await fs.mkdir(rootPath);

    //check for dist

    //copy dist dir to package dir
    await fs.cp(distPath, `${rootPath}/`, { recursive: true });

    //copy readme file
    await fs.copyFile(readmePath, `${rootPath}/README.md`);

    //copy package.json to package dir
    await fs.copyFile(pkgJsonPath, `${rootPath}/package.json`);
    const file = JSON.parse(
      await fs.readFile(`${rootPath}/package.json`, "utf8")
    );
    delete file["devDependencies"];
    await fs.writeFile(
      `${rootPath}/package.json`,
      await prettier.format(JSON.stringify(file), { parser: "json" })
    );

    // Delete the dist directory
    rimraf.sync(distPath);
    // npm pack in rootPath
    if (process.env.NODE_ENV === "development") {
      console.log("Linking globally...");
      exec(`cd ${rootPath} && pnpm link --global`);
    }
    console.log(chalk.bold.green("Success"));
  } catch (e) {
    await deleteRoot();
    console.error(`${chalk.bold.red("Error:")} ${e.toString()}`);
  }
}

async function deleteRoot() {
  try {
    rimraf.sync(rootPath);
  } catch (e) {
    throw new Error(e.toString());
  }
}

prepRelease();
