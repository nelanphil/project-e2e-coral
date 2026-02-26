export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-base-content/80">
            Overview for store management.
          </p>
        </div>
      </div>

      {/* Placeholder stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-sm font-medium text-base-content/70">
              Total orders
            </h3>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-base-content/60">Placeholder</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-sm font-medium text-base-content/70">
              Products
            </h3>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-base-content/60">Placeholder</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-sm font-medium text-base-content/70">
              Categories
            </h3>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-base-content/60">Placeholder</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-sm font-medium text-base-content/70">
              Revenue
            </h3>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-base-content/60">Placeholder</p>
          </div>
        </div>
      </div>

      {/* Placeholder recent activity */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Recent activity</h2>
          <p className="text-sm text-base-content/60">
            Placeholder — no activity yet.
          </p>
        </div>
      </div>
    </div>
  );
}
