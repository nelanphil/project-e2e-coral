import "dotenv/config";
import { connectDb } from "./lib/db.js";
import app from "./app.js";
import { startReleaseStaleCartReservationsJob } from "./jobs/releaseStaleCartReservations.js";

const PORT = process.env.PORT ?? 4004;

connectDb()
  .then(() => {
    startReleaseStaleCartReservationsJob();
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });
