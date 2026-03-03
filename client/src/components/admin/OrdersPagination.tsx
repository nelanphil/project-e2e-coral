"use client";

interface Props {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const PAGE_SIZES = [50, 100, 150, 250];

export default function OrdersPagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      const rangeStart = Math.max(2, page - 1);
      const rangeEnd = Math.min(totalPages - 1, page + 1);
      for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Showing summary */}
      <span className="text-sm text-base-content/70">
        {total === 0
          ? "No orders found"
          : `Showing ${start} to ${end} of ${total}`}
      </span>

      <div className="flex items-center gap-3">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-base-content/70">Per page:</span>
          <select
            className="select select-bordered select-xs"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}>
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Page navigation */}
        {totalPages > 1 && (
          <div className="join">
            <button
              type="button"
              className="join-item btn btn-xs"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}>
              «
            </button>
            {getPageNumbers().map((p, i) =>
              p === "..." ? (
                <button
                  key={`ellipsis-${i}`}
                  type="button"
                  className="join-item btn btn-xs btn-disabled">
                  …
                </button>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={`join-item btn btn-xs ${
                    p === page ? "btn-active" : ""
                  }`}
                  onClick={() => onPageChange(p)}>
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              className="join-item btn btn-xs"
              disabled={page === totalPages}
              onClick={() => onPageChange(page + 1)}>
              »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
