import type { IncomingMessage, ServerResponse } from "node:http";

export type Method = "GET" | "POST";

export type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
) => void | Promise<void>;

export interface Route {
  method: Method;
  path: string;
  handler: Handler;
}
