"use client";

import { Bell, Mail, Package, Megaphone } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Notifications</h1>
        <p className="text-base-content/70 mt-2 text-sm sm:text-base">Manage your notification preferences</p>
      </div>
      
      <div className="grid gap-4 sm:gap-6">
        {/* Email Notifications Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="avatar placeholder shrink-0">
                <div className="bg-primary text-primary-content rounded-full w-10 h-10 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
              <h2 className="card-title text-lg sm:text-xl">Email Notifications</h2>
            </div>
            <div className="divider my-2"></div>
            <p className="text-xs sm:text-sm text-base-content/70 mb-6">
              Control how you receive email notifications about your account and orders.
            </p>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label cursor-pointer flex-col sm:flex-row items-start sm:items-center gap-2">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="label-text font-semibold text-sm sm:text-base">Enable Email Notifications</span>
                      <div className="text-xs text-base-content/70">Receive all email notifications</div>
                    </div>
                  </div>
                  <input type="checkbox" className="toggle toggle-primary" defaultChecked />
                </label>
              </div>
            </div>
          </div>
        </div>
        
        {/* Order Notifications Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="avatar placeholder shrink-0">
                <div className="bg-secondary text-secondary-content rounded-full w-10 h-10 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <h2 className="card-title text-lg sm:text-xl">Order Updates</h2>
            </div>
            <div className="divider my-2"></div>
            <p className="text-xs sm:text-sm text-base-content/70 mb-6">
              Get notified about order status changes, shipping updates, and delivery confirmations.
            </p>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text font-semibold text-sm sm:text-base">Order Status Updates</span>
                  <input type="checkbox" className="toggle toggle-primary" defaultChecked />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text font-semibold text-sm sm:text-base">Shipping Notifications</span>
                  <input type="checkbox" className="toggle toggle-primary" defaultChecked />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text font-semibold text-sm sm:text-base">Delivery Confirmations</span>
                  <input type="checkbox" className="toggle toggle-primary" defaultChecked />
                </label>
              </div>
            </div>
          </div>
        </div>
        
        {/* Marketing Notifications Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="avatar placeholder shrink-0">
                <div className="bg-accent text-accent-content rounded-full w-10 h-10 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
              </div>
              <h2 className="card-title text-lg sm:text-xl">Marketing & Promotions</h2>
            </div>
            <div className="divider my-2"></div>
            <p className="text-xs sm:text-sm text-base-content/70 mb-6">
              Receive updates about new products, special offers, and exclusive deals.
            </p>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text font-semibold text-sm sm:text-base">Promotional Emails</span>
                  <input type="checkbox" className="toggle toggle-primary" />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text font-semibold text-sm sm:text-base">New Product Announcements</span>
                  <input type="checkbox" className="toggle toggle-primary" />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text font-semibold text-sm sm:text-base">Special Offers & Discounts</span>
                  <input type="checkbox" className="toggle toggle-primary" />
                </label>
              </div>
            </div>
          </div>
        </div>
        
        {/* Save Button */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <div className="card-actions justify-end flex-col sm:flex-row gap-2">
              <button className="btn btn-outline w-full sm:w-auto">Reset to Defaults</button>
              <button className="btn btn-primary w-full sm:w-auto">Save Preferences</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
