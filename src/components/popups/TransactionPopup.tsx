import React from 'react';
import { Modal, Button } from 'react-bootstrap';

function TransactionPopup({ show, txStatus, txHash, onClose }:any) {
    const handleCopy = () => {
        navigator.clipboard.writeText(txHash);
        alert("Transaction hash copied to clipboard!");
    };

    const isClosable = ['OnChain', 'Cancelled', 'Reverted'].includes(txStatus);

    return (
        <Modal show={show} onHide={isClosable ? onClose : null} centered>
            <Modal.Header closeButton={isClosable}>
                <Modal.Title>Transaction Status</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p><b>Status:</b> {txStatus}</p>
                <p><b>Transaction Hash:</b></p>
                <p>
                    <code>{txHash}</code>
                    {txHash && <Button variant="link" onClick={handleCopy} style={{ paddingLeft: "5px" }}>
                        Copy
                    </Button>
                    }
                </p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={isClosable ? onClose : null} disabled={!isClosable}>
                    {isClosable ? 'Close' : 'Processing...'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default TransactionPopup;
