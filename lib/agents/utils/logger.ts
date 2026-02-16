// lib/agents/utils/logger.ts
// Structured logging utility for agent observability

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
    agent: string;
    action: string;
    data?: Record<string, unknown>;
    duration?: number;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const currentLevel = LOG_LEVELS[(process.env.AGENT_LOG_LEVEL as LogLevel) ?? "info"] ?? 1;

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= currentLevel;
}

function formatMessage(ctx: LogContext): string {
    const timestamp = new Date().toISOString();
    const durationStr = ctx.duration !== undefined ? ` [${ctx.duration}ms]` : "";
    const label = ctx.agent.includes(":") ? ctx.agent.toUpperCase() : `AGENT:${ctx.agent}`;
    return `[${timestamp}] [${label}] ${ctx.action}${durationStr}`;
}

export function agentLog(agent: string, action: string, data?: Record<string, unknown>, duration?: number): void {
    if (!shouldLog("info")) return;
    const message = formatMessage({ agent, action, data, duration });
    if (data && Object.keys(data).length > 0) {
        console.log(message, JSON.stringify(data));
    } else {
        console.log(message);
    }
}

export function agentWarn(agent: string, action: string, data?: Record<string, unknown>): void {
    if (!shouldLog("warn")) return;
    const message = formatMessage({ agent, action, data });
    console.warn(message, data ? JSON.stringify(data) : "");
}

export function agentError(agent: string, action: string, error: unknown, data?: Record<string, unknown>): void {
    if (!shouldLog("error")) return;
    const message = formatMessage({ agent, action, data });

    let errorDetail: string;
    if (error instanceof Error) {
        errorDetail = error.message;
    } else if (typeof error === "object" && error !== null) {
        try {
            errorDetail = JSON.stringify(error);
        } catch {
            errorDetail = String(error);
        }
    } else {
        errorDetail = String(error);
    }

    console.error(message, JSON.stringify({ error: errorDetail, ...data }));

    // Also log the stack trace if available
    if (error instanceof Error && error.stack) {
        console.error(error.stack);
    }
}

export function createTimer(): { elapsed: () => number } {
    const start = performance.now();
    return {
        elapsed: () => Math.round(performance.now() - start),
    };
}
