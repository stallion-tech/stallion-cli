#!/usr/bin/env node
const fs = require("fs")
const rimraf = require("rimraf")
const minMajorVersion = 14;
const minMinorVersion = 0;

function getCurrentVersion() {
    const matches = process.version.match(/v?(\d+)\.(\d+)\.(\d+)/);
    return [+matches[1], +matches[2]];
}

function ensureNodeVersion() {
    const currentVersion = getCurrentVersion();
    const major = currentVersion[0];
    const minor = currentVersion[1];
    if (major > minMajorVersion) {
        return true;
    }
    if (major === minMajorVersion && minor >= minMinorVersion) {
        return true;
    }

    console.log(`stallion command requires at least node version ${minMajorVersion}.${minMinorVersion}.0.`);
    console.log(`You are currently running version ${process.version}.`);
    console.log(`Please upgrade your version of node.js to at least ${minMajorVersion}.${minMinorVersion}.0`);
    return false;
}

function runCli() {
    const path = require('path');
    const chalk = require('chalk');
    const { CommandRunner } = require('../dist/command-line/command-runner');
    const { failed } = require('../dist/command-line/command-result');
    const runner = new CommandRunner(path.join(__dirname, '..', 'dist', 'commands'));
    const args = process.argv.slice(2);

    runner.run(args).then((result) => {
        if (failed(result)) {
            console.error(`${chalk.bold.red('Error:')} ${result.errorMessage}`);
            process.exit(result.errorCode);
        }
    });
}

if (ensureNodeVersion()) {
    runCli();
} else {
    process.exit(1);
}

['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) =>
    process.on(signal, () => {
        process.exit(1);
    })
);

process.on('exit', () => {
    fs.readdirSync('./')
        .filter((f) => f.includes('stallion-temp'))
        .map((f) => rimraf.sync(f));
});
