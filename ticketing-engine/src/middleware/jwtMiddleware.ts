import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Missing or invalid Authorization header. Expected Bearer token.' });
            return;
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            res.status(401).json({ error: 'Token missing from Authorization header.' });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { tenantId: string, name: string };

        // Attach tenant to req for downstream usage
        req.tenant = {
            id: decoded.tenantId,
            name: decoded.name
        };

        // Determine environment context (default to Live if not explicitly set to Test)
        // This allows developers to easily toggle the dashboard between environments
        const queryIsLive = req.query.is_live;
        const headerEnv = req.headers['x-environment'];

        if (queryIsLive === 'false' || headerEnv === 'test') {
            req.isLive = false;
        } else {
            req.isLive = true;
        }

        next();
    } catch (error) {
        console.error('JWT Verification Error:', error);
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};
