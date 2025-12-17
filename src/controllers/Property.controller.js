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

      const property = await propertyService.create({
        payload: req.body,
        userId
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

      const updated = await propertyService.update({
        id,
        payload: req.body,
        userId
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
}

const property = new Property();
Object.freeze(property);

export default property;
