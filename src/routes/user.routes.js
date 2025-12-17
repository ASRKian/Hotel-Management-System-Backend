import express from "express";
import user from "../controllers/User.controller.js";
import { supabaseAuth } from "../middlewares/supabaseAuth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { roles } from "../../utils/roles.js";

const router = express.Router()

router.route("/")
    .post(supabaseAuth, requireRole(roles.SUPER_ADMIN, roles.ADMIN), user.createUser.bind(user))

router.route("/me")
    .get(supabaseAuth, user.getMe.bind(user))

export default router;