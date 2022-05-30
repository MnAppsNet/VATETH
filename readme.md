# VATETH

## About the project
VATETH is a project that is created in the context of the subject “Decentralized Technologies”, that take place in the master’s degree program "Data and Web Science" of Aristotle University of Thessaloniki.
It is developed from scratch by Kalyvas Emmanouil.

## What is VATETH?
VATETH is a solidity smart contract designed for the Ethereum blockchain. Its purpose is to apply a VAT percentage to ETH transactions between two addresses.
The administrator address of the smart contract, has the ability to maintain the different VAT rules, put the contract in maintenance, destroy the contract and also change the administrator address.

## Contract methods
### Administrator methods :
#### addVatRule(ceilAmount,percentage,requireTaxID)
With this method, the administrator address can add a new VAT rule. Each VAT rule is characterized by three properties:
- ceilAmount   : When funds are send that are less than the ceilAmount of this rule and more than the ceil amount of the previous rule, this rule is applied
- percentage   : The percentage of the amount send that is going to be kept by the contract
- requireTaxID : A boolean value that determines whether the TaxID of the recipient is required or not.
When the taxID is required, the received funds of each user, are getting tracked based on their tax ID and address.
---
#### changeAdmin(newAdmin)
With this method, the administrator can give the administration rights to another address
---
#### destroy()
With this method, the administrator can destroy the contract
---
#### initializeVatRules()
With this method, the administrator can initialize the latestRule property value of the smart contract. By doing this, the added rules doesn't apply anymore and the new rules added will overwrite the existing.
---
#### getLatestRuleID()
With this method, the administrator can get the latestRule property value of the smart contract.
---
#### setMaintenanceFlag(state)
With this method, the administrator can set the state of the smart contract maintenance flag, which can be either true or false.
---
#### getRecipientWithMostFundsReceived()
With this method, the administrator can retrieve the userID with most funds received. The userID is a concatenation of the user tax id and its address.
---
### User methods :
#### getUserFundsReceived(taxID,userAddress) or getUserFundsReceived(userID)
With this method, anyone can get the total funds received by a user given its tax ID and address or given the userID
---
#### getVatRuleValues(ruleID)
With this method, given the ruleID, anyone can get the parameters of that particular VAT rule
---
#### getVatBalance(ruleID)
With this method, given the ruleID, anyone can get the balance of a particular VAT rule
---
#### getTotalBalance()
With this method, anyone can get the total balance collected by the contract
---
#### sendFunds(receiver) or sendFunds(receiver,taxID)
This method is called when someone want to send some funds to someone else. The receiver argument is a mandatory field and determines where the funds will go to while the taxID is the tax ID of the receiver and it is mandatory only when this is defined in the VAT rule.