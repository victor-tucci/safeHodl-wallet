import { useNavigate } from "react-router-dom";

export default function Header() {
    const navigate = useNavigate();
    return (
      <h1 className="App-header" onClick={() => navigate('/')}>
        Louice Wallet
      </h1>
    );
  }
  