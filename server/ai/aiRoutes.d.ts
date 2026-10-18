import type { IncomingMessage, ServerResponse } from 'node:http';

export function handleAiRequest(req: IncomingMessage, res: ServerResponse): Promise<void>;
export function handleStatusRequest(req: IncomingMessage, res: ServerResponse): void;
