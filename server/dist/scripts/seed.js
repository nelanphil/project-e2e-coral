"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_js_1 = require("../lib/db.js");
const Category_js_1 = require("../models/Category.js");
const Product_js_1 = require("../models/Product.js");
async function seed() {
    await (0, db_js_1.connectDb)();
    await Product_js_1.Product.deleteMany({});
    await Category_js_1.Category.deleteMany({});
    const categories = await Category_js_1.Category.insertMany([
        { name: "Soft Coral", slug: "soft-coral" },
        { name: "LPS", slug: "lps" },
        { name: "SPS", slug: "sps" },
    ]);
    const [soft, lps, sps] = categories;
    await Product_js_1.Product.insertMany([
        {
            name: "Green Star Polyps",
            slug: "green-star-polyps",
            description: "Easy soft coral with flowing polyps.",
            images: [],
            price: 2999,
            category: soft._id,
            stock: 10,
        },
        {
            name: "Zoanthid Rainbow",
            slug: "zoanthid-rainbow",
            description: "Colorful zoanthid colony.",
            images: [],
            price: 4999,
            category: soft._id,
            stock: 5,
        },
        {
            name: "Hammer Coral",
            slug: "hammer-coral",
            description: "Popular LPS with branching or wall form.",
            images: [],
            price: 7999,
            category: lps._id,
            stock: 3,
        },
        {
            name: "Acropora",
            slug: "acropora",
            description: "Classic SPS for experienced keepers.",
            images: [],
            price: 12999,
            category: sps._id,
            stock: 2,
        },
    ]);
    console.log("Seed complete: categories and products created.");
    process.exit(0);
}
seed().catch((err) => {
    console.error(err);
    process.exit(1);
});
