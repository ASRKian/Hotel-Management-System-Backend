import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("SUPABASE_JWT_SECRET missing");
}

export function verifySupabaseJwt(token) {
    return jwt.verify(token, JWT_SECRET, {
        algorithms: ["HS256"]
    });
}
