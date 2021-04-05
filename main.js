const electron = require("electron");
const url = require("url");
const path = require("path");
const { Menu } = require("electron/main");
const { app, BrowserWindow, ipcMain, webContents } = electron;

app.on("ready", function () {
  mainWindow = new BrowserWindow({
    width: 1100,
    minWidth: 900,
    minHeight: 700,
  });
  mainWindow.maximize();
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "templates/home.html"),
      protocol: "file:",
      slashes: true,
    })
  );
  //Quit app when closed
  mainWindow.on("closed", function () {
    app.quit();
  });
});