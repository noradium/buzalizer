"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Native
const path_1 = require("path");
const url_1 = require("url");
// Packages
const electron_1 = require("electron");
const electron_is_dev_1 = __importDefault(require("electron-is-dev"));
const electron_next_1 = __importDefault(require("electron-next"));
const childProcess = require("child_process");
const spawn = childProcess.spawn;
const util = require("util");
const execPromise = util.promisify(childProcess.exec);
const exec = (command, args, cwd, onData) => {
    const promise = new Promise((resolve) => {
        console.log(`${command} ${args}`);
        const childProcess = spawn(command, args.split(" "), { cwd });
        childProcess.stdout.on("data", (data) => {
            onData(data.toString().trim());
        });
        childProcess.stdout.on("end", () => {
            resolve();
        });
    });
    return promise;
};
// Prepare the renderer once the app is ready
electron_1.app.on("ready", async () => {
    await (0, electron_next_1.default)("./renderer");
    const mainWindow = new electron_1.BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
            preload: (0, path_1.join)(__dirname, "preload.js"),
        },
    });
    // mainWindow.webContents.openDevTools();
    const url = electron_is_dev_1.default
        ? "http://localhost:8000/"
        : (0, url_1.format)({
            pathname: (0, path_1.join)(__dirname, "../renderer/out/index.html"),
            protocol: "file:",
            slashes: true,
        });
    mainWindow.loadURL(url);
});
// Quit the app once all windows are closed
electron_1.app.on("window-all-closed", async () => {
    await execPromise(`docker-compose down`, {
        cwd: `${process.cwd()}/tools/analyzer`,
    });
    electron_1.app.quit();
});
// listen the channel `message` and resend the received message to the renderer process
electron_1.ipcMain.on("message", async (event, message) => {
    if (message.type === "twitter_search") {
        await exec("node", `--experimental-modules --loader ts-node/esm twitter/index.ts --query ${message.args.query} --since ${message.args.since} --until ${message.args.until}`, process.cwd() + "/tools/crawler", (data) => {
            console.log(data);
            event.sender.send("message", {
                type: "twitter_search",
                data: {
                    stream: data,
                },
            });
        });
        event.sender.send("message", {
            type: "twitter_search",
            data: {
                stream: "完了しました",
            },
        });
    }
    else if (message.type === "open_dir") {
        electron_1.shell.openPath(process.cwd() + "/tools/crawler/data");
    }
    else if (message.type === "launch_analyzer") {
        try {
            await execPromise(`ls ${process.cwd()}/tools/analyzer/node_modules`);
        }
        catch (error) {
            await execPromise(`npm ci`, { cwd: `${process.cwd()}/tools/analyzer` });
        }
        await exec("docker-compose", "up", `${process.cwd()}/tools/analyzer`, (data) => {
            console.log(data);
            event.sender.send("message", {
                type: "launch_analyzer",
                data: {
                    stream: data,
                },
            });
        });
    }
});
