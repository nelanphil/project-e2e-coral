"use client";

import { useThemeStore } from "@/stores/theme-store";
import { Sun, Moon } from "lucide-react";

export default function ThemePage() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Theme Settings</h1>
        <p className="text-base-content/70 mt-2 text-sm sm:text-base">Customize your app appearance</p>
      </div>
      
      <div className="grid gap-4 sm:gap-6">
        {/* Theme Selection Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-lg sm:text-xl mb-4">Appearance</h2>
            <div className="divider my-2"></div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold text-sm sm:text-base">Select Theme</span>
              </label>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4">
                <button
                  type="button"
                  className={`card card-compact border-2 transition-all ${
                    theme === "light" 
                      ? "border-primary bg-primary/10" 
                      : "border-base-300 hover:border-primary/50"
                  }`}
                  onClick={() => setTheme("light")}
                >
                  <div className="card-body items-center text-center">
                    <Sun className="w-8 h-8 mb-2" />
                    <h3 className="font-semibold">Light</h3>
                    <p className="text-xs text-base-content/70">Clean and bright</p>
                  </div>
                </button>
                
                <button
                  type="button"
                  className={`card card-compact border-2 transition-all ${
                    theme === "dark" 
                      ? "border-primary bg-primary/10" 
                      : "border-base-300 hover:border-primary/50"
                  }`}
                  onClick={() => setTheme("dark")}
                >
                  <div className="card-body items-center text-center">
                    <Moon className="w-8 h-8 mb-2" />
                    <h3 className="font-semibold">Dark</h3>
                    <p className="text-xs text-base-content/70">Easy on the eyes</p>
                  </div>
                </button>
              </div>
            </div>
            
            <div className="alert alert-info mt-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="text-sm">Your theme preference is saved automatically and will be applied across all pages.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
