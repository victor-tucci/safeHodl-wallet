import Web3, { HexString } from 'web3';
import { ethers } from 'ethers';
import axios from 'axios';

import {tokens} from '../token/tokens';
import {
    chainIdandType,
    chainInfo,
    ENTRYPOINT_ADDRESS,
    PAYMASTER_ADDRESS,
    VERIFIERADDRESS,
} from './chainInfo';

import {fetchERC20Balance} from './estimateAddress';
import signUserOperation from './signTx';

import Entrypoint from '../abi/entrypoint.json';
import TransactionAbi from '../abi/TransactionAbi.json'
import FactoryContract from '../abi/FactoryContract.json'

type TokenKey = keyof typeof tokens;

type UserOperation = {
    sender: HexString;
    nonce: HexString;
    initCode: HexString;
    callData: HexString;
    preVerificationGas: HexString;
    verificationGasLimit: HexString;
    callGasLimit: HexString;
    maxFeePerGas: HexString;
    maxPriorityFeePerGas: HexString;
    paymasterAndData: HexString;
    signature: HexString;
};

// Utility to get chain details
async function getChainDetails(web3: Web3) {
    const chainID = await web3.eth.getChainId();
    console.log({chainID});
    const hexChainID = `0x${chainID.toString(16)}` as keyof typeof chainIdandType;
  
    if (!(hexChainID in chainIdandType)) {
      throw new Error(`Unsupported chain ID: ${hexChainID}`);
    }
  
    const chainType = chainIdandType[hexChainID] as keyof typeof chainInfo;
    const userOpProvider = new ethers.providers.JsonRpcProvider(
      chainInfo[chainType].USER_OP_RPC_URL
    );
  
    return {
      userOpProvider,
      FACTORY_ADDRESS: chainInfo[chainType].FACTORY_ADDRESS,
      entryContract: new web3.eth.Contract(Entrypoint.abi as any, ENTRYPOINT_ADDRESS),
    };
}
  
  
// Utility to get sender address from initCode
async function getSenderAddress(entryContract: any, initCode: HexString): Promise<HexString> {
    var sender ='' as HexString;
    try {
        console.log("entryContract.methods:",entryContract.methods)
        const entrypointdeposite = await entryContract.methods.getSenderAddress(initCode).call()
        console.log({entrypointdeposite});
    }
    catch (Ex:any) {
        console.log('Exception:', Ex);
    
        if (Ex && Ex.data && Ex.data.originalError && Ex.data.originalError.data) {
            sender = "0x" + Ex.data.originalError.data.slice(-40);
        } else if (Ex && Ex.data && Ex.data.data) {
            sender = "0x" + Ex.data.data.slice(-40);
        } /*else if (Ex && Ex.cause && Ex.cause.errorArgs &&  Ex.cause.errorArgs.sender) {
            sender = Ex.cause.errorArgs.sender;
        } else if(Ex && Ex.cause && Ex.cause.data) 
        {
            sender = "0x" + Ex.cause.data.slice(-40);
        }*/
        else{
            console.error('Unable to extract sender address from error.');
        }
    }
    
    return ethers.utils.getAddress(sender);
  }

const estimateUserOperationGas = async (web3:any, userOp:any) => {
    console.log('estimateUserOperationGas function calling ...');

    const estimateGas = await web3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "eth_estimateUserOperationGas",
        params: [userOp, ENTRYPOINT_ADDRESS],
        id: new Date().getTime()
    });
    return estimateGas;
};

const sendUserOperation = async (web3:any, userOp:any) => {
    console.log('sendUserOperation function calling ...');

    const opHash = await web3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "eth_sendUserOperation",
        params: [userOp, ENTRYPOINT_ADDRESS],
        id: new Date().getTime()
    });
    return opHash;
};

export const getUserOperationByHash = async (web3:any, opHash:HexString, delay = 3000) => {

    const response = await web3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "skandha_userOperationStatus",
        params: [opHash],
        id: new Date().getTime()
    });

    return response;
};

