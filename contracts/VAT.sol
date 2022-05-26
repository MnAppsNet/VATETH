// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

contract VAT{
    //Errors :
    error MaxRulesReached(uint8 ruleID);                //RuleID is type UINT8 which means we can have a maximum of 255 rules
    error AscendingOrderRequired(uint maxCeilAmount);   //VAT Ceil Amounts need to be stored in ascending order
    error Exception(string message);                    //A general perpuse exception to return a message

    //Structures :
    struct user{    //Used to handle user info
        address acount;                                 //The account of the user
        string taxID;                                   //The tax ID of the user
        string comment;                                 //A comment given with the biggest amount send (not mandatory if not specified)
        uint maxAmount;                                 //The max amount sent
    }
    struct VATRule{ //Used to handle VAT rules
        uint8 percentage;                               //The VAT percentage of a specific rule
        uint ceilAmount;                                //The ceil amounts of a specific rule
        uint balance;                                   //The balance of a specific rule
        mapping(string=>user) users;                    //Users that provided a tax id (address + taxid => user)
        bool requireTaxID;                              //It is set to true if a tax id is required
        bool requireComment;                            //It is set to true if a comment is required
    }

    //State variables :
    address payable private admin;                      //Admin can modify the VAT percentages
    uint8 private latestRule;                           //Latest rule in the vatPercenteges
    mapping(uint8 => VATRule) private VATRules;         //The details of each VAT Rule
    bool private maintenance;                           //Can be set to true by the admin to disable the use of send function

    //Special methods:
    //----------------------------------------------------------------
    constructor(){
        admin = payable(msg.sender);
        latestRule = 0;     //No rules initially
        latestRule = 0;     //Rule IDs will starts from 1, we keep 0 for any possible special cases
        maintenance = true; //By default maintenance is set to true when the contract is deployed
    }
    receive() external payable{
        payable(msg.sender).transfer(msg.value); //Send money back...
    }

    //Modifiers :
    //----------------------------------------------------------------
    modifier adminOnly{
        if(msg.sender != admin) revert Exception("This function can only be called by the administrator");
        _; //Functions with this modifier are executed only by the admin
    }

    //Admin functions :
    //----------------------------------------------------------------
    function changeAdmin(address newAdmin) external adminOnly(){
        admin = payable(newAdmin);
    }
    function destroy() external adminOnly() {
        selfdestruct(admin);
    }
    function addVatRule(uint ceilAmount, uint8 percentage, bool requireTaxID, bool requireComment) external adminOnly() returns(uint8 rule){
        if (latestRule > 254) revert MaxRulesReached(latestRule); //Max rules check, overflow protection
        if (ceilAmount <= VATRules[latestRule].ceilAmount) revert AscendingOrderRequired(VATRules[latestRule].ceilAmount); //Check ceil amounts order. They need to be sorted in ascending order.
        if (percentage>99) revert Exception("VAT percentage can be up to 99%"); //Allow a vat percentage up to 99%
        latestRule += 1;
        rule = latestRule;
        VATRules[latestRule].ceilAmount = ceilAmount;
        VATRules[latestRule].percentage = 100 - percentage; //We store the percentage to be transfered from the contract, to avoid calculating it every time and spend gas
        VATRules[latestRule].requireTaxID = requireTaxID;
        VATRules[latestRule].requireComment = requireComment;
    }
    function initializeVatRules() external adminOnly(){
        //Set latest rule to 0, this will cause the rules to be overwritten when a new rule is added
        latestRule = 0;
    }
    function getLatestRuleID() external view adminOnly returns(uint8 ruleID){
        //Get the latest rule ID
        ruleID = latestRule;
    }
    function setMaintenanceFlag(bool state) external adminOnly{
        maintenance = state;
    }

    //User functions :
    //----------------------------------------------------------------
    function getVatRuleValues(uint8 ruleID) external view returns(uint ceilAmount, uint8 vatPercentage){
        //Get the current VAT rules that are active. We allow anyone to get this info in order for the
        //VAT mechanism to be transparent
        ceilAmount = VATRules[ruleID].ceilAmount;
        vatPercentage = VATRules[ruleID].percentage;
    }
    function getVatBalance(uint8 ruleID) external view returns(uint balance){
        balance = VATRules[ruleID].balance;
    }
    function getTotalBalance() external view returns(uint total){
        return address(this).balance;
    }
    function sendFunds(address receiver) external payable{
        this.sendFunds(receiver,"","");
    }
    function sendFunds(address receiver, string memory taxID) external payable{
        this.sendFunds(receiver,taxID,"");
    }
    function sendFunds(address receiver, string memory taxID, string memory comment) external payable{
        //Send funds to another address and pay VAT based on the currently active VAT rules
        if(maintenance) revert Exception("The contract is in maintenance, try again later...");
        if(msg.value <= 0) revert Exception("No funds have been sent");
        if (latestRule == 0){
            //If no rules implemented, send the funds without VAT
            send(receiver,msg.value);
            return;
        }
        uint8 rule;
        for (rule=1; rule<=latestRule; rule++) {
            if (msg.value > VATRules[rule].ceilAmount) continue;
            break;
            //If no rule found the latest is going to be used
        }
        //The check below related to the comment costs gas,
        //it can be removed, it is not that important
        if(VATRules[rule].requireComment){
            if (strCompare(comment,"")){     //Check if a comment is provided when required
                revert Exception("A comment is required but not provided");
            }else if (strlen(comment) > 80){ //80 characters are allowed max, a check in byte length would cost less gas
                revert Exception("The provided comment is too long. Max length 80 chars");
            }
        }
        //Check if taxID and if provided, keep record of the max amount sent by this user :
        if(VATRules[rule].requireTaxID){
            if (strCompare(taxID,"")){       //Check if a comment is provided when required
                revert Exception("A taxID is required but not provided");
            }else if (bytes(taxID).length > 20){ //20 bytes are allowed max
                revert Exception("The provided tax ID is too long. Max length 20 bytes");
            }
            //Keep record of the maximum amount sent by this specific user
            string memory userID = concat(toString(msg.sender),taxID);
            if (VATRules[rule].users[userID].maxAmount < msg.value){
                VATRules[rule].users[userID].maxAmount = msg.value;
                VATRules[rule].users[userID].comment = comment;
            }
        }
        uint amountToSend = (msg.value / VATRules[rule].percentage) * 100          //quotient * 100
                            + (msg.value * 100 / VATRules[rule].percentage) % 100; //remainder
        //Finally send the funds to the receipient :
        send(receiver,amountToSend);
        VATRules[rule].balance += msg.value - amountToSend; //Update Vat Rule Balance
    }

    //Private and internal functions :
    function send(address receiver, uint amount) internal{
        payable(receiver).transfer(amount);
    }
    function concat(string memory str1, string memory str2) internal pure returns(string memory concatinated) {
        //Concatenate two strings
        concatinated = string.concat(str1,str2);
    }
    function strlen(string memory str) internal pure returns (uint) {
        //Get the number of characters from an UTF-8 string
        //Some UTF-8 characters can be more than 1 byte (for example greek letters are 2 bytes)
        //The number of characters can be up to the byte length
        uint len;
        uint i = 0;
        uint bytelength = bytes(str).length;
        for (len = 0; i < bytelength; len++) {
            bytes1 b = bytes(str)[i];
            if (b < 0x80) {
                i += 1;
            } else if (b < 0xE0) {
                i += 2;
            } else if (b < 0xF0) {
                i += 3;
            } else if (b < 0xF8) {
                i += 4;
            } else if (b < 0xFC) {
                i += 5;
            } else {
                i += 6;
            }
        }
        return len;
    }
    function strCompare(string memory str1, string memory str2) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((str1))) == keccak256(abi.encodePacked((str2))));
    }
    function toString(address account) public pure returns(string memory) {
        return toString(abi.encodePacked(account));
    }
    function toString(bytes memory data) public pure returns(string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint i = 0; i < data.length; i++) {
            str[2+i*2] = alphabet[uint(uint8(data[i] >> 4))];
            str[3+i*2] = alphabet[uint(uint8(data[i] & 0x0f))];
        }
        return string(str);
    }
}