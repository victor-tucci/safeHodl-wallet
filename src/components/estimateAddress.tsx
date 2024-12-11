import { ethers, BigNumber } from "ethers";
import FactoryContract from "../abi/FactoryContract.json";
import { HexString } from "web3";

import {tokens} from '../token/tokens';
type TokenKey = keyof typeof tokens;

export const getEstimateAddress = async (web3:any, rawId: any, publicKeys:any[]): Promise<any> => {
    const factoryContractIn = new web3.eth.Contract(FactoryContract.abi, "0x6edC2BBB344225A86a7940C02FFad62a0776737E");
    
    const encodedKeys = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256", "string"],
        [publicKeys[0], publicKeys[1], rawId]
    );

    const address = factoryContractIn.methods.getAddress(
        "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        "0xa03603F1966d8AAE2b4528bC7946510F6EB79A22",
        encodedKeys).call();

    return address;
}

export const fetchBalance = async(web3:any, address:any): Promise<any> => {

    if (web3.utils.isAddress(address)) {  // Validate address
        try {
            const balance = await web3.eth.getBalance(address);
            const formattedBalance = web3.utils.fromWei(balance, "ether");
            return formattedBalance;
        } catch (error) {
            console.error("Error fetching balance:", error);
            throw error;
        }
    } else {
        console.error("Invalid address:", address);
        throw `Invalid address:", ${address}`;
    }
}

export const fetchERC20Balance = async (web3: any,  address: HexString, chain: TokenKey): Promise<any> => {
    console.log("Fetching ERC20 balance for:", address, "on chain:", chain);
  
    // ABI for the ERC20 `balanceOf` method
    const erc20ABI = [
      {
        constant: true,
        inputs: [{ name: '_owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'uint256' }],
        type: 'function',
      },
    ];
  
    try {
      if (chain in tokens) {
        const { address: contractAddress, decimals } = tokens[chain];
  
        // Validate the contract address
        if (web3.utils.isAddress(contractAddress)) {
          const tokenContract = new web3.eth.Contract(erc20ABI, contractAddress);
          const balance = await tokenContract.methods.balanceOf(address).call();
          const formattedBalance = Number(balance) / 10 ** decimals;
          return formattedBalance;
        } else {
          console.error("Invalid contract address:", contractAddress);
          return 0;
        }
      } else {
        console.error("Chain not found in tokens object:", chain);
        return 0;
      }
    } catch (error) {
      console.error("Error fetching ERC20 balance:", error);
      return 0;
    }
  };