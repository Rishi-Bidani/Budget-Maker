var ul = document.getElementById('navList');

ul.onclick = function(event) {
    var compare = event.target.innerText;
    if (compare == "HOME") {
        console.log('Reached')
        ipcRenderer.send("which:Window",
            "window:home");
    } else if (compare == "PLAN BUDGET") {
        ipcRenderer.send("which:Window",
            "window:PlanBudget");
    }else if(compare == "ADD EXPENSES"){
        ipcRenderer.send("which:Window", "window:AddExpenses")
    }else if(compare == "VIEW PAST DETAILS"){
        ipcRenderer.send("which:Window", "window:PastDetails")
    }
     else {
        console.log("ERROR")
    }
};