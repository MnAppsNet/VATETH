const Test = require('./test');
const Tools = require('./tools');
const TestCases = require('./testCases')

const PROVIDER = 'http://127.0.0.1:8545'; //<= Make sure you are running ganache locally on port 8545
const CONTRACT_BIN_FILE = './output/VAT.bin';
const CONTRACT_ABI_FILE = './output/VAT.abi'


const web3 = Tools.connectToNode(PROVIDER)
web3.eth.handleRevert = true

//Prepare test environment:
Test.prepareTestClass(web3,CONTRACT_BIN_FILE,CONTRACT_ABI_FILE).then((testClass) => {startTesting(testClass)});

async function startTesting(test){
    //Show environment details :
    console.log("%cContract " + CONTRACT_BIN_FILE, "color:grey");
    console.log("%c--------------------------------","color:grey");
    console.log("%cDeployment gas\t: " + test.gas,"color:grey");
    console.log("%cAddress\t\t: " + test.contractAddress,"color:grey");
    console.log("%cAdministrator\t: " + test.admin,"color:grey");
    console.log(("%cTime to deploy\t: " + test.time + "ms"),"color:grey");
    console.log("%c--------------------------------","color:grey");

    //Set three extra user accounts to be used with the test scripts :
    test.addUser ("user1",( await web3.eth.getAccounts())[1]);
    test.addUser ("user2",( await web3.eth.getAccounts())[2]);
    test.addUser ("user3",( await web3.eth.getAccounts())[3]);

    for (let key in TestCases){
        testCase = TestCases[key];
        test.startTimer();
        let result = {};
        try{
            result = await ( testCase[1](test) );
        }catch(exception){
            if (!('receipt' in exception))
                throw exception;
            result = test.fail(exception.receipt)
        }
        console.log("Test Case : " + testCase[0]);
        if(typeof result === 'undefined'){
            console.log("Result \t\t: %cFAIL","color:red")
            console.log("--------------------------------");
            continue;
        }
        console.log("Result \t\t: %c" + result.status,(result.status == "PASS")?"color:green":"color:red")
        console.log("Gas Used \t: " + result.gas)
        console.log("Execution time \t: " + result.time + "ms")
        console.log("--------------------------------");
    }
}