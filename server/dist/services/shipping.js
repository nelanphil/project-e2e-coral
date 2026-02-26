"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRates = getRates;
exports.createShipment = createShipment;
const shippo_1 = require("shippo");
const apiKey = process.env.SHIPPO_API_KEY;
const shippo = apiKey ? new shippo_1.Shippo({ apiKeyHeader: apiKey }) : null;
const defaultFrom = {
    name: process.env.SHIPPO_FROM_NAME ?? "Coral Store",
    street1: process.env.SHIPPO_FROM_STREET ?? "123 Store St",
    city: process.env.SHIPPO_FROM_CITY ?? "Austin",
    state: process.env.SHIPPO_FROM_STATE ?? "TX",
    zip: process.env.SHIPPO_FROM_ZIP ?? "78701",
    country: process.env.SHIPPO_FROM_COUNTRY ?? "US",
};
async function getRates(params) {
    if (!shippo)
        return { rates: [] };
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
        });
        const ratesList = shipment.rates?.results ?? [];
        const rates = ratesList.map((r) => {
            const x = r;
            return { objectId: x.object_id, provider: x.provider, servicelevel: x.servicelevel, amount: x.amount, durationTerms: x.duration_terms };
        });
        return { rates };
    }
    catch (err) {
        console.error("Shippo getRates:", err);
        return { rates: [] };
    }
}
async function createShipment(params) {
    if (!shippo)
        return null;
    const { addressTo, rateId } = params;
    try {
        const transaction = await shippo.transactions.create({ rate: rateId });
        const t = transaction;
        if (t.status !== "SUCCESS" || !t.trackingNumber)
            return null;
        return {
            trackingNumber: t.trackingNumber,
            labelUrl: t.labelUrl ?? undefined,
        };
    }
    catch (err) {
        console.error("Shippo createShipment:", err);
        return null;
    }
}
