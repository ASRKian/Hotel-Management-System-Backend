import { getDb } from "../../utils/getDb.js";

class User {

    #DB

    constructor() {
        this.#DB = getDb()
    }

    async createUser({ authUserId, email, property_id, user_name }) {
        const userResult = await this.#DB.query(
            `
      insert into public.users (
        id,
        email,
        property_id,
        is_active
      )
      values ($1, $2, $3, true)
      returning id
      `,
            [authUserId, email, property_id]
        );

        return userResult.rows[0];
    }

    async getUser({ authUserId }) {
        return await this.#DB.query(
            `
      select
        u.email,
        u.property_id,
        u.is_active
      from public.users u
      where u.id = $1
      limit 1
      `,
            [authUserId]
        );
    }
}

const user = new User();
Object.freeze(user);

export default user;