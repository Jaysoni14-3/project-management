import { randomBytes } from "node:crypto";

/* Attach a short request id to every incoming request so error
   responses can quote it (and clients can copy/paste it into bug
   reports). The id is also echoed back as `X-Request-Id` so anyone
   debugging via curl/devtools sees the same value the server logs. */
export const requestId = (req, res, next) => {
  const incoming = req.headers["x-request-id"];
  const id =
    typeof incoming === "string" && incoming.length > 0 && incoming.length < 64
      ? incoming
      : randomBytes(6).toString("hex");
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
};
