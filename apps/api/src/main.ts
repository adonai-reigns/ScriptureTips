import { createApp } from "./app.ts";

const port = Number(process.env["PORT"] ?? 3001);
const app = await createApp();
await app.listen({ port, host: "0.0.0.0" });
console.log(`API listening on port ${port}`);
