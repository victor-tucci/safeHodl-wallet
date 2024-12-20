import React, { useState, useEffect, useContext } from 'react';
import { Web3Context } from '../App';
import { HexString } from 'web3';

import {tokens} from '../token/tokens';
type TokenKey = keyof typeof tokens;

import {fetchBalance, fetchERC20Balance} from './estimateAddress'
import {contractETHTx, contractERC20Tx, getUserOperationByHash} from './txCreation'

import Loading from './popups/Loading';
import TransactionPopup from './popups/TransactionPopup';
import ErrorPopup from './popups/ErrorPupUp';

function Transfer(props: {  address: HexString, rawId: any, publicKeys:any[] }) {
    const web3:any = useContext(Web3Context);

    const [balance, setBalance] = useState<number>(0);
    
    const [toAddress, setToAddress] = useState<HexString>('');
    const [amount, setAmount] = useState<number>(0);
    const [chain, setChain] = useState<TokenKey>('ethereum');
    const [feeType, setFeeType] = useState<TokenKey>('ethereum');

    const [isValidAddress, setIsValidAddress] = useState<boolean>(true);
    const [isValidAmount, setIsValidAmount] =  useState<boolean>(true);

    const [txStatus, setTxStatus] = useState<String>('');
    const [txHash, setTxHash] = useState<HexString>('');
    const [errorMessage, setErrorMessage] = useState<String>('');

    const [loading, setLoading] = useState<boolean>(false); 
    const [showPopup, setShowPopup] = useState<boolean>(false);
    const [showErrorPopup, setShowErrorPopup] = useState(false);

    // Monitor txStatus and show popup when it gets data
    useEffect(() => {
        if (txStatus) {
            setShowPopup(true);
        }
        if(errorMessage){
            setShowErrorPopup(true);
        }
    }, [txStatus, errorMessage]);

    const handleClosePopup = () => {
        setShowPopup(false);
        setShowErrorPopup(false);
        setErrorMessage('');
        setTxStatus('');
        setTxHash('');
    };

    const handleChainChange = (e: any) => {
        setChain(e.target.value);
    };

    const handleFeeChange = (e: any) => {
        setFeeType(e.target.value);
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value) || 0; // Convert to number, default to 0 if invalid
        setAmount(value);
    };

    // show balance when chain changes
    useEffect(() => {
        const balance = async (address:HexString) => {
            var fetchedBalance = 0;
            if (chain === "ethereum")
                fetchedBalance = await fetchBalance(web3, address);
            else
                fetchedBalance = await fetchERC20Balance(web3, address, chain);

            setBalance(fetchedBalance);
        };

        balance(props.address);  // Fetch conBalance immediately on address change

        // Start the interval to fetch conBalance every 5 seconds
        const intervalId = setInterval(() => {
            balance(props.address);
        }, 5000);  // Set interval for conBalance updates

        // Cleanup interval on address change or component unmount
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };

    }, [chain]);

    const stopLoading = () => {
        setLoading(false);
        setToAddress('');
        setAmount(0);
        setChain('ethereum');
        setFeeType('ethereum');
    };

    const handleError = (error:any) => {
        console.log('Error occurred: ', error); // Log for debugging
        setErrorMessage(error);
        stopLoading();
    };

    const sendTx = async () => {
        setLoading(true);
        // Validate Ethereum address
        if (!web3.utils.isAddress(toAddress)) {
            setIsValidAddress(false);
            setLoading(false);
            return;
        } else {
            setIsValidAddress(true);
        }

        // Validate amount
        if (isNaN(amount) || amount <= 0) {
            setIsValidAmount(false);
            setLoading(false);
            return;
        } else {
            setIsValidAmount(true);
        }
        console.log(toAddress, amount, chain, feeType)

        console.log('Transaction Constructing...');
        var opHash = "";
        var error = false;
        var message = '';

        try {
            console.log('selected chain type: ', chain);
            if (chain === 'ethereum') {
                console.log('eth transaction......... fee', feeType);
                const sendAmount = web3.utils.toWei(amount, 'ether');
                const response = await contractETHTx(web3, props.address, props.rawId, props.publicKeys, toAddress, parseFloat(sendAmount) || 0, feeType);
                error = response.error;
                message = response.message;
                opHash = response.opHash;
            }
            else {
                if (chain in tokens) {
                    console.log('token transaction......... fee', feeType);
                    const sendToken = web3.utils.toWei(amount, tokens[chain].decimals);
                    console.log('tokens[chain].address: ', tokens[chain].address);
                    console.log('toAddress: ', toAddress);
                    console.log('sendToken: ', sendToken);
                    const response = await contractERC20Tx(web3, props.address, props.rawId, props.publicKeys, tokens[chain].address, toAddress,  parseFloat(sendToken) || 0, feeType);
                    error = response.error;
                    message = response.message;
                    opHash = response.opHash;
                }
                else {
                    handleError(`Chain ${chain} is not supported.`);
                    stopLoading();
                    return;
                }
            }

            // Check if transaction was successful
            if (error) handleError(message);
        } catch (err: any) {
            console.error('Error in sendTx:', err);
            handleError(err.message);
        }

        stopLoading();

        //add the transaction submitted screen.
        if (!error) {
            console.log('getUserOperationByHash function calling ...');
            for (let i = 0; true; i++) {
                const response = await getUserOperationByHash(web3, opHash);
                const result = response.result;
                if (!(result === null) && result.status) {
                    console.log('Transaction status: ', result.status, result.transaction);
                    setTxStatus(result.status);
                    setTxHash(result.transaction);

                    if (['OnChain', 'Cancelled', 'Reverted'].includes(result.status)) {
                        if (result.status === 'Cancelled' || result.status === 'Reverted') {
                            handleError(`Transaction is ${result.status}. Try again later`);
                        } else {
                            console.log('Transaction completed successfully.');
                        }
                        break;
                    }
                }

                // Wait for a specified delay before retrying
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    }

    return (
        <>
            {loading ? (
                <Loading />
            ) : (
                <div className='mainbody'>
                    <h2>Send Native Coin/Tokens...</h2>
                    <div>
                        <select value={chain} onChange={handleChainChange} style={optionBox}>
                            <option value="ethereum">ETH (native)</option>
                            <option value="sarvy">SAR</option>
                            <option value="ronin">RON</option>
                        </select>
                        <br/>
                        <small style={tip}>*Choose the coin or token for the transaction.</small>
                        {!(chain === "ethereum") && (
                            <p>
                                Balance: {balance} <b>{tokens[chain].symbol}</b>
                            </p>
                        )}
                        <form style={txForm}>
                            <label>
                                To Address:
                                <br />
                                <input
                                    type="text"
                                    value={toAddress}
                                    onChange={(e) => setToAddress(e.target.value)}
                                    style={getInputStyle(isValidAddress)}
                                />
                                {!isValidAddress && (
                                    <p style={errorTextStyle}>Invalid Ethereum address.</p>
                                )}
                            </label>
                            <br />
                            <label>
                                Amount:
                                <br />
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={handleAmountChange}
                                    style={getInputStyle(isValidAmount)}
                                />
                                {!isValidAmount && (
                                    <p style={errorTextStyle}>Invalid amount.</p>
                                )}
                            </label>
                            <br />
                            <label>
                                <b>Fee:</b>
                                <select value={feeType} onChange={handleFeeChange} style={feeOptionBox}>
                                    <option value="ethereum">ETH (native)</option>
                                    <option value="sarvy">SAR</option>
                                    <option value="ronin">RON</option>
                                    <option value="daiCoin">(empty)</option>
                                    <option value="tether">(empty)</option>
                                </select> 
                                <br/>
                                <small style={tip}>*Choose the fee type based on your preferences.</small>
                            </label>
                        </form>
                    </div>
    
                    <button onClick={sendTx} style={button}>Send</button>

                    <TransactionPopup
                        show={showPopup}
                        txStatus={txStatus}
                        txHash={txHash}
                        onClose={handleClosePopup}
                    />
                    <ErrorPopup
                    show={showErrorPopup}
                    message={errorMessage}
                    onClose={handleClosePopup}
                />
                </div>
            )}
        </>
    );
}    

// Dynamic style function for the input field
const getInputStyle = (isValid:boolean) => ({
    borderColor: isValid ? 'black' : 'red', // Red border for invalid input
    outline: isValid ? 'none' : '2px solid red', // Red outline for invalid input
    padding: '8px',
    borderRadius: '4px',
    width: '544px'
});

// Static style for the error message
const errorTextStyle = {
    color: 'red',
    fontSize: '12px',
    marginTop: '4px',
};

const optionBox = {
    borderColor: 'black',
    marginTop: '10px',
    marginBottom: '10px',
    padding: '8px',
    borderRadius: '4px',
}

const feeOptionBox = {
    borderColor: 'black',
    marginTop: '10px',
    marginBottom: '10px',
    marginLeft: '10px',
    padding: '8px',
    borderRadius: '4px',
}

const button = {
    backgroundColor: 'green',
    color: 'white',
    borderRadius: '4px',
    padding: '10px 20px',
    width: '10%',
    cursor: 'pointer',

}

const tip = {
    fontSize: '12px',
    color: '#6c757d', 
    marginLeft: '5px' 
}

const txForm ={
    marginTop:'20px',
    marginBottom: '10px' 
}

export default Transfer;

function async(address: string) {
    throw new Error('Function not implemented.');
}
