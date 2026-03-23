import "dotenv/config";
import { connectDb } from "./lib/db.js";
import app from "./app.js";
import { startReleaseStaleCartReservationsJob } from "./jobs/releaseStaleCartReservations.js";

const PORT = process.env.API_PORT ?? process.env.PORT ?? 4004;

connectDb()
  .then(() => {
    startReleaseStaleCartReservationsJob();
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Server listening on 0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });
