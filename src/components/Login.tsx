import React, { useState , useEffect } from "react";
import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
// @ts-ignore
import elliptic from "elliptic";
import base64url from "base64url";
import { v4 as uuidv4 } from "uuid";
import { AsnParser } from "@peculiar/asn1-schema";
import { ECDSASigValue } from "@peculiar/asn1-ecc";
import { utils } from "@passwordless-id/webauthn";
import * as cbor from "../utils/cbor";
import {
  parseAuthData,
  publicKeyCredentialToJSON,
  shouldRemoveLeadingZero,
} from "../utils/helpers";
import { ethers, BigNumber } from "ethers";
const EC = elliptic.ec;
const ec = new EC("p256");

import SignUserOp from "./SignUserOp";
import Wallet from "./Wallet";

function Login() {
    const [username, setUsername] = useState('' as string);
    const [userRawId, setUserRawId] = useState('');
    const [publicKeys, setPublicKeys] = useState([] as any[]);

    const getPubkeys = async(id:string): Promise<any> =>{
        // check the wallet key is present in the contract or not.
        // if it is not present then call login server to get the keys.
        const payload = { rawId: id };
        console.log("Login payload:", payload);
        try {
            const response = await fetch("http://localhost:3000/api/auth/login", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });
        
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
        
            const result = await response.json(); // Parse the JSON response
            return result;
        } catch (error) {
            console.error("Error:", error);
            alert("wallet is not exist");
            throw error;
        }
    }

    const loginPassKey = async () => {
        const challenge = uuidv4();
        const authData = await startAuthentication({
            rpId: window.location.hostname,
            challenge: challenge,
            userVerification: "required",
            // authenticatorType: "both",
            // timeout: 60000,
        });
        console.log('authData of the user:',authData);
        setUserRawId(authData.rawId);
        const response = await getPubkeys(authData.rawId);
        
        const publicKey = [
            response.data.pubkeyX,
            response.data.pubkeyY,
        ];
        console.log({publicKey});
        setPublicKeys(publicKey);
        setUsername(response.data.name);
    }

    return(
        <>
        {publicKeys.length > 0 ?  <Wallet name={username} rawId={userRawId} publicKeys={publicKeys}/> : <>
                <h2>Login wallet</h2>
                <button onClick={loginPassKey}>Login</button>
                {/* {userRawId && <p> The user Id is {userRawId}</p>} */}
                </>
        }
        </>
    )
}

export default Login;