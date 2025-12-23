import StaffService from "../services/Staff.service.js";

class StaffController {

    async getAll(req, res) {
        try {
            const result = await StaffService.getAll({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 10,
                search: req.query.search,
                department: req.query.department,
                designation: req.query.designation,
                status: req.query.status,
            });

            res.json({
                message: "Success",
                ...result,
            });
        } catch (err) {
            console.log("🚀 ~ StaffController ~ getAll ~ err:", err)
            return res.status(500).json({ message: "Error getting staff" })
        }
    }

    async getById(req, res) {
        try {
            const staff = await StaffService.getById(req.params.id);

            if (!staff) {
                return res.status(404).json({ message: "Staff not found" });
            }

            res.json({
                message: "Success",
                data: staff,
            });
        } catch (err) {
            console.log("🚀 ~ StaffController ~ getById ~ err:", err)
            return res.status(500).json({ message: "Error getting staff" })
        }
    }

    async getAllByPropertyId(req, res) {
        try {
            const property_id = req.params.id;
            if (isNaN(+property_id)) return res.status(404).send()

            const staff = await StaffService.getStaffByPropertyId({
                property_id,
                page: req.query.page,
                limit: req.query.limit,
                search: req.query.search,
                department: req.query.department,
                status: req.query.status,
            });

            return res.json({
                message: "Success",
                ...staff,
            });
        } catch (error) {
            console.log("🚀 ~ StaffController ~ getAllByPropertyId ~ error:", error)
            return res.status(500).json({ message: "Error getting staff" })
        }

    }

    async create(req, res) {
        try {
            const staff = await StaffService.create(
                req.body,
                req.files,
                req.user.id
            );

            res.status(201).json({
                message: "Staff created successfully",
                data: staff,
            });
        } catch (err) {
            console.log("🚀 ~ StaffController ~ create ~ err:", err)
            return res.status(500).json({ message: "Error creating staff" })
        }
    }

    async update(req, res) {
        try {
            await StaffService.update(
                req.params.id,
                req.body,
                req.files,
                req.user.id
            );

            res.json({
                message: "Staff updated successfully",
            });
        } catch (err) {
            console.log("🚀 ~ StaffController ~ update ~ err:", err)
            return res.status(500).json({ message: "Error updating staff" })
        }
    }

    async getImage(req, res) {
        try {
            const result = await StaffService.getImage(req.params.id);

            if (!result || !result.image) {
                return res.status(404).json({ message: "Image not found" });
            }

            res.setHeader("Content-Type", result.image_mime);
            res.send(result.image);
        } catch (err) {
            console.log("🚀 ~ StaffController ~ getImage ~ err:", err)
            return res.status(500).json({ message: "Error getting staff image" })
        }
    }

    async getIdProof(req, res) {
        try {
            const result = await StaffService.getIdProof(req.params.id);

            if (!result || !result.id_proof) {
                return res.status(404).json({ message: "ID proof not found" });
            }

            res.setHeader("Content-Type", result.id_proof_mime);
            res.send(result.id_proof);
        } catch (err) {
            console.log("🚀 ~ StaffController ~ getIdProof ~ err:", err)
            return res.status(500).json({ message: "Error getting staff id image" })
        }
    }
}

export default Object.freeze(new StaffController())