import { getDb } from "../../utils/getDb.js";
import cache from "../cache/lruCache.js";

class Role {

    #DB;
    #CACHE_KEY_PREFIX;

    constructor() {
        this.#DB = getDb()
        this.#CACHE_KEY_PREFIX = "USER_ROLES:"
    }

    async createUserRole({ userId, roleId }) {
        await this.#DB.query(
            `
        insert into user_roles (user_id, role_id)
        values ($1, $2)
        `,
            [userId, roleId]
        );
    }

    async createRole({ roleName }) {
        const { rows } = await this.#DB.query(
            `
      INSERT INTO public.roles (name)
      VALUES ($1)
      ON CONFLICT (name) DO NOTHING
      RETURNING id
    `,
            [roleName]
        );

        if (rows.length > 0) {
            return rows[0].id;
        }

        const result = await this.#DB.query(
            `
      SELECT id
      FROM public.roles
      WHERE name = $1
    `,
            [roleName]
        );

        return result.rows[0].id;
    }

    async getUserRoles({ userId }) {

        const { rows } = await this.#DB.query(
            `
      SELECT r.id, r.name
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `,
            [userId]
        );

        return rows;
    }

    async getUserRoleNamesByUserId({ userId }) {

        const cacheKey = `${this.#CACHE_KEY_PREFIX}${userId}`

        const cached = cache.get(cacheKey)
        if (cached) {
            return cached;
        }

        const { rows } = await this.#DB.query(
            `
      SELECT COALESCE(array_agg(r.name ORDER BY r.name), '{}') AS roles
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `,
            [userId]
        );
        const roles = rows[0].roles
        cache.set(cacheKey, roles)

        return roles;
    }

    async getAllRoles() {
        const { rows } = await this.#DB.query(
            `
      SELECT id, name
      FROM public.roles
      ORDER BY name
    `
        );

        return rows;
    }


}

const role = new Role();
Object.freeze(role);

export default role;