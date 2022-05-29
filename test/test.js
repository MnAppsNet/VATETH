const Tools = require("./tools");
class test{
//This class contains all the functionality needed to perform the tests
    static async prepareTestClass(web3, binFile, abiFile){
        //Prepare a test class instance
        const testClass = new test();
        testClass.web3 = web3;
        await testClass.deployContract(web3, binFile, abiFile);
        return testClass;
    }
    async deployContract(web3,binFile,abiFile){
        //Deploy contract to the blockchain
        const files = await Tools.readFiles(binFile,abiFile).catch((exception) => {throw exception})
        const admin = ( await web3.eth.getAccounts())[0] //Get the first account as the contract admin account
        const gas = parseInt((await web3.eth.estimateGas({data:files.bin})) * 1.2) //Add an extra 20% of gas to make sure we have enough
        const gasPrice = (await this.getGasPrice());
        const contract = new web3.eth.Contract(files.abi);
        const initialBalance = await web3.eth.getBalance(admin)
        this.startTimer()
        const receipt = await ( contract.deploy(
            {
                data: (files.bin.startsWith('0x'))? files.bin : ('0x' + files.bin)
            }
        ).send({
            from:admin,
            gas:gas,
            gasPrice: gasPrice
        }));
        //For some reason receipt.gasUsed is not populated during deployment so I calculate it like this:
        const gasUsed = Math.round(( initialBalance - (await web3.eth.getBalance(admin))) / gasPrice);

        this.contractAddress = receipt.options.address;
        this.contract = new web3.eth.Contract(files.abi,receipt.options.address);
        this.abi = files.abi;
        this.gas = gasUsed;
        this.time = this.getTimeSpend()
        this.web3 = web3;
        this.addUser("admin",admin);
    }

    addUser(userName, address){
        this[userName] = address;
    }

    pass(receipt = ""){
        //Test was successful return PASS results
        let results = this.getResults(receipt)
        results.status = "PASS";
        return results;
    }
    fail(receipt = ""){
        //Test was not successful return FAIL results
        let results = this.getResults(receipt)
        results.status = "FAIL";
        return results;
    }
    getResults(receipt = ""){
        const results = {};
        results.time = this.getTimeSpend()
        try{
            results.gas = receipt.gasUsed;
        }catch{ results.gas = 0;}
        return results;
    }
    startTimer(){
        //Start the timer, get the time passed from the start of timer with method getTimeSpend
        this.time = Tools.getTime();
    }
    getTimeSpend(){
        //Get time spend since the timer started
        return (Tools.getTime() - this.time); //ms
    }
    async getBalance(address){
        return await this.web3.utils.fromWei(await this.web3.eth.getBalance(address), 'ether');
    }
    async getGasPrice(){
        //Returns the gas price
        return (await this.web3.eth.getGasPrice());
    }
    async estimateGas(contractMethod,fromAddress,gasPrice){
        //Estimate the gas needed for a contract method call
        if ('estimateGas' in contractMethod)
            try {
                return await contractMethod.estimateGas({from:fromAddress, gasPrice:gasPrice}); //Add an extra 10% to be sure
            }catch{
                return (await this.web3.eth.getBlock("latest")).gasLimit; //A revert has been triggered during gas calculation, use default gas limit
            }
        else
            return (await this.web3.eth.getBlock("latest")).gasLimit;
    }
    async sendFunds(fromAddress,toAddress,amount,taxID="",){
        //Send funds and return receipt
        const gasPrice = await this.getGasPrice();
        const gas = await this.estimateGas(this.contract.methods.sendFunds(toAddress));

        const amountInWai = await this.web3.utils.toWei(amount);
        return await ( this.contract.methods.sendFunds(toAddress,taxID).send({
            from: fromAddress,
            gas: gas,
            gasPrice: gasPrice,
            value:amountInWai
        }) );
    }
    async addRule(fromAddress,ceilAmount,percentage){
        //Add a new VAT rule and return receipt
        const gasPrice = await this.getGasPrice();
        const gas = await this.estimateGas(this.contract.methods.addVatRule(ceilAmount,percentage),fromAddress,gasPrice);

        ceilAmount = await this.web3.utils.toWei(ceilAmount);
        return await ( this.contract.methods.addVatRule(ceilAmount,percentage).send({
            from: fromAddress,
            gas: gas,
            gasPrice: gasPrice
        }) );
    }
    async addRule(fromAddress,ceilAmount,percentage,requireTaxID){
        //Add a new VAT rule and return receipt
        const gasPrice = await this.getGasPrice();
        const gas = await this.estimateGas(this.contract.methods.addVatRule(ceilAmount,percentage,requireTaxID),fromAddress,gasPrice);

        ceilAmount = await this.web3.utils.toWei(ceilAmount);
        return await ( this.contract.methods.addVatRule(ceilAmount,percentage,requireTaxID).send({
            from: fromAddress,
            gas: gas,
            gasPrice: gasPrice
        }) );
    }
    async setMaintenance(fromAddress, active){
        //Enable / Disable contract maintenance
        const gasPrice = await this.getGasPrice();
        const gas = await this.estimateGas(this.contract.methods.setMaintenanceFlag(active),fromAddress,gasPrice);

        return await ( this.contract.methods.setMaintenanceFlag(active).send({
            from: fromAddress,
            gas: gas,
            gasPrice: gasPrice
        }) );
    }
    async getLatestRule(fromAddress){
        //Get the latest rule ID from the contract
        return await (this.contract.methods.getLatestRuleID().call({
            from: fromAddress
        }) );
    }
    async getRuleValues(fromAddress,ruleID){
        //Get the vat rule values from contract
        return await (this.contract.methods.getVatRuleValues(ruleID).call({
            from: fromAddress
        }) );
    }
    async initializeVatRules(fromAddress){
        //Initialize latest rule ID from contract
        return await (this.contract.methods.initializeVatRules().call({
            from: fromAddress
        }) );
    }
    async getRecipientWithMostFundsReceived(fromAddress){
        //Get the useID of the recipient with the most funds received
        return await (this.contract.methods.getRecipientWithMostFundsReceived().call({
            from: fromAddress
        }) );
    }
    async getUserFundsReceived(fromAddress,userID){
        return await this.web3.utils.fromWei( await (this.contract.methods.getUserFundsReceived(userID).call({
            from: fromAddress
        }) ), 'ether');
    }
    async getUserFundsReceived(fromAddress,address,userID){
        return await this.web3.utils.fromWei( await (this.contract.methods.getUserFundsReceived(userID,address).call({
            from: fromAddress
        }) ), 'ether');
    }
}

module.exports = test;