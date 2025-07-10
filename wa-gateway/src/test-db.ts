import { query } from "./db/connection";

async function testConnection() {
  try {
    console.log("Testing database connection...");

    // Test basic connection
    const timeResult = await query("SELECT NOW() as current_time");
    console.log("✅ Database time:", timeResult.rows[0]);

    // Test contacts table
    const contactsResult = await query(
      "SELECT COUNT(*) as count FROM contacts"
    );
    console.log("✅ Total contacts:", contactsResult.rows[0].count);

    // Test contact_groups table
    const groupsResult = await query(
      "SELECT COUNT(*) as count FROM contact_groups"
    );
    console.log("✅ Total contact groups:", groupsResult.rows[0].count);

    // Test contacts with groups view
    const viewResult = await query(
      "SELECT * FROM contacts_with_groups LIMIT 3"
    );
    console.log("✅ Sample contacts with groups:", viewResult.rows);

    console.log("🎉 All database tests passed!");
  } catch (error) {
    console.error("❌ Database test failed:", error);
  }
}

testConnection();
