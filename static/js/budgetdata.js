class manageBudgetData {
    constructor(data) {
        this.data = JSON.parse(data[0]["budget"]);
    }
    totalForCategory(category) {
      let totalAmountArr;
      this.data.forEach( function(element, index) {
        if(element["title"] == `${category}`){
          totalAmountArr = element["amount"];
        }else{}
      });
      // the input can only be integers, and this is an offline app
      // so eval is fine
      return eval(totalAmountArr.join('+'))
    }
    CategoriesWithAmount(){
      let catWithAmt = {};
      this.data.forEach( (element, index) => {
        catWithAmt[`${element["title"]}`] = this.totalForCategory(`${element["title"]}`);
      });
      return catWithAmt;
    }
    CategoriesWithSubcat(){
      let catwithsub = {};
      this.data.forEach((element, index)=>{
        catwithsub[`${element["title"]}`] = element["subcategories"];
      });
      return catwithsub;
    }
    SubcatWithAmount(){
      let subwithamt ={};
      this.data.forEach((element, index)=> {
        for(let i=0; i<element["subcategories"].length; i++){
          subwithamt[`${element["subcategories"][i]}`] = element["amount"][i];
        }
        
      });
      return subwithamt;
    }

}

module.exports = manageBudgetData;