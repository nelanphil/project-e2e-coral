import mongoose from "mongoose";
import { Cart } from "../models/Cart.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { SiteActivityLog } from "../models/SiteActivityLog.js";

export const PAID_STATUSES = ["processing", "shipped", "delivered"] as const;

export function parseAnalyticsMonthYear(req: {
  query: Record<string, unknown>;
}): { month: number; year: number; dateFrom: Date; dateTo: Date } {
  const now = new Date();
  const month = Math.min(
    12,
    Math.max(1, parseInt(String(req.query.month), 10) || now.getMonth() + 1),
  );
  const year = parseInt(String(req.query.year), 10) || now.getFullYear();
  const dateFrom = new Date(year, month - 1, 1);
  const dateTo = new Date(year, month, 1);
  return { month, year, dateFrom, dateTo };
}

const lineSubtotalExpr = {
  $sum: {
    $map: {
      input: "$lineItems",
      as: "item",
      in: { $multiply: ["$$item.price", "$$item.quantity"] },
    },
  },
};

const discountSumExpr = {
  $add: [
    { $ifNull: ["$discountAmountCents", 0] },
    { $ifNull: ["$pointsDiscountCents", 0] },
  ],
};

/** Net product total after product-level discounts (matches legacy /stats revenue slice). */
export const orderProductNetCentsExpr = {
  $subtract: [lineSubtotalExpr, discountSumExpr],
};

export const orderGrandTotalCentsExpr = {
  $subtract: [
    {
      $add: [
        lineSubtotalExpr,
        { $ifNull: ["$shippingAmount", 0] },
        { $ifNull: ["$taxAmount", 0] },
      ],
    },
    discountSumExpr,
  ],
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo] ?? 0;
  const w = idx - lo;
  return Math.round(
    (sorted[lo] ?? 0) * (1 - w) + (sorted[hi] ?? 0) * w,
  );
}

/** ip-api uses full country name; allow common variants. */
const US_COUNTRY_REGEX =
  /^(united states|united states of america|usa)$/i;

/** Lower 48 + DC: exclude Alaska and Hawaii from "continental" per common analytics usage. */
const NON_CONTINENTAL_STATE_REGEX = /^(alaska|hawaii)$/i;

export type UsaContinentalStateRow = {
  state: string;
  uniqueVisitors: number;
};

export function computeUsaContinentalFromVisitorRows(
  rows: { visitorKey: string; state: string }[],
): {
  uniqueVisitorsTotal: number;
  byState: UsaContinentalStateRow[];
} {
  const continentalRows = rows.filter((r) => {
    const st = r.state?.trim() ?? "";
    if (!st || NON_CONTINENTAL_STATE_REGEX.test(st)) return false;
    if (!r.visitorKey?.trim()) return false;
    return true;
  });

  const totalKeys = new Set<string>();
  const byStateSets = new Map<string, Set<string>>();

  for (const r of continentalRows) {
    totalKeys.add(r.visitorKey);
    let set = byStateSets.get(r.state.trim());
    if (!set) {
      set = new Set();
      byStateSets.set(r.state.trim(), set);
    }
    set.add(r.visitorKey);
  }

  const byState: UsaContinentalStateRow[] = [...byStateSets.entries()].map(
    ([state, set]) => ({ state, uniqueVisitors: set.size }),
  );

  return {
    uniqueVisitorsTotal: totalKeys.size,
    byState,
  };
}

export async function usaContinentalSiteStats(
  dateFrom: Date,
  dateTo: Date,
) {
  const rows = await SiteActivityLog.find({
    activityDay: { $gte: dateFrom, $lt: dateTo },
    geoCountry: { $regex: US_COUNTRY_REGEX },
    geoRegion: { $exists: true, $nin: [null, ""] },
  })
    .select({ identityKey: 1, geoRegion: 1, _id: 0 })
    .lean();

  const normalized = rows
    .map((r) => ({
      visitorKey: r.identityKey,
      state: (r.geoRegion ?? "").trim(),
    }))
    .filter((r) => r.state.length > 0);

  return computeUsaContinentalFromVisitorRows(normalized);
}

