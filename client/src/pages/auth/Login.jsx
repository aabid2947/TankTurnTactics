import React from "react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../../ui/button.jsx";
import { Input } from "../../ui/input.jsx";
import {useAuth} from "../../context/AuthContext.jsx";

 export default function  Login (){
  const {login,isAuthenticated,error} = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => { 
    if(isAuthenticated){
      window.location.href = '/';
    }
  }
  ,[isAuthenticated]);

  const loginUser = async (e) => {
    e.preventDefault();
    try {
      const response = await login({ email, password });
    } catch (err) {
      console.error(err.errors[0].message);
    }
  }
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <motion.div
        className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">
          Welcome Back
        </h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
          Sign in to continue
        </p>

 {/* Show error message */}
 {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form className="space-y-4" onSubmit={loginUser}>
          <Input onChange={(e)=> setEmail(e.target.value)} value={email} type="email" placeholder="Email" className="w-full" />
          <Input onChange={(e)=> setPassword(e.target.value)} value={password} type="password" placeholder="Password" className="w-full" />
          <Button className="w-full py-2 text-lg" type="submit" >Login</Button>
        </form>

        <p className="text-center text-gray-600 dark:text-gray-400 mt-4">
          Don't have an account?
          <a href="/register" className="text-blue-500 hover:underline ml-2">
            Sign Up
          </a>
        </p>
      </motion.div>
    </div>
  );
}

