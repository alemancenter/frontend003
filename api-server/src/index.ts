import app from "./app";
import { logger } from "./lib/logger";

// Under Phusion Passenger (Plesk "Node.js") the listening socket is managed by
// Passenger — it patches http.Server.listen() and does NOT reliably set PORT.
// Hard-failing on a missing PORT is what crashed the app ("Web application could
// not be started"). Fall back to a sane default; the value is irrelevant under
// Passenger, and correct for a standalone/systemd run when PORT is provided.
const parsed = Number(process.env["PORT"]);
const port = Number.isFinite(parsed) && parsed > 0 ? parsed : 3000;

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
