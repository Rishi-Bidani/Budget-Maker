const electron = require("electron");
const url = require("url");
const path = require("path");
const { Menu } = require("electron/main");
const { app, BrowserWindow, ipcMain, webContents } = electron;

let windows;

app.on("ready", function() {
    windows = new BrowserWindow({
        width: 1100,
        minWidth: 900,
        minHeight: 700,
        // frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        },
    });
    windows.maximize();
    windows.loadURL(
        url.format({
            pathname: path.join(__dirname, "templates/home.html"),
            protocol: "file:",
            slashes: true,
        })
    );
    //Quit app when closed
    windows.on("closed", function() {
        app.quit();
    });
});

ipcMain.on("which:Window", (e, item) => {
    if (item == "window:home") {
        windows.loadURL(
            url.format({
                pathname: path.join(__dirname, "templates/home.html"),
                protocol: "file:",
                slashes: true,
            })
        );

    } else if (item == "window:PlanBudget") {
        windows.loadURL(
            url.format({
                pathname: path.join(__dirname, "templates/planBudget.html"),
                protocol: "file:",
                slashes: true,
            })
        );

    }
})