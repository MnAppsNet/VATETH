const Web3 = require('web3');
const fs = require('fs').promises;

class tools{
    static index = 1;
    static getTime(){
        return Date.now();
    }
    static connectToNode(provider){
        const web3Provider = new Web3.providers.HttpProvider(provider);
        return new Web3(web3Provider);
    }
    static async readFiles(binFile,abiFile){
        const contractBin = await fs.readFile(binFile, 'utf8')
        const contractAbi = await fs.readFile(abiFile, 'utf8')
        return {"bin":contractBin,"abi":JSON.parse(contractAbi)}
    }
}

module.exports = tools