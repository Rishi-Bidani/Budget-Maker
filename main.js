const electron = require("electron");
const url = require("url");
const path = require("path");
const { Menu } = require("electron/main");
const { app, BrowserWindow, ipcMain, webContents } = electron;
const Store = require('./static/js/storage.js');
const userDataPath = (electron.app || electron.remote.app).getPath('userData');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(path.join(userDataPath, 'planbudget.db'), err=>{
  if(err){
    console.log(err);
  }
});

//SET ENV
process.env.NODE_ENV = "development";

let windows;

try {
    db.serialize(function() {
        db.run("CREATE TABLE IF NOT EXISTS budgets(id SERIAL PRIMARY KEY, month TEXT, budget)");
    });
} catch (e) {
    console.log(e);
}

db.close();

knex = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: path.join(userDataPath, "planbudget.db")
    },
    useNullAsDefault: true,
});
// console.log(path.join(userDataPath, "planbudget.sqlite"))


const store = new Store({
    configName: 'configState',
    defaults: {}
});
// store.set("databaseCreated", );


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


ipcMain.on("form:planbudget", (e, item) => {
    console.log(item);
    knex("budgets").insert([{
        month: "jan",
        budget: JSON.stringify(item)
    }]).then(() => {})

    knex.select('budget').from("budgets").then((data) => {
        console.log(data);
    })

})