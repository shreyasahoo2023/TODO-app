import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { Lock, CheckCircle, Mail, Key, User, ArrowRight } from "lucide-react";
import axios from "axios";

export default function LoginPage() {
  const { login } = useAuth();
  
  // Registration and Login state
  const [isRegistering, setIsRegistering] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const { credential } = credentialResponse;
      const res = await axios.post("http://localhost:5000/auth/google", { token: credential });
      if (res.data.user) login(res.data.user, credential);
    } catch (err) {
      console.error("Login failed on backend", err);
    }
  };

  const handleManualAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        // Register flow
        await axios.post("http://localhost:5000/auth/register", {
          email, name, password
        });
        
        // Auto-login after successful register
        const res = await axios.post("http://localhost:5000/auth/login", { email, password });
        if (res.data.user && res.data.token) {
          login(res.data.user, res.data.token);
        }
      } else {
        // Login flow
        const res = await axios.post("http://localhost:5000/auth/login", { email, password });
        if (res.data.user && res.data.token) {
          login(res.data.user, res.data.token);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] dark:bg-[#0a0a0c] flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
      {/* Background Orbs */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3], rotate: [0, 90, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none"
      />
      <motion.div 
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2], rotate: [0, -90, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-1/4 right-1/4 w-[35rem] h-[35rem] bg-purple-500/20 rounded-full blur-[100px] pointer-events-none"
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white/80 dark:bg-black/50 backdrop-blur-3xl rounded-[2rem] border border-white/40 dark:border-white/10 p-8 shadow-2xl shadow-indigo-500/10">
          
          <div className="flex flex-col items-center text-center space-y-4 mb-6">
            <motion.div 
              initial={{ rotate: -180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center p-0.5 shadow-lg shadow-indigo-500/30"
            >
              <div className="w-full h-full bg-white dark:bg-[#1a1a1e] rounded-[14px] flex items-center justify-center">
                <CheckCircle className="text-indigo-500 w-7 h-7" />
              </div>
            </motion.div>

            <div>
              <h1 className="text-3xl font-bold dark:text-white mt-2">Motion Do</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm font-medium">Capture Your Ideas • Get Things Done</p>
            </div>
          </div>

          <div className="flex flex-col space-y-4 w-full relative">
            {/* GOOGLE AUTHENTICATION MODULE */}
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
              <div className="relative flex justify-center bg-white dark:bg-[#1a1a1e] px-1 py-1 rounded-lg">
                <GoogleLogin 
                  onSuccess={handleGoogleSuccess} 
                  onError={() => console.error('Login Failed')}
                  theme="filled_black" 
                  width="100%" 
                  size="large"
                  prompt="select_account"
                  ux_mode="popup"
                  auto_select={false}
                />
              </div>
            </motion.div>

            <div className="flex items-center gap-3 w-full opacity-60 py-2">
              <div className="flex-1 h-px bg-gray-300 dark:bg-white/20"></div>
              <span className="text-xs font-medium dark:text-gray-300">OR</span>
              <div className="flex-1 h-px bg-gray-300 dark:bg-white/20"></div>
            </div>

                  {/* MANUAL AUTHENTICATION MODULE */}
                  <form onSubmit={handleManualAuth} className="flex flex-col space-y-3">
                    <AnimatePresence mode="popLayout">
                      {isRegistering && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="relative"
                        >
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input 
                            type="text" placeholder="Full Name" required={isRegistering}
                            value={name} onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all dark:text-white"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="email" placeholder="Email Address" required
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all dark:text-white"
                      />
                    </div>

                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="password" placeholder="Password" required
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all dark:text-white"
                      />
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.p 
                          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="text-xs text-red-500 text-center font-medium mt-1"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <motion.button 
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 mt-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-70"
                      type="submit"
                    >
                      {loading ? "Authenticating..." : (isRegistering ? "Create Account" : "Access Portal")}
                      {!loading && <ArrowRight size={16} />}
                    </motion.button>
                  </form>

                  <div className="text-center mt-2">
                    <button 
                      type="button"
                      onClick={() => { setIsRegistering(!isRegistering); setError(""); }}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 font-medium transition-colors"
                    >
                      {isRegistering ? "Already have an account? Sign in here." : "Don't have an account? Register."}
                    </button>
                  </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
