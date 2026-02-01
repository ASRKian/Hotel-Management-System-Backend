import express from 'express'
import { supabaseAuth } from '../middlewares/supabaseAuth.js'
import AuditController from '../controllers/Audit.controller.js'

const router = express.Router()

router.get("/", supabaseAuth, AuditController.getByEventAndTable.bind(AuditController))

export default router