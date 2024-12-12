import React, { useState, createContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Web3 from 'web3'; // Ensure Web3.js is correctly imported

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import Home from './pages/Home';
import Create from './pages/Create';
import Login from './pages/Login';
import User from './pages/User';

// Initialize Web3 instance
const web3 = new Web3('http://154.53.58.114:14337/rpc');

// Create context with default value
export const Web3Context = createContext<Web3 | null>(null);

function App() {

  return (
    <div className='App'>
      <h1 className="App-header" onClick={() => window.location.reload()} >Louice Wallet</h1>

      <Web3Context.Provider value={web3}>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Home/>}></Route>
          <Route path='/Create' element={<Create/>}></Route>
          <Route path='/Login' element={<Login/>}></Route>
          <Route path='/User/:username' element={<User/>}></Route>
        </Routes>
      </BrowserRouter>
      </Web3Context.Provider>
    </div>
  );
}

export default App;
