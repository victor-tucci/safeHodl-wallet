import React, { useState, createContext, useEffect } from 'react';
import Web3 from 'web3'; // Ensure Web3.js is correctly imported
import './App.css';
import Create from './components/Create';
import Login from './components/Login';

// Initialize Web3 instance
const web3 = new Web3('http://154.53.58.114:14337/rpc');

// Create context with default value
export const Web3Context = createContext<Web3 | null>(null);

function App() {
  const [loginType, setLoginType] = useState<number>(0); // 0: Create Wallet, 1: Login Wallet
  const [isClicked, setIsClicked] = useState<boolean>(false);

  const createClick = () => {
    setIsClicked(true);
    setLoginType(0);
  };

  const loginClick = () => {
    setIsClicked(true);
    setLoginType(1);
  };

  return (
    <>
      <h1>Louice Wallet</h1>

      {!isClicked && (
        <div className="card">
          <button onClick={createClick}>Create Wallet</button>
          <button onClick={loginClick}>Login Wallet</button>
        </div>
      )}

      <Web3Context.Provider value={web3}>
        {isClicked && loginType === 0 && <Create />}
        {isClicked && loginType === 1 && <Login />}
      </Web3Context.Provider>
    </>
  );
}

export default App;
