import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { query } from "../db/connection";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  category: z.string().optional(),
  group: z.string().optional(),
});

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  contact_ids: z.array(z.string()).optional().default([]),
});

const bulkImportSchema = z.array(
  z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(1, "Phone is required"),
    category: z.string().optional(),
    group: z.string().optional(),
  })
);

// Helper function to safely extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export const createContactController = () => {
  const app = new Hono();

  // Get all contacts with their groups
  app.get("/", async (c) => {
    try {
      console.log("📱 Getting all contacts...");

      const contactsResult = await query(`
        SELECT 
          c.id,
          c.name,
          c.phone,
          c.category,
          c.created_at,
          c.updated_at,
          COALESCE(
            array_agg(cg.group_name) FILTER (WHERE cg.group_name IS NOT NULL),
            ARRAY[]::text[]
          ) as groups
        FROM contacts c
        LEFT JOIN contact_groups cg ON c.id = cg.contact_id
        GROUP BY c.id, c.name, c.phone, c.category, c.created_at, c.updated_at
        ORDER BY c.created_at DESC
      `);

      console.log(`✅ Found ${contactsResult.rows.length} contacts`);

      return c.json({
        success: true,
        data: contactsResult.rows,
        message: `Found ${contactsResult.rows.length} contacts`,
      });
    } catch (error) {
      console.error("❌ Error getting contacts:", getErrorMessage(error));
      return c.json(
        {
          success: false,
          error: "Failed to get contacts: " + getErrorMessage(error),
        },
        500
      );
    }
  });

  // Add new contact
  app.post("/", zValidator("json", contactSchema), async (c) => {
    try {
      const { name, phone, category, group } = c.req.valid("json");

      console.log("📱 Adding new contact:", { name, phone, category, group });

      // Check if contact with this phone already exists
      const existingContact = await query(
        "SELECT id FROM contacts WHERE phone = $1",
        [phone]
      );

      if (existingContact.rows.length > 0) {
        return c.json(
          {
            success: false,
            error: "Contact with this phone number already exists",
          },
          400
        );
      }

      // Insert new contact
      const result = await query(
        "INSERT INTO contacts (name, phone, category, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *",
        [name, phone, category || null]
      );

      const newContact = result.rows[0];
      console.log(`✅ Contact added with ID: ${newContact.id}`);

      // Add to group if specified
      if (group && group.trim()) {
        try {
          await query(
            "INSERT INTO contact_groups (contact_id, group_name, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (contact_id, group_name) DO NOTHING",
            [newContact.id, group.trim()]
          );
          console.log(`✅ Contact added to group: ${group}`);
        } catch (groupError) {
          console.log(
            "⚠️ Group assignment error (contact still created):",
            getErrorMessage(groupError)
          );
        }
      }

      return c.json({
        success: true,
        data: newContact,
        message: "Contact added successfully",
      });
    } catch (error) {
      console.error("❌ Error adding contact:", getErrorMessage(error));
      return c.json(
        {
          success: false,
          error: "Failed to add contact: " + getErrorMessage(error),
        },
        500
      );
    }
  });

  // Update contact
  app.put("/:id", zValidator("json", contactSchema), async (c) => {
    try {
      const id = c.req.param("id");
      const { name, phone, category, group } = c.req.valid("json");

      console.log("📱 Updating contact:", { id, name, phone, category, group });

      // Check if contact exists
      const existingContact = await query(
        "SELECT * FROM contacts WHERE id = $1",
        [id]
      );
      if (existingContact.rows.length === 0) {
        return c.json(
          {
            success: false,
            error: "Contact not found",
          },
          404
        );
      }

      // Check if phone is taken by another contact
      const phoneCheck = await query(
        "SELECT id FROM contacts WHERE phone = $1 AND id != $2",
        [phone, id]
      );

      if (phoneCheck.rows.length > 0) {
        return c.json(
          {
            success: false,
            error: "Phone number is already used by another contact",
          },
          400
        );
      }

      // Update contact
      const result = await query(
        "UPDATE contacts SET name = $1, phone = $2, category = $3, updated_at = NOW() WHERE id = $4 RETURNING *",
        [name, phone, category || null, id]
      );

      const updatedContact = result.rows[0];
      console.log(`✅ Contact updated: ${updatedContact.id}`);

      // Handle group assignment
      if (group && group.trim()) {
        try {
          // Remove from all existing groups first
          await query("DELETE FROM contact_groups WHERE contact_id = $1", [id]);

          // Add to new group
          await query(
            "INSERT INTO contact_groups (contact_id, group_name, created_at) VALUES ($1, $2, NOW())",
            [id, group.trim()]
          );
          console.log(`✅ Contact updated group assignment: ${group}`);
        } catch (groupError) {
          console.log(
            "⚠️ Group assignment error during update:",
            getErrorMessage(groupError)
          );
        }
      } else {
        // Remove from all groups if no group specified
        await query("DELETE FROM contact_groups WHERE contact_id = $1", [id]);
      }

      return c.json({
        success: true,
        data: updatedContact,
        message: "Contact updated successfully",
      });
    } catch (error) {
      console.error("❌ Error updating contact:", getErrorMessage(error));
      return c.json(
        {
          success: false,
          error: "Failed to update contact: " + getErrorMessage(error),
        },
        500
      );
    }
  });

  // Delete contact
  app.delete("/:id", async (c) => {
    try {
      const id = c.req.param("id");

      console.log("📱 Deleting contact:", id);

      // Check if contact exists
      const existingContact = await query(
        "SELECT * FROM contacts WHERE id = $1",
        [id]
      );
      if (existingContact.rows.length === 0) {
        return c.json(
          {
            success: false,
            error: "Contact not found",
          },
          404
        );
      }

      // Delete contact (cascade will handle contact_groups)
      await query("DELETE FROM contacts WHERE id = $1", [id]);

      console.log(`✅ Contact deleted: ${id}`);

      return c.json({
        success: true,
        message: "Contact deleted successfully",
      });
    } catch (error) {
      console.error("❌ Error deleting contact:", getErrorMessage(error));
      return c.json(
        {
          success: false,
          error: "Failed to delete contact: " + getErrorMessage(error),
        },
        500
      );
    }
  });

  // Bulk import contacts
  app.post("/bulk-import", zValidator("json", bulkImportSchema), async (c) => {
    try {
      const contactsData = c.req.valid("json");

      console.log(`📱 Bulk importing ${contactsData.length} contacts...`);

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const contactData of contactsData) {
        try {
          // Check if contact already exists
          const existingContact = await query(
            "SELECT id FROM contacts WHERE phone = $1",
            [contactData.phone]
          );

          if (existingContact.rows.length > 0) {
            skipped++;
            continue;
          }

          // Insert contact
          const result = await query(
            "INSERT INTO contacts (name, phone, category, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *",
            [contactData.name, contactData.phone, contactData.category || null]
          );

          const newContact = result.rows[0];

          // Add to group if specified
          if (contactData.group && contactData.group.trim()) {
            try {
              await query(
                "INSERT INTO contact_groups (contact_id, group_name, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (contact_id, group_name) DO NOTHING",
                [newContact.id, contactData.group.trim()]
              );
            } catch (groupError) {
              console.log(
                `⚠️ Group assignment error for ${contactData.name}:`,
                getErrorMessage(groupError)
              );
            }
          }

          imported++;
        } catch (contactError) {
          errors.push(`${contactData.name}: ${getErrorMessage(contactError)}`);
        }
      }

      console.log(
        `✅ Bulk import completed: ${imported} imported, ${skipped} skipped, ${errors.length} errors`
      );

      return c.json({
        success: true,
        data: {
          imported,
          skipped,
          errors,
        },
        message: `Bulk import completed: ${imported} imported, ${skipped} skipped`,
      });
    } catch (error) {
      console.error("❌ Error in bulk import:", getErrorMessage(error));
      return c.json(
        {
          success: false,
          error: "Failed to bulk import contacts: " + getErrorMessage(error),
        },
        500
      );
    }
  });

  // Get groups with contact counts and contact details
  app.get("/groups", async (c) => {
    try {
      console.log("👥 Getting all groups...");

      // Get groups with contacts
      const groupsResult = await query(`
        SELECT 
          cg.group_name,
          COUNT(cg.contact_id) as contact_count,
          array_agg(
            json_build_object(
              'id', c.id,
              'name', c.name,
              'phone', c.phone,
              'category', c.category
            )
          ) FILTER (WHERE c.id IS NOT NULL) as contacts
        FROM contact_groups cg
        LEFT JOIN contacts c ON cg.contact_id = c.id
        GROUP BY cg.group_name
        ORDER BY cg.group_name
      `);

      // Get statistics
      const statsResult = await query(`
        SELECT 
          (SELECT COUNT(DISTINCT group_name) FROM contact_groups) as total_groups,
          (SELECT COUNT(DISTINCT contact_id) FROM contact_groups) as contacts_in_groups,
          (SELECT COUNT(*) FROM contacts WHERE id NOT IN (SELECT DISTINCT contact_id FROM contact_groups)) as ungrouped_contacts,
          (SELECT COUNT(*) FROM contacts) as total_contacts
      `);

      const stats = statsResult.rows[0];
      console.log(`✅ Found ${groupsResult.rows.length} groups`);

      return c.json({
        success: true,
        data: {
          groups: groupsResult.rows,
          stats: stats,
        },
        message: `Found ${groupsResult.rows.length} groups`,
      });
    } catch (error) {
      console.error("❌ Error getting groups:", getErrorMessage(error));
      return c.json(
        {
          success: false,
          error: "Failed to get groups: " + getErrorMessage(error),
        },
        500
      );
    }
  });

  // Save group (create or update)
  app.post("/groups", zValidator("json", groupSchema), async (c) => {
    try {
      const { name, description, contact_ids } = c.req.valid("json");

      console.log("👥 Saving group:", { name, description, contact_ids });

      // Delete existing group assignments for this group
      await query("DELETE FROM contact_groups WHERE group_name = $1", [name]);

      // Add contacts to group
      if (contact_ids && contact_ids.length > 0) {
        for (const contactId of contact_ids) {
          await query(
            "INSERT INTO contact_groups (contact_id, group_name, created_at) VALUES ($1, $2, NOW())",
            [contactId, name]
          );
        }
      }

      console.log(
        `✅ Group saved: ${name} with ${contact_ids?.length || 0} contacts`
      );

      return c.json({
        success: true,
        message: "Group saved successfully",
      });
    } catch (error) {
      console.error("❌ Error saving group:", getErrorMessage(error));
      return c.json(
        {
          success: false,
          error: "Failed to save group: " + getErrorMessage(error),
        },
        500
      );
    }
  });

  // Delete group
  app.delete("/groups/:name", async (c) => {
    try {
      const groupName = c.req.param("name");

      console.log("👥 Deleting group:", groupName);

      // Delete group (only removes group assignments, not contacts)
      const result = await query(
        "DELETE FROM contact_groups WHERE group_name = $1",
        [groupName]
      );

      console.log(`✅ Group deleted: ${groupName}`);

      return c.json({
        success: true,
        message: "Group deleted successfully",
      });
    } catch (error) {
      console.error("❌ Error deleting group:", getErrorMessage(error));
      return c.json(
        {
          success: false,
          error: "Failed to delete group: " + getErrorMessage(error),
        },
        500
      );
    }
  });

  // Add contact to group
  app.post("/groups/:groupName/contacts/:contactId", async (c) => {
    try {
      const groupName = c.req.param("groupName");
      const contactId = c.req.param("contactId");

      console.log("👥 Adding contact to group:", { contactId, groupName });

      // Check if contact exists
      const contactCheck = await query(
        "SELECT id FROM contacts WHERE id = $1",
        [contactId]
      );
      if (contactCheck.rows.length === 0) {
        return c.json(
          {
            success: false,
            error: "Contact not found",
          },
          404
        );
      }

      // Add contact to group
      await query(
        "INSERT INTO contact_groups (contact_id, group_name, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (contact_id, group_name) DO NOTHING",
        [contactId, groupName]
      );

      console.log(`✅ Contact added to group: ${contactId} -> ${groupName}`);

      return c.json({
        success: true,
        message: "Contact added to group successfully",
      });
    } catch (error) {
      console.error(
        "❌ Error adding contact to group:",
        getErrorMessage(error)
      );
      return c.json(
        {
          success: false,
          error: "Failed to add contact to group: " + getErrorMessage(error),
        },
        500
      );
    }
  });

  // Remove contact from group
  app.delete("/groups/:groupName/contacts/:contactId", async (c) => {
    try {
      const groupName = c.req.param("groupName");
      const contactId = c.req.param("contactId");

      console.log("👥 Removing contact from group:", { contactId, groupName });

      // Remove contact from group
      await query(
        "DELETE FROM contact_groups WHERE contact_id = $1 AND group_name = $2",
        [contactId, groupName]
      );

      console.log(
        `✅ Contact removed from group: ${contactId} -> ${groupName}`
      );

      return c.json({
        success: true,
        message: "Contact removed from group successfully",
      });
    } catch (error) {
      console.error(
        "❌ Error removing contact from group:",
        getErrorMessage(error)
      );
      return c.json(
        {
          success: false,
          error:
            "Failed to remove contact from group: " + getErrorMessage(error),
        },
        500
      );
    }
  });

  // Get Excel template
  app.get("/excel-template", async (c) => {
    try {
      console.log("📊 Generating Excel template...");

      const template = {
        headers: ["Nama", "Telepon", "Kategori", "Group"],
        sample_data: [
          ["John Doe", "628123456789", "Customer", "VIP Customer"],
          ["Jane Smith", "628234567890", "Supplier", "Jakarta Team"],
          ["Bob Wilson", "628345678901", "Partner", "Marketing Team"],
        ],
        instructions: [
          "Gunakan template ini untuk import kontak secara massal.",
          "Kolom 'Nama' dan 'Telepon' wajib diisi.",
          "Kolom 'Kategori' dan 'Group' bersifat opsional.",
          "Format nomor telepon: 628xxxxxxxxx (tanpa spasi atau tanda baca).",
          "Jika kontak sudah ada, data akan dilewati saat import.",
          "Kontak akan otomatis ditambahkan ke group yang disebutkan.",
        ],
      };

      console.log("✅ Excel template generated");

      return c.json({
        success: true,
        data: template,
        message: "Excel template generated successfully",
      });
    } catch (error) {
      console.error(
        "❌ Error generating Excel template:",
        getErrorMessage(error)
      );
      return c.json(
        {
          success: false,
          error: "Failed to generate Excel template: " + getErrorMessage(error),
        },
        500
      );
    }
  });

  return app;
};
