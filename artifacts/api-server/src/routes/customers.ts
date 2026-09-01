import { Router, type Request, type Response } from "express";
import { db, customersTable } from "@/lib/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET all customers (visible to all roles)
router.get("/", async (req: Request, res: Response) => {
  try {
    const customers = await db.select().from(customersTable).orderBy(customersTable.name);
    res.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// POST create customer
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, address, city, phone, email } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    const [customer] = await db.insert(customersTable).values({
      name,
      address,
      city,
      phone,
      email,
      createdAt: new Date(),
    }).returning();
    res.json(customer);
  } catch (error) {
    console.error("Error creating customer:", error);
    res.status(500).json({ error: "Failed to create customer" });
  }
});

// GET customer by id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, parseInt(req.params.id)));
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

export default router;