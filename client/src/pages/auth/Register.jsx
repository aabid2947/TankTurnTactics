import { useState,useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "../../ui/button.jsx";
import { Input } from "../../ui/input.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export function Register() {
  const { register, isAuthenticated, error } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = '/';
    }
  }
    , [isAuthenticated]);

  const registerUser = async (e) => {
    e.preventDefault();
    setLoading(true); // Show loading state

    try {
      const userData = { username, email, password, confirmPassword };
      const response = await register(userData);
      console.log(response);
    } catch (err) {

      console.error(err.errors[0].message

      );
    } finally {
      setLoading(false); // Hide loading state
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <motion.div
        className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">
          Create an Account
        </h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-4">
          Sign up to get started!
        </p>

        {/* Show error message */}
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form className="space-y-4" onSubmit={registerUser}>
          <Input onChange={(e) => setUsername(e.target.value)} value={username} type="text" placeholder="Full Name" className="w-full" />
          <Input onChange={(e) => setEmail(e.target.value)} value={email} type="email" placeholder="Email" className="w-full" />
          <Input onChange={(e) => setPassword(e.target.value)} value={password} type="password" placeholder="Password" className="w-full" />
          <Input onChange={(e) => setConfirmPassword(e.target.value)} value={confirmPassword} type="password" placeholder="Confirm Password" className="w-full" />

          <Button className="w-full py-2 text-lg" type="submit" disabled={loading}>
            {loading ? "Registering..." : "Sign Up"}
          </Button>
        </form>

        <p className="text-center text-gray-600 dark:text-gray-400 mt-4">
          Already have an account?
          <a href="/login" className="text-blue-500 hover:underline ml-2">
            Login
          </a>
        </p>
      </motion.div>
    </div>
  );
}
