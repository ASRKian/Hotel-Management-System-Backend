import express from "express";
import StaffController from "../controllers/Staff.controller.js";
import { supabaseAuth } from "../middlewares/supabaseAuth.js";
import { upload } from "../middlewares/upload.js";
import { requireRole } from "../middlewares/requireRole.js";
import { roles } from "../../utils/roles.js";

const router = express.Router();

router.get("/by-property/:id", supabaseAuth, requireRole(roles.SUPER_ADMIN, roles.ADMIN, roles.OWNER), StaffController.getAllByPropertyId.bind(StaffController));

router.get("/:id/image", supabaseAuth, StaffController.getImage.bind(StaffController)
);

router.get("/:id/id-proof", supabaseAuth, StaffController.getIdProof.bind(StaffController));

router.route("/")
    .get(supabaseAuth, StaffController.getAll.bind(StaffController))
    .post(supabaseAuth, upload.fields([{ name: "image", maxCount: 1 }, { name: "id_proof", maxCount: 1 },]), StaffController.create.bind(StaffController));

router.route("/:id")
    .get(supabaseAuth, StaffController.getById.bind(StaffController))
    .patch(supabaseAuth, upload.fields([{ name: "image", maxCount: 1 }, { name: "id_proof", maxCount: 1 },]), StaffController.update.bind(StaffController));

export default router;
