"use client";

import { MapPin, Plus } from "lucide-react";

export default function ShippingPage() {
  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Shipping Address</h1>
            <p className="text-base-content/70 mt-2 text-sm sm:text-base">Manage your shipping addresses</p>
          </div>
          <button className="btn btn-primary gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Add New Address
          </button>
        </div>
      </div>
      
      <div className="grid gap-4 sm:gap-6">
        {/* Default Address Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
              <h2 className="card-title text-lg sm:text-xl">Default Shipping Address</h2>
              <div className="badge badge-primary w-fit">Default</div>
            </div>
            <div className="divider my-2"></div>
            
            <div className="flex gap-3 sm:gap-4">
              <div className="avatar placeholder shrink-0">
                <div className="bg-neutral text-neutral-content rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5 sm:w-6 sm:h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span className="text-xs sm:text-sm">No shipping addresses saved yet. Add your first address to get started.</span>
                </div>
              </div>
            </div>
            
            <div className="card-actions justify-end mt-6 flex-col sm:flex-row gap-2">
              <button className="btn btn-outline btn-sm w-full sm:w-auto">Edit</button>
              <button className="btn btn-outline btn-sm btn-error w-full sm:w-auto">Delete</button>
            </div>
          </div>
        </div>
        
        {/* Saved Addresses */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-lg sm:text-xl mb-4">Saved Addresses</h2>
            <div className="divider my-2"></div>
            <p className="text-base-content/70 text-center py-6 sm:py-8 text-sm sm:text-base">
              Your saved shipping addresses will appear here. You can add, edit, or remove addresses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
