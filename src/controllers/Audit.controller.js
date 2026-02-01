import AuditService from "../services/Audit.service.js"

class AuditController {
    async getByEventAndTable(req, res) {
        try {
            const { eventId, tableName } = req.query
            if (!eventId || !tableName) {
                return res.status(400).json({ message: "eventId & tableName are required" })
            }

            const logs = await AuditService.getByEventAndTable({ eventId, tableName })
            return res.json(logs)
        } catch (error) {
            console.log("🚀 ~ AuditController ~ getByEventAndTable ~ error:", error)
            return res.status(500).json({ message: "Error fetching logs" })
        }
    }
}

export default Object.freeze(new AuditController())