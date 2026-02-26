"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await api<{ message: string }>("/api/newsletter/subscribe", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage({ type: "success", text: response.message || "Successfully subscribed! Thank you for joining us." });
      setEmail("");
    } catch (error) {
      let errorMessage = "Failed to subscribe. Please try again.";
      if (error instanceof Error) {
        try {
          // Try to parse JSON error response
          const parsed = JSON.parse(error.message);
          errorMessage = parsed.error || error.message;
        } catch {
          // If not JSON, use the error message as-is
          errorMessage = error.message;
        }
      }
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input input-bordered flex-1"
          required
          disabled={loading}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? "Subscribing..." : "Subscribe"}
        </button>
      </form>
      {message && (
        <div className={`mt-2 text-sm ${message.type === "success" ? "text-success" : "text-error"}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