const personalSignIn = async (userOpHash:any, rawId:string) => {
    const signature = await signUserOperation(userOpHash, rawId)
    return signature;
};

// Utility to check if an address is a contract
async function isContract(web3: Web3, address: HexString): Promise<boolean> {
    try {
      const code = await web3.eth.getCode(address);
      return code !== '0x';
    } catch (error) {
      console.error('Error checking contract:', error);
      return false;
    }
  }

const isApiResponseError = async (response:object) => {
    if (!response || typeof response !== 'object') {
        return true; // If response is undefined or not an object, it's an error
    }

    console.log("response :", response)
    if ('error' in response) {
        return true;
    }
    return false;
};

//Paymaster Process
const getExchangeRate = async (ERC20_contract:any) => {
    console.log("getExchangeRate(contract address)", ERC20_contract);
    const pm_data = {
        jsonrpc: "2.0",
        id: "0",
        method: "pm_getApprovedTokens",
        params:{}
    }
    const response = await axios.post('http://154.53.58.114:8000/paymaster', pm_data, {
        headers: { 'Content-Type': 'application/json' }
    });
    
    const tokens = response.data.result || [];
    return tokens.find((token: any)  => token.address.toLowerCase() === ERC20_contract.toLowerCase());
}

async function getSponserFromPaymaster(userOp:any, ERC20_contract:HexString) {
    const pm_data = {
        jsonrpc: "2.0",
        id: "0",
        method: "pm_sponsorUserOperation",
        params:{
          request: userOp,
          token_address: ERC20_contract
        }
      }
      const response = await axios.post('http://154.53.58.114:8000/paymaster', pm_data, {
        headers: { 'Content-Type': 'application/json' }
      });
    
      console.log("paymasterSignedData: ",response.data.result);
      return response.data.result;
}


