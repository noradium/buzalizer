// Native
import { join } from "path";
import { format } from "url";

// Packages
import { BrowserWindow, app, ipcMain, IpcMainEvent, shell } from "electron";
import isDev from "electron-is-dev";
import prepareNext from "electron-next";
const childProcess = require("child_process");
const spawn = childProcess.spawn;
const util = require("util");
const execPromise = util.promisify(childProcess.exec);

const exec = (
  command: string,
  args: string,
  cwd: string,
  onData: (data: string) => void
): Promise<void> => {
  const promise: Promise<void> = new Promise((resolve) => {
    console.log(`${command} ${args}`);

    const childProcess = spawn(command, args.split(" "), { cwd });

    childProcess.stdout.on("data", (data: any) => {
      onData(data.toString().trim());
    });

    childProcess.stdout.on("end", () => {
      resolve();
    });
  });
  return promise;
};

// Prepare the renderer once the app is ready
app.on("ready", async () => {
  await prepareNext("./renderer");

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      preload: join(__dirname, "preload.js"),
    },
  });
  // mainWindow.webContents.openDevTools();

  const url = isDev
    ? "http://localhost:8000/"
    : format({
        pathname: join(__dirname, "../renderer/out/index.html"),
        protocol: "file:",
        slashes: true,
      });

  mainWindow.loadURL(url);
});

// Quit the app once all windows are closed
app.on("window-all-closed", async () => {
  await execPromise(`docker-compose down`, {
    cwd: `${process.cwd()}/tools/analyzer`,
  });
  app.quit();
});

// listen the channel `message` and resend the received message to the renderer process
ipcMain.on("message", async (event: IpcMainEvent, message: any) => {
  if (message.type === "twitter_search") {
    await exec(
      "node",
      `--experimental-modules --loader ts-node/esm twitter/index.ts --query ${message.args.query} --since ${message.args.since} --until ${message.args.until}`,
      process.cwd() + "/tools/crawler",
      (data) => {
        console.log(data);
        event.sender.send("message", {
          type: "twitter_search",
          data: {
            stream: data,
          },
        });
      }
    );
    event.sender.send("message", {
      type: "twitter_search",
      data: {
        stream: "完了しました",
      },
    });
  } else if (message.type === "open_dir") {
    shell.openPath(process.cwd() + "/tools/crawler/data");
  } else if (message.type === "launch_analyzer") {
    try {
      await execPromise(`ls ${process.cwd()}/tools/analyzer/node_modules`);
    } catch (error) {
      await execPromise(`npm ci`, { cwd: `${process.cwd()}/tools/analyzer` });
    }
    await exec(
      "docker-compose",
      "up",
      `${process.cwd()}/tools/analyzer`,
      (data) => {
        console.log(data);
        event.sender.send("message", {
          type: "launch_analyzer",
          data: {
            stream: data,
          },
        });
      }
    );
  }
});