export async function siteActivityAnalytics(dateFrom: Date, dateTo: Date) {
  const dateFilter = { $gte: dateFrom, $lt: dateTo };
  const activityDayFilter = dateFilter;

  const userLookup = {
    $lookup: {
      from: "users",
      localField: "user",
      foreignField: "_id",
      as: "u",
    },
  } as const;

  const [
    cartsTouched,
    ordersCreated,
    ordersPaidCount,
    customerCount,
    anonymousCount,
    guestAccountCount,
    adminCount,
  ] = await Promise.all([
    Cart.countDocuments({ lastActivityAt: dateFilter }),
    Order.countDocuments({ createdAt: dateFilter }),
    Order.countDocuments({
      createdAt: dateFilter,
      status: { $in: [...PAID_STATUSES] },
    }),
    SiteActivityLog.aggregate<{ c: number }>([
      {
        $match: {
          activityDay: activityDayFilter,
          user: { $type: "objectId" },
        },
      },
      userLookup,
      { $match: { "u.role": "customer" } },
      { $group: { _id: "$user" } },
      { $count: "c" },
    ]),
    SiteActivityLog.aggregate<{ c: number }>([
      {
        $match: {
          activityDay: activityDayFilter,
          user: null,
        },
      },
      { $group: { _id: "$identityKey" } },
      { $count: "c" },
    ]),
    SiteActivityLog.aggregate<{ c: number }>([
      {
        $match: {
          activityDay: activityDayFilter,
          user: { $type: "objectId" },
        },
      },
      userLookup,
      { $match: { "u.role": "guest" } },
      { $group: { _id: "$user" } },
      { $count: "c" },
    ]),
    SiteActivityLog.aggregate<{ c: number }>([
      {
        $match: {
          activityDay: activityDayFilter,
          user: { $type: "objectId" },
        },
      },
      userLookup,
      { $match: { "u.role": "admin" } },
      { $group: { _id: "$user" } },
      { $count: "c" },
    ]),
  ]);

  const uniqueCustomers = customerCount[0]?.c ?? 0;
  const anonymousVisitors = anonymousCount[0]?.c ?? 0;
  const guestProfiles = guestAccountCount[0]?.c ?? 0;
  const adminVisitors = adminCount[0]?.c ?? 0;
  const uniqueGuests = anonymousVisitors + guestProfiles;

  const usaContinental = await usaContinentalSiteStats(dateFrom, dateTo);

  return {
    disclaimer:
      "Site activity metrics use the SiteActivityLog store (deduped daily per customer or per guest key).",
    disclaimerTooltip:
      "Enable TRUST_PROXY=true behind your reverse proxy so X-Forwarded-For is honored. Cart/order operational counts below are from the operational collections.",
    uniqueCustomers,
    uniqueGuests,
    visitorBreakdown: {
      customers: uniqueCustomers,
      anonymousVisitors,
      guestProfiles,
      adminVisitors,
    },
    cartsTouched,
    ordersCreated,
    ordersPaid: ordersPaidCount,
    usaContinental: {
      note:
        "Continental United States: lower 48 states and D.C., from geo on activity logs (excludes Alaska and Hawaii). Empty if logs have no US geo rows for this month.",
      uniqueVisitorsTotal: usaContinental.uniqueVisitorsTotal,
      statesWithActivity: usaContinental.byState.length,
      byState: usaContinental.byState,
    },
  };
}

