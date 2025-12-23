import propertyService from "../services/Property.service.js";

class Property {
  async getById(req, res) {
    try {
      const id = Number(req.params.id);

      if (!id) {
        return res.status(400).json({ error: "Invalid property id" });
      }

      const property = await propertyService.getById({ id });

      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      return res.json(property);
    } catch (err) {
      console.error("Property.getById:", err);
      return res.status(500).json({ error: "Failed to fetch property" });
    }
  }

  async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        city,
        state,
        country,
        search
      } = req.query;

      const is_active =
        req.query.is_active !== undefined
          ? req.query.is_active === "true"
          : undefined;

      const result = await propertyService.getAll({
        page: Number(page),
        limit: Number(limit),
        city,
        state,
        country,
        is_active,
        search
      });

      return res.json(result);
    } catch (err) {
      console.error("Property.getAll:", err);
      return res.status(500).json({ error: "Failed to fetch properties" });
    }
  }

  async create(req, res) {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const payload = {
        ...req.body,
        image: req.file?.buffer ?? null,
        image_mime: req.file?.mimetype ?? null,
      };

      const property = await propertyService.create({
        payload,
        userId,
      });

      return res.status(201).json(property);
    } catch (err) {
      console.error("Property.create:", err);
      return res.status(500).json({ error: "Failed to create property" });
    }
  }

  async update(req, res) {
    try {
      const id = Number(req.params.id);
      const userId = req.user?.user_id;

      if (!id) {
        return res.status(400).json({ error: "Invalid property id" });
      }

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const payload = {
        ...req.body,
      };
      if (req.file) {
        payload.image = req.file.buffer;
        payload.image_mime = req.file.mimetype;
      }

      const updated = await propertyService.update({
        id,
        payload,
        userId,
      });

      if (!updated) {
        return res.status(404).json({ error: "Property not found" });
      }

      return res.json(updated);
    } catch (err) {
      console.error("Property.update:", err);
      return res.status(500).json({ error: "Failed to update property" });
    }
  }

  async getImage(req, res) {
    try {
      const id = req.params.id
      if (!id || id == "null") return res.send()
      const { image, image_mime } = await propertyService.getImage({ id })
      res.setHeader('Content-Type', image_mime)
      return res.send(image)
    } catch (error) {
      console.log("🚀 ~ Property ~ getImage ~ error:", error)
      return res.status(500).json({ error: "Failed to get image" });
    }
  }

  async getByAdminUserId(req, res) {
    try {
      const id = req.user.user_id
      const data = await propertyService.getByAdminUserId(id)
      return res.json({ message: "Success", data })
    } catch (error) {
      console.log("🚀 ~ Property ~ getByAdminUserId ~ error:", error)
      return res.status(500).json({ error: "Failed to get Properties" });
    }
  }

}

const property = new Property();
Object.freeze(property);

export default property;
