"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  ArrowRight,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { getApiUrl } from "@/lib/apiConfig";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    const apiUrl = getApiUrl("/api/v1/auth/login");

    try {
      console.log("[LOGIN] Starting login request");
      console.log("[LOGIN] API URL:", apiUrl);

      // ============================================================
      // LOGIN REQUEST
      // ============================================================

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
        cache: "no-store",
      });

      console.log("[LOGIN] HTTP status:", res.status);
      console.log("[LOGIN] HTTP ok:", res.ok);

      // ============================================================
      // READ RESPONSE AS TEXT FIRST
      //
      // This is safer than directly calling res.json().
      // It also lets us diagnose malformed/non-JSON responses.
      // ============================================================

      const responseText = await res.text();

      console.log(
        "[LOGIN] Response size:",
        responseText.length
      );

      if (!responseText) {
        throw new Error(
          `Server returned an empty response (HTTP ${res.status})`
        );
      }

      // ============================================================
      // PARSE JSON
      // ============================================================

      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error(
          "[LOGIN] JSON parsing failed:",
          jsonError
        );

        console.error(
          "[LOGIN] Response preview:",
          responseText.substring(0, 500)
        );

        throw new Error(
          `Server returned an invalid response (HTTP ${res.status})`
        );
      }

      console.log(
        "[LOGIN] Response success:",
        data?.success
      );

      // ============================================================
      // HTTP / APPLICATION ERROR
      // ============================================================

      if (!res.ok || !data?.success) {
        const serverError =
          data?.error ||
          data?.message ||
          `Login failed (HTTP ${res.status})`;

        console.error(
          "[LOGIN] Server rejected login:",
          serverError
        );

        setError(serverError);
        setLoading(false);
        return;
      }

      // ============================================================
      // TOKEN VALIDATION
      // ============================================================

      if (!data?.token) {
        console.error(
          "[LOGIN] Login succeeded but no token was returned."
        );

        setError(
          "Login succeeded, but the server did not return an authentication token."
        );

        setLoading(false);
        return;
      }

      // ============================================================
      // STORE TOKEN
      // ============================================================

      try {
        localStorage.setItem(
          "token",
          data.token
        );

        console.log(
          "[LOGIN] Token stored successfully"
        );
      } catch (storageError) {
        console.error(
          "[LOGIN] Failed to store authentication token:",
          storageError
        );

        setError(
          "Login succeeded, but the browser could not save your login session."
        );

        setLoading(false);
        return;
      }

      // ============================================================
      // STORE USER
      // ============================================================

      if (data.user) {
        try {
          localStorage.setItem(
            "user",
            JSON.stringify(data.user)
          );

          console.log(
            "[LOGIN] User information stored successfully"
          );
        } catch (userStorageError) {
          console.error(
            "[LOGIN] Failed to store user information:",
            userStorageError
          );

          // Token is already stored, so don't fail login
          // just because the optional user object couldn't
          // be written.
        }
      }

      // ============================================================
      // LOGIN SUCCESS
      // ============================================================

      console.log(
        "[LOGIN] Authentication successful"
      );

      console.log(
        "[LOGIN] User:",
        data.user
      );

      // ============================================================
      // REDIRECT
      // ============================================================

      if (data.user?.isSuperAdmin) {
        console.log(
          "[LOGIN] Redirecting to /platform-admin"
        );

        router.push("/platform-admin");
      } else {
        console.log(
          "[LOGIN] Redirecting to /dashboard"
        );

        router.push("/dashboard");
      }

    } catch (err) {
      // ============================================================
      // ACTUAL NETWORK / CLIENT ERROR
      // ============================================================

      console.error(
        "[LOGIN] Login request failed:",
        err
      );

      if (err instanceof Error) {
        setError(
          err.message ||
            "Unable to connect to the server."
        );
      } else {
        setError(
          "Unable to connect to the server. Please try again."
        );
      }

      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background Glows */}

      <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border border-slate-800 relative z-10 space-y-6">

        {/* Brand Header */}

        <div className="text-center space-y-3">

          <div className="relative inline-block">

            <img
              src="/marut_hanuman_logo.png"
              alt="Marut Fitness Software Emblem"
              className="w-24 h-24 rounded-full object-cover border-2 border-amber-500/40 shadow-xl shadow-amber-500/10 mx-auto"
            />

          </div>

          <div>

            <h1 className="text-2xl font-extrabold text-white tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
              Marut Fitness Software
            </h1>

            <p className="text-xs text-slate-400 mt-1">
              Gym & Fitness Management Operating System
            </p>

          </div>

        </div>

        {/* Error */}

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-2xl font-medium leading-relaxed">
            {error}
          </div>
        )}

        {/* Login Form */}

        <form
          onSubmit={handleLogin}
          className="space-y-4"
          autoComplete="off"
        >

          {/* Email */}

          <div>

            <label className="block text-xs font-bold text-slate-300 mb-1">
              Email Address or Mobile Number
            </label>

            <div className="relative">

              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />

              <input
                type="text"
                required
                autoComplete="off"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                className="w-full pl-10 pr-4 py-3 text-xs bg-slate-800/80 border border-slate-700/80 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-white font-medium placeholder-slate-500 transition-all"
                placeholder="owner@yourgym.com or 9876543210"
              />

            </div>

          </div>

          {/* Password */}

          <div>

            <label className="block text-xs font-bold text-slate-300 mb-1">
              Password
            </label>

            <div className="relative">

              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />

              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                className="w-full pl-10 pr-4 py-3 text-xs bg-slate-800/80 border border-slate-700/80 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-white font-medium placeholder-slate-500 transition-all"
                placeholder="••••••••"
              />

            </div>

          </div>

          {/* Login Button */}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
          >

            <span>
              {loading
                ? "Signing in..."
                : "Sign In to Facility"}
            </span>

            <ArrowRight className="w-4 h-4 stroke-[3]" />

          </button>

        </form>

        {/* Register Facility / User Link */}

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">

          <span className="text-slate-400">
            Need a new account or gym?
          </span>

          <Link
            href="/signup"
            className="font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1 transition-colors"
          >

            <Building2 className="w-3.5 h-3.5" />

            <span>
              Register Facility / User →
            </span>

          </Link>

        </div>

      </div>

    </div>
  );
}
