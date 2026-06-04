declare namespace Express {
    export interface Request {
        tenantId?: string;
        isLive?: boolean;
        tenant?: {
            id: string;
            name?: string;
        };
    }
}