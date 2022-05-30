//Negative Cases
//----------------------------------------------------------------
async function sendFundsInMaintenance(test) {
    //Try to send funds while contract is in maintenance mode by the admin.
    //After deployment it is set in maintenance mode automatically.
    try {
        const receipt = await test.sendFunds(test.user1,test.user2, '0.5'); //Send 0.5 there
        return test.fail(receipt);
    } catch (exception) {
        if (!("reason" in exception)) throw exception;
        if (exception.reason.includes("contract is in maintenance")) {
            return test.pass(exception.receipt);
        } else {
            return test.fail(exception.receipt);
        }
    }
}
async function addNewRuleFromUser(test) {
    //Try to add a VAT rule from a user address
    //We expect to fail because only the admin can do that
    try {
        const receipt = await test.addRule(test.user1, '0.05', '0');
        return test.fail(receipt)
    } catch (exception) {
        if (!("reason" in exception)) throw exception;
        if (exception.reason.includes("can only be called by the administrator")) {
            return test.pass(exception.receipt)
        }
        return test.fail(exception.receipt)
    }
}

async function disableMaintenanceFromUser(test){
    try{
        const receipt = await test.setMaintenance(test.user1,false);
        return test.pass(receipt);
    }catch(exception){
        if (!("reason" in exception)) throw exception;
        if (exception.reason.includes("can only be called by the administrator")) {
            return test.pass(exception.receipt)
        }
        return test.fail(exception.receipt)
    }
}

//Positive Cases
//----------------------------------------------------------------
async function sendFundsToContract(test) {
    //Sending funds to contract should result in getting your funds back
    const web3 = test.web3;
    const gas = (await web3.eth.getBlock("latest")).gasLimit;
    const contractAddress = test.contractAddress;
    const initialBalance = await web3.eth.getBalance(contractAddress);
    const gasPrice = await web3.eth.getGasPrice();
    const receipt = await web3.eth.sendTransaction({
        from: test.user1,
        to: contractAddress,
        value: await web3.utils.toWei('1'), //Send 1 ETH
        gas: gas,
        gasPrice: gasPrice
    });
    let gain = await web3.eth.getBalance(contractAddress);
    gain = gain - initialBalance;
    //Check if the contract send the funds back :
    if (gain == 0) {
        return test.pass(receipt);
    }
    return test.fail(receipt);
}
async function addFourNewRulesFromAdmin(test) {
    //Add 4 new VAT rules from the admin address.
    //We expect the new rules to be added to the contract
    let gas = 0;
    try {
        const rulesToAdd = [
            //Warning changing these rules can cause send funds test cases to fail
            { 'ceilAmount': '0.05', 'percentage': '0', 'taxID': false },
            { 'ceilAmount': '10', 'percentage': '6', 'taxID': true},
            { 'ceilAmount': '100', 'percentage': '13', 'taxID': true },
            { 'ceilAmount': '120', 'percentage': '24', 'taxID': true }
        ];
        let pass = true;
        await test.initializeVatRules(test.admin);
        let receipt;
        for (rule in rulesToAdd) {
            rule = rulesToAdd[rule];
            receipt = await test.addRule(test.admin, rule.ceilAmount, rule.percentage, rule.taxID);
            gas += receipt.gasUsed;
            const latestRule = await test.getLatestRule(test.admin);
            const vatRule = await test.getRuleValues(test.admin, latestRule)
            if (vatRule.ceilAmount != await test.web3.utils.toWei(rule.ceilAmount) || vatRule.vatPercentage != 100 - rule.percentage) {
                pass = false;
            }
        }
        receipt.gasUsed = gas;
        if (pass) return test.pass(receipt);
        else return test.fail(receipt);
    } catch (exception) {
        if (!('receipt' in exception)) throw exception;
        exception.receipt.gasUsed += gas;
        return test.fail(exception.receipt);
    }
}
async function disableMaintenanceFromAdmin(test){
    const receipt = await test.setMaintenance(test.admin,false);
    return test.pass(receipt);
}

async function sendFundsNoVAT(test){
    const initialBalance = parseFloat(await test.getBalance(test.user2));
    const receipt = await test.sendFunds(test.user1,test.user2,'0.04');
    const newBalance = parseFloat(await test.getBalance(test.user2));
    if (initialBalance + 0.04 - newBalance < 0.000000000001){ //Allow a small slippage
        return test.pass(receipt);
    }
    return test.fail(receipt);
}

