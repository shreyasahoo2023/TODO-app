import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { Lock, CheckCircle, Mail, Key, User, ArrowRight } from "lucide-react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;

export default function LoginPage() {
  const { login } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ GOOGLE LOGIN FIXED
  const handleGoogleSuccess = async (tokenResponse) => {
    try {
      const { access_token } = tokenResponse;

      const res = await axios.post(`${BASE_URL}/auth/google`, {
        token: access_token,
      });

      if (res.data.user) {
        login(res.data.user, access_token);
      }
    } catch (err) {
      console.error(err);
      setError("Google authentication failed");
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setError("Google Login Failed"),
    flow: "implicit",
    prompt: "select_account",
  });

  // ✅ MANUAL LOGIN FIXED
  const handleManualAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        await axios.post(`${BASE_URL}/auth/register`, {
          email,
          name,
          password,
        });

        const res = await axios.post(`${BASE_URL}/auth/login`, {
          email,
          password,
        });

        if (res.data.user && res.data.token) {
          login(res.data.user, res.data.token);
        }
      } else {
        const res = await axios.post(`${BASE_URL}/auth/login`, {
          email,
          password,
        });

        if (res.data.user && res.data.token) {
          login(res.data.user, res.data.token);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-4">
          {isRegistering ? "Register" : "Login"}
        </h2>

        {/* GOOGLE BUTTON */}
        <button
          onClick={() => googleLogin()}
          className="w-full py-2 bg-gray-100 rounded-lg mb-4"
        >
          Continue with Google
        </button>

        <div className="text-center mb-2 text-gray-500">OR</div>

        {/* FORM */}
        <form onSubmit={handleManualAuth} className="space-y-3">
          {isRegistering && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-500 text-white py-2 rounded"
          >
            {loading
              ? "Loading..."
              : isRegistering
                ? "Register"
                : "Login"}
          </button>
        </form>

        <p
          className="text-sm text-center mt-3 cursor-pointer text-blue-500"
          onClick={() => setIsRegistering(!isRegistering)}
        >
          {isRegistering
            ? "Already have account? Login"
            : "Create new account"}
        </p>
      </div>
    </div>
  );
}