const createTx = async (web3:any, walletAddress:HexString, rawId:string, publicKeys:any[], callData:any, executeParams:any[], paymasterAndData:any, feeType:TokenKey) => {
    console.log('createTx function calling...');
    const {userOpProvider, FACTORY_ADDRESS, entryContract} = await getChainDetails(web3);
    try {
        const encodedKeys = web3.eth.abi.encodeParameters(
            ['uint256', 'uint256', 'string'],
            [publicKeys[0], publicKeys[1], rawId]
          );

        const encodedFunctionCall = web3.eth.abi.encodeFunctionCall(TransactionAbi.createWalletABI, [ENTRYPOINT_ADDRESS, VERIFIERADDRESS ,encodedKeys, rawId]);

        var initCode = FACTORY_ADDRESS + encodedFunctionCall.slice(2);
        console.log({initCode});
        const sender = await getSenderAddress(entryContract, initCode);
        console.log({ sender });

        if (sender.toLowerCase() !== walletAddress.toLowerCase()) {
            return { error: true, message: "Owner address and contract address should be same." };
        }

        if (await isContract(web3, sender)) {
            initCode = "0x";
        }


        const userOp: UserOperation = {
            sender,
            nonce: `0x${(await entryContract.methods.getNonce(sender, 0).call()).toString(16)}`,
            initCode,
            callData,
            preVerificationGas: '0x',
            verificationGasLimit: '0x',
            callGasLimit: '0x',
            maxFeePerGas: '0x',
            maxPriorityFeePerGas: '0x',
            paymasterAndData,
            signature:
              '0x643b8c4c46aaaf54fce00b774621525d0ea6402f8a4d344c2d2fc196b32b26098cbfccc3d902a21f601349d5956c34b02d3845d101edaea23c6080ec0287ea2300000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000002549960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000037222c226f726967696e223a22687474703a2f2f6c6f63616c686f73743a35313733222c2263726f73734f726967696e223a66616c73657d000000000000000000',
        };

        const userOpsamp = {
            sender,
            nonce: "0x" + (await entryContract.methods.getNonce(sender, 0).call()).toString(16),
            initCode,
            callData,
            paymasterAndData,
            signature: "0x643b8c4c46aaaf54fce00b774621525d0ea6402f8a4d344c2d2fc196b32b26098cbfccc3d902a21f601349d5956c34b02d3845d101edaea23c6080ec0287ea2300000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000002549960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000037222c226f726967696e223a22687474703a2f2f6c6f63616c686f73743a35313733222c2263726f73734f726967696e223a66616c73657d000000000000000000",
        };
        const gasEstimates = await estimateUserOperationGas(web3, userOpsamp);
        if (await isApiResponseError(gasEstimates))
            return { error: true, message: gasEstimates?.error?.message || "Gas estimate failed."};

        console.log("Estimate is success",gasEstimates.result);
        const { preVerificationGas, verificationGasLimit, callGasLimit, maxFeePerGas } = gasEstimates.result;
        userOp.preVerificationGas = preVerificationGas;
        userOp.verificationGasLimit = verificationGasLimit;
        userOp.callGasLimit = callGasLimit;
        // userOp.maxPriorityFeePerGas = maxPriorityFeePerGas;

        // const { maxFeePerGas } = await userOpProvider.getFeeData();
        userOp.maxFeePerGas = maxFeePerGas;
        const {maxPriorityFeePerGas} = await userOpProvider.send("skandha_getGasPrice",[]);
        console.log({maxPriorityFeePerGas});
        userOp.maxPriorityFeePerGas = maxPriorityFeePerGas; //temporarily

        if(!(paymasterAndData === "0x")){
            console.log("Paymaster and data provided");
            console.log({executeParams});
            const additionalGas = window.BigInt(35000);
            const {exchangeRate} = await getExchangeRate(executeParams[3]);
            console.log("exchangeRate",exchangeRate);
            const totalGas = window.BigInt(userOp.preVerificationGas) + window.BigInt(userOp.verificationGasLimit) + window.BigInt(userOp.callGasLimit)
            const actualTokenCost = ((totalGas * window.BigInt(maxFeePerGas) + (additionalGas * window.BigInt(maxFeePerGas))) * window.BigInt(exchangeRate)) / window.BigInt(1e18);
            
            const tokenDetails = tokens[feeType];

            if (!tokenDetails || typeof tokenDetails.decimals !== "number") {
                throw new Error(`Invalid token details for ${feeType}`);
            }
            const requiredBalance = Number(actualTokenCost) / 10 ** tokenDetails.decimals;
            console.log("Transaction actualTokenCost :", requiredBalance);
            const balance =  await fetchERC20Balance(web3, walletAddress, feeType);
            if(requiredBalance > balance)
                return { error: true, message: `Insufficient balance. need ${requiredBalance} ${feeType} available ${balance} ${feeType}`};

            const approveData = await web3.eth.abi.encodeFunctionCall(TransactionAbi.ERC20Approve, [PAYMASTER_ADDRESS, actualTokenCost]);
            userOp.callData = await web3.eth.abi.encodeFunctionCall(TransactionAbi.executeABI, [executeParams[0], executeParams[1], executeParams[2], executeParams[3], approveData]);
            
            const paymasterData = await getSponserFromPaymaster(userOp, executeParams[3]);
            userOp.paymasterAndData = PAYMASTER_ADDRESS + paymasterData;
        }

        const userOpHash = await entryContract.methods.getUserOpHash(userOp).call();
        console.log({ userOpHash });

        userOp.signature = await personalSignIn(userOpHash, rawId);

        console.log({ userOp });

        const OpHash = await sendUserOperation(web3, userOp);
        if (await isApiResponseError(OpHash))
            return { error: true, message:OpHash?.error?.message || "Failed to send user operation."  };

        console.log('userOperation hash', OpHash);

        return { error: false, message: "", opHash:OpHash.result};
    } catch (err:any) {
        console.error("Error in createTx:", err);
        return { error: true, message: err.message || "Transaction failed." };
    }
};