async function sendFundsTaxID(test){
    const initialBalance = parseFloat(await test.getBalance(test.user2));
    const taxID = 'A100200300';
    const amount = 20; //Changing this can cause next test cases to fail, we need to use the third rule
    const receipt = await test.sendFunds(test.user1,test.user2,test.web3.utils.toBN(amount),taxID);
    const newBalance = parseFloat(await test.getBalance(test.user2));
    const fundsReceived = test.getUserFundsReceived(test.user2,test.user2,taxID);
    if (fundsReceived - amount * 0.87 >= 0.000000000001){
        test.fail(receipt);
    }
    if (initialBalance + amount * 0.87 - newBalance < 0.000000000001){ //13% vat is expected to be applied, allow a small slippage
        return test.pass(receipt);
    }
    return test.fail(receipt);
}

async function checkMostFundsReceived(test){
    //We send a big amount from user2 to user3 who have a different tax id.
    //The amount send is also bigger than the top ceil amount to check if the latest \
    //VAT rule will be selected.
    //We expect to get the user ID (taxID + address) of user3 when we call getRecipientWithMostFundsReceived.
    const taxID = 'B100200300';
    const amount = 130; //Changing this can cause next test cases to fail, we need to use the latest rule
    const initialBalance = parseFloat(await test.getBalance(test.user3));
    let receipt = await test.sendFunds(test.user2,test.user3,test.web3.utils.toBN(amount),taxID);
    const newBalance = parseFloat(await test.getBalance(test.user3));
    if (initialBalance + amount * 0.76 - newBalance >= 0.000000000001){ //24% vat is expected to be applied, allow a small slippage
        return test.fail(receipt);
    }
    //We try to get the recipient with most funds received from a non admin address
    //to test if this fails. We expect to fail, only admins can call this function.
    let failed = false;
    try{
        await test.getRecipientWithMostFundsReceived(test.user3);
    }
    catch{
        failed = true;
    }
    if (!failed) {
        return test.fail(receipt);
    }

    //Now we get the recipient with most funds received from the admin address
    const userID = await test.getRecipientWithMostFundsReceived(test.admin);
    if (userID != taxID + test.user3.toLowerCase()){
        return test.fail(receipt);
    }

    const fundsReceived = await test.getUserFundsReceivedByUserID(test.user1,userID);
    //Check if received funds is the same when we call the same method with taxID and user address:
    if (fundsReceived - await test.getUserFundsReceived(test.user2,test.user3,taxID) >= 0.000000000001){
        return test.fail(receipt);
    }

    //Finally check if the funds received are correct
    if ( fundsReceived - amount * 0.76 >= 0.000000000001 ){
        return test.fail(receipt);
    }

    return test.pass(receipt);
}

async function checkVatRuleBalances(test){
    const totalBalance = parseFloat(await test.getTotalBalance(test.user1));
    const thirdRuleBalane = parseFloat(await test.getVatBalance(test.admin,3));
    const lastRuleBalance = parseFloat(await test.getVatBalance(test.admin,await test.getLatestRule(test.admin)));
    if (totalBalance != thirdRuleBalane + lastRuleBalance)
        return test.fail();
    return test.pass();
}

module.exports = {
    //> Add the test methods you want to be executed.
    //> Execution order is from top to bottom.
    //> Changes are done on the blockchain so it
    //  matters in what order you put the test cases.
    1:["Send funds while the contract is in maintenance",sendFundsInMaintenance],
    2:["Send funds to contract address",sendFundsToContract],
    3:["Add new VAT rule but from a non admin address",addNewRuleFromUser],
    4:["Add four new rules from the admin address",addFourNewRulesFromAdmin],
    5:["Disable contract maintenance from user address",disableMaintenanceFromUser],
    6:["Disable contract maintenance from admin address",disableMaintenanceFromAdmin],
    7:["Send funds with a zero VAT percentage rule",sendFundsNoVAT],
    8:["Send funds with a VAT percentage rule that requires taxID",sendFundsTaxID],
    9:["Send funds to another taxID and get the one with most funds received",checkMostFundsReceived],
    10:["Get VAT rule balances and check if they are as expected",checkVatRuleBalances]
};