import React, { useState, useEffect } from "react";
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
import { HexString } from "web3";
const EC = elliptic.ec;
const ec = new EC("p256");

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

const signUserOperationHash = async (userOpHash: HexString, rawId:string) => {
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
                id: rawId,
            },
        ],
        // timeout: 60000,
    });

    const sign = getMessageSignature(authData.response.signature);
    console.log({ challenge, sign, authData });
    const clientDataJSON = new TextDecoder().decode(
        utils.parseBase64url(authData.response.clientDataJSON)
    );
    console.log({ clientDataJSON });

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
        ["uint256", "uint256", "bytes", "string", "string"],
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

const signUserOperation = async (userOpHash:HexString, rawId:string) => {
    const signature = await signUserOperationHash(userOpHash,rawId);
    console.log({ userOpHash, signature });
    return signature;
}

export default signUserOperation;