export async function cartsAnalytics(
  dateFrom: Date,
  dateTo: Date,
) {
  const dateFilter = { $gte: dateFrom, $lt: dateTo };

  const abandoned = await Cart.aggregate<{
    _id: mongoose.Types.ObjectId;
    sessionId: string;
    user?: mongoose.Types.ObjectId;
    lastActivityAt: Date;
    subtotalCents: number;
    role?: string;
    items: { product: mongoose.Types.ObjectId; quantity: number }[];
    ipAddress?: string;
    userAgent?: string;
    referer?: string;
    geoCity?: string;
    geoRegion?: string;
    geoCountry?: string;
  }>([
    {
      $match: {
        items: { $exists: true, $ne: [] },
        lastActivityAt: dateFilter,
      },
    },
    {
      $lookup: {
        from: "orders",
        let: { sid: "$sessionId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$cartSessionId", "$$sid"] },
                  { $in: ["$status", [...PAID_STATUSES]] },
                ],
              },
            },
          },
        ],
        as: "paidOrders",
      },
    },
    { $match: { paidOrders: { $size: 0 } } },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "u",
      },
    },
    {
      $addFields: {
        role: { $arrayElemAt: ["$u.role", 0] },
      },
    },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.product",
        foreignField: "_id",
        as: "prod",
      },
    },
    {
      $addFields: {
        unitPrice: { $ifNull: [{ $arrayElemAt: ["$prod.price", 0] }, 0] },
      },
    },
    {
      $addFields: {
        lineCents: { $multiply: ["$items.quantity", "$unitPrice"] },
      },
    },
    {
      $group: {
        _id: "$_id",
        sessionId: { $first: "$sessionId" },
        user: { $first: "$user" },
        lastActivityAt: { $first: "$lastActivityAt" },
        role: { $first: "$role" },
        subtotalCents: { $sum: "$lineCents" },
        items: { $push: "$items" },
        ipAddress: { $first: "$ipAddress" },
        userAgent: { $first: "$userAgent" },
        referer: { $first: "$referer" },
        geoCity: { $first: "$geoCity" },
        geoRegion: { $first: "$geoRegion" },
        geoCountry: { $first: "$geoCountry" },
      },
    },
  ]);

  const abandonedCount = abandoned.length;
  let abandonedLoggedInCustomer = 0;
  let abandonedGuest = 0;
  const subtotals: number[] = [];

  for (const c of abandoned) {
    subtotals.push(c.subtotalCents);
    if (c.user && c.role === "customer") abandonedLoggedInCustomer += 1;
    else abandonedGuest += 1;
  }

  subtotals.sort((a, b) => a - b);
  const sum = subtotals.reduce((a, b) => a + b, 0);
  const avgSubtotalCents =
    abandonedCount > 0 ? Math.round(sum / abandonedCount) : 0;
  const medianSubtotalCents = percentile(subtotals, 0.5);
  const p90SubtotalCents = percentile(subtotals, 0.9);

  const productMap = new Map<
    string,
    { productId: string; name: string; quantity: number; cartCount: number }
  >();

  for (const c of abandoned) {
    const seenProducts = new Set<string>();
    for (const item of c.items ?? []) {
      const pid = item.product?.toString?.() ?? "";
      if (!pid) continue;
      const cur = productMap.get(pid) ?? {
        productId: pid,
        name: "",
        quantity: 0,
        cartCount: 0,
      };
      cur.quantity += item.quantity;
      productMap.set(pid, cur);
      seenProducts.add(pid);
    }
    for (const pid of seenProducts) {
      const cur = productMap.get(pid)!;
      cur.cartCount += 1;
    }
  }

  const productIds = [...productMap.keys()];
  if (productIds.length > 0) {
    const products = await Product.find({
      _id: {
        $in: productIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
    })
      .select("name")
      .lean();
    const nameById = new Map(
      products.map((p) => [
        String(p._id),
        p.name as string,
      ]),
    );
    for (const [_id, v] of productMap) {
      v.name = nameById.get(_id) ?? "Product";
    }
  }

  const topProducts = [...productMap.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 25);

  const sampleCarts = [...abandoned]
    .sort(
      (a, b) =>
        new Date(b.lastActivityAt).getTime() -
        new Date(a.lastActivityAt).getTime(),
    )
    .slice(0, 25);

  const sampleProductIds = new Set<string>();
  for (const c of sampleCarts) {
    for (const i of c.items ?? []) {
      if (i.product) sampleProductIds.add(i.product.toString());
    }
  }

  const sampleProdById = new Map<
    string,
    { name?: string; price?: number }
  >();
  if (sampleProductIds.size > 0) {
    const prods = await Product.find({
      _id: {
        $in: [...sampleProductIds].map(
          (id) => new mongoose.Types.ObjectId(id),
        ),
      },
    })
      .select("name price")
      .lean();
    for (const p of prods) {
      sampleProdById.set(String(p._id), {
        name: p.name,
        price: p.price,
      });
    }
  }

  const recentAbandoned = sampleCarts.map((c) => ({
    type: "cart" as const,
    _id: c._id,
    sessionId: c.sessionId,
    lastActivityAt: c.lastActivityAt,
    lineItems: (c.items ?? []).map((i) => {
      const p = sampleProdById.get(i.product.toString());
      return {
        quantity: i.quantity,
        price: p?.price ?? 0,
        product: { name: p?.name ?? "Product" },
      };
    }),
    subtotalCents: c.subtotalCents,
    segment: c.user && c.role === "customer" ? "customer" : ("guest" as const),
    ipAddress: c.ipAddress,
    userAgent: c.userAgent,
    referer: c.referer,
    geoCity: c.geoCity,
    geoRegion: c.geoRegion,
    geoCountry: c.geoCountry,
  }));

  return {
    abandonedCount,
    abandonedLoggedInCustomer,
    abandonedGuest,
    avgSubtotalCents,
    medianSubtotalCents,
    p90SubtotalCents,
    topProducts,
    recentAbandoned,
  };
}

