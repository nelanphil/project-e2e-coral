"use client";

import { useState } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";
      const res = await fetch(`${apiUrl}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      setState("success");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="alert alert-success">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          <strong>Message sent!</strong> Thank you for reaching out. We&apos;ll get back to you within 24 hours on business days.
        </span>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <form onSubmit={handleSubmit} className="card-body gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-name" className="text-sm font-medium">
              Your Name
            </label>
            <input
              id="contact-name"
              type="text"
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={state === "submitting"}
              placeholder="Jane Smith"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-email" className="text-sm font-medium">
              Email Address
            </label>
            <input
              id="contact-email"
              type="email"
              className="input input-bordered w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={state === "submitting"}
              placeholder="jane@example.com"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-subject" className="text-sm font-medium">
            Subject
          </label>
          <input
            id="contact-subject"
            type="text"
            className="input input-bordered w-full"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            disabled={state === "submitting"}
            placeholder="Order inquiry, coral question, etc."
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-message" className="text-sm font-medium">
            Message
          </label>
          <textarea
            id="contact-message"
            className="textarea textarea-bordered w-full min-h-[140px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            disabled={state === "submitting"}
            placeholder="Tell us how we can help..."
          />
        </div>
        {state === "error" && (
          <div className="alert alert-error">
            <span>{errorMsg}</span>
          </div>
        )}
        <div className="pt-1">
          <button
            type="submit"
            className="btn btn-primary w-full sm:w-auto"
            disabled={state === "submitting"}
          >
            {state === "submitting" ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Sending…
              </>
            ) : (
              "Send Message"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
