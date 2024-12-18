import { useState , useEffect } from "react";
import { useNavigate } from "react-router-dom";

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

function Login() {
    const navigate = useNavigate();

    const getPubkeys = async(id:string): Promise<any> =>{
        // check the wallet key is present in the contract or not.
        // if it is not present then call login server to get the keys.
        const payload = { rawId: id };
        console.log("Login payload:", payload);
        try {
            const response = await fetch("https://userapi.beldex.dev/api/auth/login", {
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
        const response = await getPubkeys(authData.rawId);
        
        const publicKey = [
            response.data.pubkeyX,
            response.data.pubkeyY,
        ];
        console.log({publicKey});
        if(publicKey.length > 0){
            const data = {name:response.data.name, rawId:authData.rawId, publicKeys:publicKey};
            navigate(`/User/${response.data.name}`, { state: data });
        }
    }

    return (
        <>
            <div className='mainbody'>
                <h2>Login Wallet</h2>
                <button onClick={loginPassKey}>Login</button>
            </div>
        </>
    );
  
}

export default Login;