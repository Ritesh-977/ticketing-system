import { type Request, type Response, type NextFunction } from 'express';

export const requireApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
            return;
        }

        const apiKey = authHeader.split(' ')[1];

        // Basic validation of key format
        if (!apiKey.startsWith('sk_live_') && !apiKey.startsWith('sk_test_')) {
            res.status(401).json({ error: 'Unauthorized: Invalid API key format' });
            return;
        }

        // TODO: In production, lookup the API key in the database to validate the developer account
        // const developer = await db.query('SELECT * FROM developer_keys WHERE api_key = $1 AND is_active = true', [apiKey]);
        // if (developer.rows.length === 0) { ... }

        // Mock validation logic
        const isValidKey = apiKey.startsWith('sk_test_') || apiKey.startsWith('sk_live_'); 

        if (!isValidKey) {
            res.status(401).json({ error: 'Unauthorized: Invalid API key' });
            return;
        }

        // Attach the mock developer info to the request for downstream use if needed
        // (req as any).developerId = 'dev_123';

        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        res.status(500).json({ error: 'Internal Server Error during authentication' });
        return;
    }
};
