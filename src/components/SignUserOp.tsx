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
import entryPointAbi from "../abi/entrypoint.json";
import { ethers, BigNumber } from "ethers";
const EC = elliptic.ec;
const ec = new EC("p256");

function SignUserOp(props: { rawId: any; }) {
  
    const getMessageSignature = (authResponseSignature: string): BigNumber[] => {
        // See https://github.dev/MasterKale/SimpleWebAuthn/blob/master/packages/server/src/helpers/iso/isoCrypto/verifyEC2.ts
        // for extraction of the r and s bytes from the raw signature buffer
        const parsedSignature = AsnParser.parse(
          base64url.toBuffer(authResponseSignature),
          ECDSASigValue
        );
        let rBytes = new Uint8Array(parsedSignature.r);
        let sBytes = new Uint8Array(parsedSignature.s);
        if (shouldRemoveLeadingZero(rBytes)) {
          rBytes = rBytes.slice(1);
        }
        if (shouldRemoveLeadingZero(sBytes)) {
          sBytes = sBytes.slice(1);
        }
        // r and s values
        return [BigNumber.from(rBytes), BigNumber.from(sBytes)];
    };

    const signUserOperationHash = async (userOpHash: string) => {
        const challenge = utils
          .toBase64url(ethers.utils.arrayify(userOpHash))
          .replace(/=/g, "");
        console.log(challenge);
        
        const authData = await startAuthentication({
          rpId: window.location.hostname,
          challenge: challenge,
          userVerification: "required",
          // authenticatorType: "both",
          allowCredentials: [
            {
              type: "public-key",
              id: props.rawId,
            },
          ],
          // timeout: 60000,
        });
        
        const sign = getMessageSignature(authData.response.signature);
        console.log({ challenge, sign, authData });
        const clientDataJSON = new TextDecoder().decode(
          utils.parseBase64url(authData.response.clientDataJSON)
        );
        console.log({clientDataJSON});
       
        const challengePos = clientDataJSON.indexOf(challenge);
        const challengePrefix = clientDataJSON.substring(0, challengePos);
        const challengeSuffix = clientDataJSON.substring(
          challengePos + challenge.length
        );
        const authenticatorData = new Uint8Array(
          utils.parseBase64url(authData.response.authenticatorData)
        );
        const sig = {
          r: sign[0],
          s: sign[1],
          authData: authenticatorData,
          clientDataPrefix: challengePrefix,
          clientDataSuffix: challengeSuffix,
        };
        console.log({ sig });
        let encodedSig = ethers.utils.defaultAbiCoder.encode(
          [ "uint256", "uint256", "bytes", "string", "string"],
          [
            sig.r,
            sig.s,
            sig.authData,
            sig.clientDataPrefix,
            sig.clientDataSuffix,
          ]
        );
        // console.log({ encodedSig });
        return encodedSig;
    };

    const signUserOperation = async () => {
        const entryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
        
        const userOp = {
            sender: "0x233e467DC8b70aD5644B969e3aD407C909fEef43",
            nonce: "0x1",
            initCode: "0x",
            callData: "0x04e745be000000000000000000000000a69b64b4663ea5025549e8d7b90f167d6f0610b3000000000000000000000000000000000000000000000000000aa87bee53800000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            paymasterAndData: "0x",
            signature: "0x5fbe910a9bac5c335f4992b62c199dedd29c2fdc7b0350d8727eb8dce55a0eaf298884595b81b522012abfdc22b3e9a03a1657cffd92a1a91249128fd5e0aef200000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000002549960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000037222c226f726967696e223a22687474703a2f2f6c6f63616c686f73743a35313733222c2263726f73734f726967696e223a66616c73657d000000000000000000",
            preVerificationGas: "0x1074c",
            verificationGasLimit: "0x85d35",
            callGasLimit: "0xdcb7",
            maxFeePerGas: "0xee451b673",
            maxPriorityFeePerGas: "0xee451b673"
        }

        const provider = new ethers.providers.JsonRpcProvider(
            "http://154.53.58.114:14337/rpc"
        );

        const entryPoint = new ethers.Contract(
            entryPointAddress,
            entryPointAbi.abi,
            provider
        );
        const userOpHash = await entryPoint.getUserOpHash(userOp);
        const signature = await signUserOperationHash(userOpHash);
        console.log({ userOpHash, signature });
        setSignature(signature);
        return signature;
    }

    return(
        <>
            <button onClick={signUserOperation}>Sign</button>
        </>

    )
}

export default SignUserOp;