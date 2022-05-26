@echo off
solc --bin contracts\VAT.sol -o output --overwrite
solc --abi contracts\VAT.sol -o output --overwrite
solc --gas contracts\VAT.sol
pause