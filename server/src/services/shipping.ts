import { Shippo } from "shippo";
import type { IShippingAddress } from "../models/Order.js";

const apiKey = process.env.SHIPPO_API_KEY;
const shippo = apiKey ? new Shippo({ apiKeyHeader: apiKey }) : null;

const defaultFrom = {
  name: process.env.SHIPPO_FROM_NAME ?? "Coral Store",
  street1: process.env.SHIPPO_FROM_STREET ?? "123 Store St",
  city: process.env.SHIPPO_FROM_CITY ?? "Austin",
  state: process.env.SHIPPO_FROM_STATE ?? "TX",
  zip: process.env.SHIPPO_FROM_ZIP ?? "78701",
  country: process.env.SHIPPO_FROM_COUNTRY ?? "US",
};

export interface ShippingRate {
  objectId: string;
  provider: string;
  servicelevel: { name: string };
  amount: string;
  durationTerms?: string;
}

export async function getRates(params: {
  addressTo: IShippingAddress;
  weightLbs?: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
}): Promise<{ rates: ShippingRate[] }> {
  if (!shippo) return { rates: [] };
  const { addressTo, weightLbs = 1, lengthIn = 6, widthIn = 6, heightIn = 6 } = params;
  try {
    const shipment = await shippo.shipments.create({
      addressFrom: defaultFrom,
      addressTo: {
        name: "Customer",
        street1: addressTo.line1,
        street2: addressTo.line2 ?? undefined,
        city: addressTo.city,
        state: addressTo.state,
        zip: addressTo.postalCode,
        country: addressTo.country,
      },
      parcels: [{ weight: `${weightLbs}`, length: `${lengthIn}`, width: `${widthIn}`, height: `${heightIn}` }],
    } as Parameters<typeof shippo.shipments.create>[0]);
    const ratesList = (shipment as { rates?: { results?: unknown[] } }).rates?.results ?? [];
    const rates = ratesList.map((r) => {
      const x = r as { object_id: string; provider: string; servicelevel: { name: string }; amount: string; duration_terms?: string };
      return { objectId: x.object_id, provider: x.provider, servicelevel: x.servicelevel, amount: x.amount, durationTerms: x.duration_terms };
    });
    return { rates };
  } catch (err) {
    console.error("Shippo getRates:", err);
    return { rates: [] };
  }
}

export async function createShipment(params: {
  addressTo: IShippingAddress;
  rateId: string;
}): Promise<{ trackingNumber: string; labelUrl?: string } | null> {
  if (!shippo) return null;
  const { addressTo, rateId } = params;
  try {
    const transaction = await shippo.transactions.create({ rate: rateId } as Parameters<typeof shippo.transactions.create>[0]);
    const t = transaction as { status?: string; trackingNumber?: string; labelUrl?: string };
    if (t.status !== "SUCCESS" || !t.trackingNumber) return null;
    return {
      trackingNumber: t.trackingNumber,
      labelUrl: t.labelUrl ?? undefined,
    };
  } catch (err) {
    console.error("Shippo createShipment:", err);
    return null;
  }
}
