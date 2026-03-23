"use client";

import { useAuth } from "@/lib/auth-context";
import { Mail, User, Shield } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Account Details</h1>
        <p className="text-base-content/70 mt-2 text-sm sm:text-base">
          Manage your account information and preferences
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6">
        {/* Account Information Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-lg sm:text-xl mb-4">
              Account Information
            </h2>
            <div className="divider my-2"></div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="avatar placeholder shrink-0">
                  <div className="bg-primary text-primary-content rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-base-content/70">
                    Email Address
                  </div>
                  <div className="font-semibold text-sm sm:text-base truncate">
                    {user?.email || "N/A"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <div className="avatar placeholder shrink-0">
                  <div className="bg-secondary text-secondary-content rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                    <User className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-base-content/70">
                    Full Name
                  </div>
                  <div className="font-semibold text-sm sm:text-base">
                    {[user?.firstName, user?.lastName]
                      .filter(Boolean)
                      .join(" ") || "Not set"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <div className="avatar placeholder shrink-0">
                  <div className="bg-accent text-accent-content rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-base-content/70">
                    Account Role
                  </div>
                  <div className="font-semibold text-sm sm:text-base capitalize">
                    {user?.role || "N/A"}
                  </div>
                </div>
              </div>
            </div>
            <div className="card-actions justify-end mt-6">
              <button className="btn btn-primary btn-sm w-full sm:w-auto">
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
