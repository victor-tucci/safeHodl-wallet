
import React, { useState , useEffect, useContext } from "react";
import { HexString } from "web3";

import { Web3Context } from '../App';
import {getEstimateAddress, fetchBalance} from './estimateAddress'
import SignUserOp from "./SignUserOp";
import Transfer from "./Transfer";

function Wallet(props: { name: string, rawId: any, publicKeys:any[]; }) {
    const web3 = useContext(Web3Context);
    
    const [contractInfoFetch, setContractInfoFetch] = useState(false);
    const [address, setAddress] = useState('' as HexString);
    const [balance, setBalance] = useState<number>(0);


    useEffect(()=>{
        console.log('estimate address fetching...', props.name, props.rawId);
        const getContractAddress = async () => {
            const estimateAddress = await getEstimateAddress(web3, props.rawId, props.publicKeys);
            setAddress(estimateAddress);
        };

        getContractAddress();

    },[props.rawId]);

    useEffect(() => {
        if (!address) {
            setBalance(0);
            setContractInfoFetch(false);
            return;
        }

        const contractBalance = async (address:HexString) => {
            const fetchedBalance = await fetchBalance(web3, address);
            setBalance(fetchedBalance);
        };

        contractBalance(address);  // Fetch conBalance immediately on address change

        // Start the interval to fetch conBalance every 5 seconds
        const intervalId = setInterval(() => {
            contractBalance(address);
        }, 5000);  // Set interval for conBalance updates

        // Cleanup interval on address change or component unmount
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };


    }, [address]);  // Re-run when address changes

    return(
        <>
            {address && <>
                <h2>{props.name}</h2>
                <p>Address: {address}</p>
                <p>Balance: {balance}</p>

                <Transfer  address={address} rawId={props.rawId} publicKeys={props.publicKeys}></Transfer>
                </>
            }
        </>
    )

}
export default Wallet;