export const contractETHTx = async (web3:any, walletAddress:HexString, rawId:string, publicKeys:any[], receiverAddress:HexString, amount:number, feeType:TokenKey) => {
    var callData;
    var executeParams;
    var paymasterAndData;
    if(feeType === "ethereum"){
        console.log("normal transaction")
        callData = await web3.eth.abi.encodeFunctionCall(TransactionAbi.executeABI, [receiverAddress, amount, "0x", "0x0000000000000000000000000000000000000000", "0x"]);
        executeParams = [receiverAddress, amount, "0x", "0x0000000000000000000000000000000000000000", "0x"];
        paymasterAndData = "0x";
    }
    else{
        console.log("ERC20 as a fee transaction",feeType)
        const ERC20_contract = tokens[feeType].address;
        console.log({ERC20_contract});
        const dummyAmount = 1 * (10 ** tokens[feeType].decimals);
        const approveData = await web3.eth.abi.encodeFunctionCall(TransactionAbi.ERC20Approve, [PAYMASTER_ADDRESS, dummyAmount]);
        callData = await web3.eth.abi.encodeFunctionCall(TransactionAbi.executeABI, [receiverAddress, amount, "0x", ERC20_contract, approveData]);
        executeParams = [receiverAddress, amount, "0x", ERC20_contract, approveData];
        paymasterAndData = PAYMASTER_ADDRESS + "F756Dd3123b69795d43cB6b58556b3c6786eAc13010000671a219600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000013b5e557e4601a264c654f3f0235ed381fc08b5ffea980e403bc807e27433586b0eb1abe122723125fc4d62ef605943f53a0c87893af3cfd6d33c3924cb0a4328ab0da981c";
    }
        

    return createTx(web3, walletAddress, rawId, publicKeys, callData, executeParams, paymasterAndData, feeType);
};

export const contractERC20Tx = async (web3:any, walletAddress:HexString, rawId:string, publicKeys:any[], contractAddress:HexString, receiverAddress:HexString, tokenAmount:number, feeType:TokenKey) => {
    const data = await web3.eth.abi.encodeFunctionCall(TransactionAbi.ERC20Transfer, [receiverAddress,tokenAmount]);
    var callData;
    var executeParams;
    var paymasterAndData;
    if(feeType === "ethereum"){
        console.log("normal transaction")
        callData = await web3.eth.abi.encodeFunctionCall(TransactionAbi.executeABI, [contractAddress, 0, data, "0x0000000000000000000000000000000000000000", "0x"]);
        executeParams = [contractAddress, 0, data, "0x0000000000000000000000000000000000000000", "0x"];
        paymasterAndData = "0x";
    }
    else{
        console.log("ERC20 as a fee transaction",feeType)
        const ERC20_contract = tokens[feeType].address;
        console.log({ERC20_contract});
        const dummyAmount = 1 * (10 ** tokens[feeType].decimals);
        const approveData = await web3.eth.abi.encodeFunctionCall(TransactionAbi.ERC20Approve, [PAYMASTER_ADDRESS, dummyAmount]);
        callData = await web3.eth.abi.encodeFunctionCall(TransactionAbi.executeABI, [contractAddress, 0, data, ERC20_contract, approveData]);
        executeParams = [contractAddress, 0, data, ERC20_contract, approveData];
        paymasterAndData = PAYMASTER_ADDRESS + "F756Dd3123b69795d43cB6b58556b3c6786eAc13010000671a219600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000013b5e557e4601a264c654f3f0235ed381fc08b5ffea980e403bc807e27433586b0eb1abe122723125fc4d62ef605943f53a0c87893af3cfd6d33c3924cb0a4328ab0da981c";
    }
    return createTx(web3, walletAddress,rawId, publicKeys, callData, executeParams, paymasterAndData, feeType);
}