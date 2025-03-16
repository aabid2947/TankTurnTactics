import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <h1 className="text-3xl font-bold">Welcome to Tank Turn Tactics!</h1>
      <button
      // style={{ backgroundColor: 'red' }}
        onClick={() => navigate("/main")}
        className="mt-4 bg-green-300 p-2 rounded cursor-pointer"
      >
        Start/Join
      </button>
      <button
        onClick={() => navigate("/login")}
        className="mt-4 bg-green-300 p-2 rounded cursor-pointer"
      >
        Logout
      </button>
    </div>
  );
};

export default HomePage;
