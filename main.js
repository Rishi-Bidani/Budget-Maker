const electron = require("electron");
const url = require("url");
const path = require("path");
const { Menu } = require("electron/main");
const { app, BrowserWindow, ipcMain, webContents } = electron;
const Store = require('./static/js/storage.js');
const userDataPath = (electron.app || electron.remote.app).getPath('userData');
const fs = require('fs');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(path.join(userDataPath, 'planbudget.db'), err => {
    if (err) {
        console.log(err);
    }
});

//SET ENV
process.env.NODE_ENV = "development";

let windows;

try {
    db.serialize(function() {
        db.run("CREATE TABLE IF NOT EXISTS budgets(month TEXT, budget TEXT)");
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

const configStore = new Store({
    configName: 'configState',
    defaults: {
        monthsList: [
            "January", "February", "March", "April", "May",
            "June", "July", "August", "September", "October",
            "November", "December"
        ]
    }
});
let configStorePath = path.join(userDataPath, "configState.json");
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
    windows.webContents.on("did-finish-load", () => {
        // Check which month the budget is for
        knex('budgets').max('month', { as: 'month' }).then((maxmonth) => {
            try {
                if (fs.existsSync(configStorePath)) {
                    if (configStore.get("latestMonth") != maxmonth[0].month) {
                        configStore.set("latestMonth", maxmonth[0].month)
                    } else {
                    }
                } else {
                    configStore.set("latestMonth", maxmonth[0].month)
                }
            } catch (err) {
                console.error(err)
            }
        })
    });
    windows.webContents.on("did-finish-load", () => {
        let date = new Date();
        windows.webContents.send("item:whichMonth", {
                latestMonth: configStore.get("latestMonth"),
                month: configStore.get("monthsList")[date.getMonth()]
            }

        );
    })
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
        windows.webContents.on("did-finish-load", () => {
            let date = new Date();
            windows.webContents.send("item:whichMonth", {
                latestMonth: configStore.get("latestMonth"),
                month: configStore.get("monthsList")[date.getMonth()]
            })
        });
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
    // console.log(item);
    let today = new Date();
    let todaydate = today.getFullYear() + '-' + (today.getMonth()+1) //+ '-' + today.getDate();

    // knex.select('budget').from("budgets").then((data) => {
    //     console.log(data);
    // })

    // If u enter another plan on the same day it will update 
    // the old plan instead of creating a new one
    knex.select('month').from('budgets')
        .where('month', '=', todaydate)
        .then((data) => {
            if (data.length >= 1) {
                knex('budgets')
                    .where('month', '=', todaydate)
                    .update({
                        budget: JSON.stringify(item)
                    }).then(() => {})
            } else {
                knex("budgets").insert([{
                    month: todaydate,
                    budget: JSON.stringify(item)
                }]).then(() => {})
            }
        })

    // knex('budgets').max('month', { as: 'month' }).then((maxmonth) => {
    //     knex('budgets').where({
    //         month: maxmonth[0].month
    //     }).select('budget').then((data) => {
    //         console.log(data)
    //     })
    // })

})