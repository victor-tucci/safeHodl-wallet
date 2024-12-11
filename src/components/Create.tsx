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

export enum COSEKEYS {
  kty = 1,
  alg = 3,
  crv = -1,
  x = -2,
  y = -3,
  n = -1,
  e = -2,
}

function Create() {
    const [username, setUsername] = useState('');
    const [credentials, setCredentials] = useState<any>(null);
    const [publicKeys, setPublicKeys] = useState([] as any[]);

    const storePubkey = async (publicKey : any , publicKeyCredential : any) =>{
        // "message": "User created successfully"
        // "message": "User already exists"
        const payload = { name: username, rawId: publicKeyCredential.id, X : publicKey[0], Y : publicKey[1]};
        console.log("signUp payload:", payload);

        try {
            const response = await fetch("http://localhost:3000/api/auth/signup", {
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
            throw error;
        }

    }

    function _generateRandomBytes() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return array;
    }

    const createPassKey = async () => {
        const supportsWebAuthn = browserSupportsWebAuthn();
        const supportsWebAuthnAutofill = await browserSupportsWebAuthnAutofill();
        const platformAuthenticatorAvailable = await platformAuthenticatorIsAvailable();
    
        console.log(
        `Browser supports WebAuthn: ${supportsWebAuthn}
        Browser supports WebAuthn Autofill: ${supportsWebAuthnAutofill}
        Platform Authenticator available: ${platformAuthenticatorAvailable}`
        );
    
        const platform = platformAuthenticatorAvailable
          ? "platform"
          : "cross-platform";
    
        const challenge = uuidv4();
        console.log(
        `platform: ${platform}
        challenge: ${challenge}`);

        const obj = {
            rp: {
              name: 'LouiceWallet/passkey-login',
              id: window.location.hostname,
            },
            user: {
              id: _generateRandomBytes(),
              name: username,
              displayName: username,
            },
            challenge: challenge,
            pubKeyCredParams: [{ type: "public-key", alg: -7 }],
            attestation: "direct",
            timeout: 60000,
            authenticatorSelection: {
              requireResidentKey: true,
              userVerification: "required", // Webauthn default is "preferred"
              authenticatorAttachment: platform,
            },
          };
        console.log("registration options", obj);

        const publicKeyCredential = await startRegistration(obj as any);
        console.log({publicKeyCredential});

        const attestationObject = base64url.toBuffer(
        publicKeyCredential.response.attestationObject
        );
        const authData = cbor.decode(attestationObject.buffer, undefined, undefined)
        .authData as Uint8Array;

        let authDataParsed = parseAuthData(authData);

        let pubk = cbor.decode(
        authDataParsed.COSEPublicKey.buffer,
        undefined,
        undefined
        );

        const x = pubk[COSEKEYS.x];
        const y = pubk[COSEKEYS.y];

        const pk = ec.keyFromPublic({ x, y });

        const publicKey = [
        "0x" + pk.getPublic("hex").slice(2, 66),
        "0x" + pk.getPublic("hex").slice(-64),
        ];
        console.log({ publicKey });
        const response = await storePubkey(publicKey, publicKeyCredential);
        console.log({response});
        setCredentials(publicKeyCredential);
        setPublicKeys(publicKey);

    }
    return (
        <>
        {publicKeys.length > 0 ?  <Wallet name={username} rawId={credentials.id} publicKeys ={publicKeys}/> : <>
            <h2>Create wallet</h2>
            <div>
                <form>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder='wallet name'
                    />
                </form>
                <button onClick={createPassKey}>Done</button>
            </div>
            </>
        }
        </>
    )
}

export default Create;