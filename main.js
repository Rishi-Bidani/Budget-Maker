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
        savings: 0,
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
            total: parseFloat(planBudgetStore.get("totalBudget")),
            remaining: parseFloat(planBudgetStore.get("totalRemaining")),
            savings: parseFloat(planBudgetStore.get("savings")),
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
                console.log(planBudgetStore.get("savings"))
                windows.webContents.send("item:budgetData", {
                    total: parseFloat(planBudgetStore.get("totalBudget")),
                    remaining: parseFloat(planBudgetStore.get("totalRemaining")),
                    savings: parseFloat(planBudgetStore.get("savings")),
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
                windows.webContents.on("did-finish-load", () => {
                    windows.webContents.send("json:monthlyBudget", budget)

                })

            })

        windows.loadURL(
            url.format({
                pathname: path.join(__dirname, "templates/addExpenses.html")
            }))

    } else if (item == "window:PastDetails") {
        windows.webContents.on("did-finish-load", () => {
            knex("expenses").select().then((data) => {
                windows.webContents.send("item:expenseData", data)
            })
        });
        windows.loadURL(
            url.format({
                pathname: path.join(__dirname, "templates/pastDetails.html"),
                protocol: "file:",
                slashes: true,
            })
        );
    }
})

// Make a budget
ipcMain.on("form:planbudget", (e, item) => {
    let today = new Date();
    let todaydate = today.getFullYear() + '-' + (today.getMonth() + 1) //+ '-' + today.getDate();

    // If u enter another plan on the same day it will update 
    // the old plan instead of creating a new one
    knex
        .select('month').from('budgets')
        .where('month', '=', todaydate)
        .then((data) => {
            if (data.length >= 1) {
                knex('budgets')
                    .where('month', '=', todaydate)
                    .update({
                        budget: JSON.stringify(item.bud),
                        total: item.total
                    }).then(() => {
                        let savings = parseFloat(planBudgetStore.get("savings"));
                        savings += parseFloat(planBudgetStore.get("totalRemaining"));
                        planBudgetStore.set("savings", savings);
                        planBudgetStore.set("savings", parseFloat(savings - parseFloat(item.total)));
                        planBudgetStore.set("totalBudget", parseFloat(item.total));
                        planBudgetStore.set("totalRemaining", parseFloat(item.total));
                    })
            } else {
                knex("budgets").insert([{
                    month: todaydate,
                    budget: JSON.stringify(item.bud),
                    total: item.total,
                }]).then(() => {
                    let savings = planBudgetStore.get("savings");
                    savings += planBudgetStore.get("totalRemaining");
                    planBudgetStore.set("savings", savings);
                    planBudgetStore.set("savings", parseFloat(parseFloat(savings) - parseFloat(item.total)));
                    planBudgetStore.set("totalBudget", parseFloat(item.total));
                    planBudgetStore.set("totalRemaining", parseFloat(item.total));
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

ipcMain.on("form:income", (e, item) => {
    console.log(item);
    let currentSavings = parseFloat(planBudgetStore.get("savings"));
    planBudgetStore.set("savings", parseFloat(parseFloat(currentSavings) + parseFloat(item)));
    let newSavings = parseFloat(planBudgetStore.get("savings"));
    windows.webContents.send("item:income:update", newSavings);

})


function generateCSV(arr) {
    const array = [Object.keys(arr[0])].concat(arr)

    let csvdata = array.map(it => {
        return Object.values(it).toString()
    }).join('\n')
    fs.writeFileSync(path.join(app.getPath("downloads"), "expenses.csv"), csvdata);
}

ipcMain.on("download:csv", (e, item) => {
    knex("expenses")
        .select()
        .then(data => {
            generateCSV(data);
        })
})

function sum(obj) {
    var sum = 0;
    let keys = Object.keys(obj);
    keys.forEach(function(key, index) {
        sum = sum + parseFloat(obj[key][5]);
    });
    return sum;
}


async function asyncForEach(keys, item) {
    let arrOfObj = [];
    keys.forEach((thiskey, index) => {
        let rowObject = {
            category: item[thiskey][0],
            subcategory: item[thiskey][1],
            date: item[thiskey][2],
            paymentmethod: item[thiskey][3],
            description: item[thiskey][4],
            amount: item[thiskey][5],
        }
        arrOfObj.push(rowObject);
    })
    return arrOfObj;
}

ipcMain.on("form:expenseData", (e, item) => {
    console.log(item);
    let keys = Object.keys(item);
    console.log(keys);
    let totalExpenseAmount = item

    asyncForEach(keys, item).then((data) => {
        knex("expenses").insert(data).then(() => {
            console.log(`sum: ${sum(item)}`)
            let remainingAmount = planBudgetStore.get("totalRemaining");
            remainingAmount -= sum(item); // sum(item) = total of expenses added
            planBudgetStore.set("totalRemaining", parseFloat(remainingAmount))
        })
    })

    // keys.forEach((thiskey, index)=>{

    //   knex("expenses").insert([{
    //     category: item[thiskey][0],
    //     subcategory: item[thiskey][1],
    //     date: item[thiskey][2],
    //     paymentmethod: item[thiskey][3],
    //     description: item[thiskey][4],
    //     amount: item[thiskey][5],
    //   }]).then(()=>{
    //     totalExpenseAmount.push(item[thiskey][5]);
    //   })
    // })
})