export async function ordersAnalytics(dateFrom: Date, dateTo: Date) {
  const dateFilter = { $gte: dateFrom, $lt: dateTo };

  const paidMatch = {
    createdAt: dateFilter,
    status: { $in: [...PAID_STATUSES] },
  };

  const [aggRow, topProducts, recentPaid, recentPending] = await Promise.all([
    Order.aggregate<{
      count: number;
      revenueProductCents: number;
      grandTotalCentsList: number[];
    }>([
      { $match: paidMatch },
      {
        $addFields: {
          productNet: orderProductNetCentsExpr,
          grandTotal: orderGrandTotalCentsExpr,
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenueProductCents: { $sum: "$productNet" },
          grandTotalCentsList: { $push: "$grandTotal" },
        },
      },
    ]),
    Order.aggregate<{
      _id: mongoose.Types.ObjectId;
      units: number;
      revenueCents: number;
      orderCount: number;
    }>([
      { $match: paidMatch },
      { $unwind: "$lineItems" },
      {
        $group: {
          _id: "$lineItems.product",
          units: { $sum: "$lineItems.quantity" },
          revenueCents: {
            $sum: {
              $multiply: ["$lineItems.price", "$lineItems.quantity"],
            },
          },
          orderCount: { $addToSet: "$_id" },
        },
      },
      { $addFields: { orderCount: { $size: "$orderCount" } } },
      { $sort: { revenueCents: -1 } },
      { $limit: 25 },
    ]),
    Order.find(paidMatch)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("lineItems.product", "name")
      .lean(),
    Order.find({
      createdAt: dateFilter,
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("lineItems.product", "name")
      .lean(),
  ]);

  const row = aggRow[0];
  const count = row?.count ?? 0;
  const revenueProductCents = row?.revenueProductCents ?? 0;
  const list = (row?.grandTotalCentsList ?? []).slice().sort((a, b) => a - b);

  const avgGrandCents = count > 0 ? Math.round(list.reduce((a, b) => a + b, 0) / count) : 0;
  const minGrandCents = list.length ? list[0] : 0;
  const maxGrandCents = list.length ? list[list.length - 1] : 0;

  const productIds = topProducts.map((t) => t._id);
  const products =
    productIds.length === 0
      ? []
      : await Product.find({ _id: { $in: productIds } })
          .select("name")
          .lean();
  const nameById = new Map(
    products.map((p) => [String(p._id), p]),
  );

  const topProductsOut = topProducts.map((t) => {
    const p = nameById.get(String(t._id));
    return {
      productId: String(t._id),
      name: p?.name ?? "Product",
      units: t.units,
      revenueCents: t.revenueCents,
      orderCount: t.orderCount,
    };
  });

  type Li = {
    product: unknown;
    quantity: number;
    price: number;
  };

  const mapOrderActivity = (o: (typeof recentPaid)[0]) => {
    const lineItems = (o.lineItems as Li[]).map((li) => {
      const prod = li.product as { name?: string } | mongoose.Types.ObjectId;
      const name =
        typeof prod === "object" && prod && "name" in prod
          ? String((prod as { name?: string }).name ?? "Product")
          : "Product";
      return {
        product: { name },
        quantity: li.quantity,
        price: li.price,
      };
    });
    const subtotal = lineItems.reduce((s, li) => s + li.price * li.quantity, 0);
    return {
      type: "order" as const,
      _id: o._id,
      status: o.status,
      createdAt: o.createdAt,
      lineItems,
      shippingAddress: o.shippingAddress,
      ipAddress: o.ipAddress,
      userAgent: o.userAgent,
      referer: o.referer,
      geoCity: o.geoCity,
      geoRegion: o.geoRegion,
      geoCountry: o.geoCountry,
      grandTotalCents:
        subtotal +
        (o.shippingAmount ?? 0) +
        (o.taxAmount ?? 0) -
        (o.discountAmountCents ?? 0) -
        (o.pointsDiscountCents ?? 0),
    };
  };

  return {
    paidOrderCount: count,
    revenueProductCents,
    avgGrandTotalCents: avgGrandCents,
    minGrandTotalCents: minGrandCents,
    maxGrandTotalCents: maxGrandCents,
    topProducts: topProductsOut,
    recentPaid: recentPaid.map(mapOrderActivity),
    recentPendingCheckout: recentPending.map(mapOrderActivity),
  };
}
