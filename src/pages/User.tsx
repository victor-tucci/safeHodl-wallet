import { useState , useEffect, useContext } from "react";
import { useLocation, useParams } from 'react-router-dom';

import { HexString } from "web3";

import { Web3Context } from '../App';
import {getEstimateAddress, fetchBalance} from '../components/estimateAddress'
import Transfer from "../components/Transfer";

function User() {
    const web3 = useContext(Web3Context);
    const location = useLocation();
    const {name, rawId , publicKeys} = location.state || {}; // Safely destructure state
    
    const [contractInfoFetch, setContractInfoFetch] = useState(false);
    const [address, setAddress] = useState('' as HexString);
    const [balance, setBalance] = useState<number>(0);


    useEffect(()=>{
        console.log('estimate address fetching...', name, rawId);
        const getContractAddress = async () => {
            const estimateAddress = await getEstimateAddress(web3, rawId, publicKeys);
            setAddress(estimateAddress);
        };

        getContractAddress();

    },[rawId]);

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
            {address && <div className='walletbody'>
                <h2>{name}</h2>
                <p>Address: {address}</p>
                <p>Balance: {balance}</p>

                <Transfer  address={address} rawId={rawId} publicKeys={publicKeys}></Transfer>
                </div>
            }
        </>
    )

}
export default User;