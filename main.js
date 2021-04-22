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

// Create tables if they don't exist => expecting it to only run the first time the app is launched
try {
    db.serialize(function() {
        db.run("CREATE TABLE IF NOT EXISTS budgets(month TEXT, budget TEXT, total INTEGER)");
        db.run("CREATE TABLE IF NOT EXISTS expenses(category TEXT, subcategory TEXT, date TEXT, paymentmethod TEXT, description TEXT, amount INTEGER)");
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

const planBudgetStore = new Store({
    configName: 'budgetData',
    defaults: {
        totalBudget: 0,
        totalRemaining: 0,
    }
})
planBudgetStore.set()

let configStorePath = path.join(userDataPath, "configState.json");
// store.set("databaseCreated", );

app.on("ready", function() {
    windows = new BrowserWindow({
        width: 1200,
        minWidth: 1200,
        minHeight: 700,
        // frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        },
    });
    // windows.setMenu(null);
    windows.webContents.on("did-finish-load", () => {
        // Check which month the budget is for
        knex('budgets').max('month', { as: 'month' }).then((maxmonth) => {
            try {
                if (fs.existsSync(configStorePath)) {
                    if (configStore.get("latestMonth") != maxmonth[0].month) {
                        configStore.set("latestMonth", maxmonth[0].month)
                    } else {}
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
    windows.webContents.on("did-finish-load", () => {
        windows.webContents.send("item:budgetData", {
            total: planBudgetStore.get("totalBudget"),
            remaining: planBudgetStore.get("totalRemaining")
        })
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
            windows.webContents.on("did-finish-load", () => {
                windows.webContents.send("item:budgetData", {
                    total: planBudgetStore.get("totalBudget"),
                    remaining: planBudgetStore.get("totalRemaining")
                })
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

    } else if (item == "window:AddExpenses") {
        let today = new Date();
        let todaydate = today.getFullYear() + '-' + (today.getMonth() + 1);
        knex
            .select('budget')
            .from('budgets')
            .where('month', '=', todaydate).then((budget) => {
                // console.log(budget)
                windows.webContents.on("did-finish-load", () => {
                    windows.webContents.send("json:monthlyBudget", budget)

                })

            })

        windows.loadURL(
            url.format({
                pathname: path.join(__dirname, "templates/addExpenses.html")
            }))
    }
})

ipcMain.on("form:planbudget", (e, item) => {
    // console.log(item);
    let today = new Date();
    let todaydate = today.getFullYear() + '-' + (today.getMonth() + 1) //+ '-' + today.getDate();

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
                        budget: JSON.stringify(item.bud),
                        total: item.total
                    }).then(() => {
                        planBudgetStore.set("totalBudget", item.total)
                    })
            } else {
                knex("budgets").insert([{
                    month: todaydate,
                    budget: JSON.stringify(item.bud),
                    total: item.total,
                }]).then(() => {
                    planBudgetStore.set("totalBudget", item.total)
                })
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

ipcMain.on("form:expenseData", (e, item)=>{
  console.log(item);
  let keys = Object.keys(item);
  console.log(keys);
  keys.forEach((thiskey, index)=>{

    knex("expenses").insert([{
      category: item[thiskey][0],
      subcategory: item[thiskey][1],
      date: item[thiskey][2],
      paymentmethod: item[thiskey][3],
      description: item[thiskey][4],
      amount: item[thiskey][5],
    }]).then(()=>{})

  })
})