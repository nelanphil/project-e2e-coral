"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_js_1 = require("./lib/db.js");
const app_js_1 = __importDefault(require("./app.js"));
const PORT = process.env.PORT ?? 4000;
(0, db_js_1.connectDb)()
    .then(() => {
    app_js_1.default.listen(PORT, () => {
        console.log(`Server listening on http://localhost:${PORT}`);
    });
})
    .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
});
