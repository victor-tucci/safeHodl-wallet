import { useNavigate } from "react-router-dom";

export default function Home() {
    const navigate = useNavigate();

    const createClick = () => {
        navigate('/Create');
      };
    
      const loginClick = () => {
        navigate('/Login');
    };

    return (
        <div className="card">
            <button onClick={createClick}>Create Wallet</button>
            <button onClick={loginClick}>Login Wallet</button>
      </div>
    )
}