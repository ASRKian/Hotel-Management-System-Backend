import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv"

dotenv.config()

class Supabase {
    #CLIENT;

    constructor() {
        this.#CLIENT = createClient(process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
            { auth: { persistSession: false, autoRefreshToken: false } }
        );
    }

    client() {
        return this.#CLIENT

    }

    async createUser({ email, password, role_ids }) {
        return await this.client().auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            // app_metadata: {roles: role_ids}
        });
    }
}

const supabase = new Supabase()
Object.freeze(supabase)

export default supabase