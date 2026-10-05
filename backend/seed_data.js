const bcrypt = require("bcryptjs");
const pool = require("./db");

async function seed() {
  console.log("Starting database population...");

  // Default password meets all validation: 8-16 chars, 1 uppercase, 1 special char
  const plainPassword = "Password123!";
  const hashedPassword = await bcrypt.hash(plainPassword, 12);

  // 1. Store Owners (Name must be 20-60 chars)
  const storeOwners = [
    {
      name: "Vikramaditya Rajesh Mehta",
      email: "vikram.mehta@storeowner.com",
      address: "Plot 42, Bandra Kurla Complex, Mumbai, Maharashtra 400051",
      role: "store_owner"
    },
    {
      name: "Priyanka Anand Deshmukh",
      email: "priyanka.deshmukh@storeowner.com",
      address: "15 Viman Nagar, Near Symbiosis, Pune, Maharashtra 411014",
      role: "store_owner"
    },
    {
      name: "Devendra Kashinath Patil",
      email: "devendra.patil@storeowner.com",
      address: "Shop 102, MG Road Commercial Hub, Nashik, Maharashtra 422001",
      role: "store_owner"
    },
    {
      name: "Ananya Raghunath Kulkarni",
      email: "ananya.kulkarni@storeowner.com",
      address: "7th Cross, Indiranagar 100ft Road, Bengaluru, Karnataka 560038",
      role: "store_owner"
    },
    {
      name: "Rohan Sureshchandra Joshi",
      email: "rohan.joshi@storeowner.com",
      address: "Tower B, Cyber City DLF Phase 2, Gurugram, Haryana 122002",
      role: "store_owner"
    }
  ];

  const ownerIds = {};

  for (const owner of storeOwners) {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [owner.email]);
    if (existing.rows.length > 0) {
      ownerIds[owner.email] = existing.rows[0].id;
      console.log(`Owner already exists: ${owner.name}`);
    } else {
      const res = await pool.query(
        `INSERT INTO users (name, email, password, address, role)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [owner.name, owner.email, hashedPassword, owner.address, owner.role]
      );
      ownerIds[owner.email] = res.rows[0].id;
      console.log(`Created Store Owner: ${owner.name} (ID: ${res.rows[0].id})`);
    }
  }

  // 2. Stores (Name must be 20-60 chars, address max 400 chars)
  const stores = [
    {
      name: "Mehta Organic Fresh Supermarket",
      email: "fresh@mehtasupermarket.com",
      address: "42 BKC Boulevard, Avenue 3, Mumbai, Maharashtra 400051",
      ownerEmail: "vikram.mehta@storeowner.com"
    },
    {
      name: "Apex Gourmet & Daily Groceries",
      email: "gourmet@apexmarket.com",
      address: "Galleria Mall, Ground Floor, Powai, Mumbai 400076",
      ownerEmail: "vikram.mehta@storeowner.com"
    },
    {
      name: "Deshmukh Lifestyle & Apparel Store",
      email: "contact@deshmukhapparel.com",
      address: "Phoenix Marketcity, Level 2, Pune, Maharashtra 411014",
      ownerEmail: "priyanka.deshmukh@storeowner.com"
    },
    {
      name: "Royal Heritage Ethnic Boutiques",
      email: "boutique@royalheritage.com",
      address: "FC Road, Heritage Arcade, Pune, Maharashtra 411004",
      ownerEmail: "priyanka.deshmukh@storeowner.com"
    },
    {
      name: "Patil Premium Electronics & Gadgets",
      email: "support@patilelectronics.com",
      address: "Tech Zone, College Road, Nashik, Maharashtra 422005",
      ownerEmail: "devendra.patil@storeowner.com"
    },
    {
      name: "Kulkarni Handcrafted Home Decor",
      email: "info@kulkarnidecor.com",
      address: "12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru 560038",
      ownerEmail: "ananya.kulkarni@storeowner.com"
    },
    {
      name: "Bloom & Blossom Florals Boutique",
      email: "orders@bloomandblossom.com",
      address: "Lavelle Road, Near UB City, Bengaluru, Karnataka 560001",
      ownerEmail: "ananya.kulkarni@storeowner.com"
    },
    {
      name: "Joshi Sports & Fitness Emporium",
      email: "sales@joshisports.com",
      address: "Sector 29 Market, Central Plaza, Gurugram, Haryana 122001",
      ownerEmail: "rohan.joshi@storeowner.com"
    },
    {
      name: "Starlight Stationary & Book Haven",
      email: "hello@starlightbooks.com",
      address: "Galleria Market, DLF Phase 4, Gurugram, Haryana 122009",
      ownerEmail: "rohan.joshi@storeowner.com"
    }
  ];

  const storeIds = [];

  for (const st of stores) {
    const ownerId = ownerIds[st.ownerEmail];
    const existing = await pool.query("SELECT id FROM stores WHERE email = $1", [st.email]);
    if (existing.rows.length > 0) {
      storeIds.push(existing.rows[0].id);
      console.log(`Store already exists: ${st.name}`);
    } else {
      const res = await pool.query(
        `INSERT INTO stores (name, email, address, owner_id)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [st.name, st.email, st.address, ownerId]
      );
      storeIds.push(res.rows[0].id);
      console.log(`Created Store: ${st.name} (ID: ${res.rows[0].id})`);
    }
  }

  // Also include store #1 if already exists
  const existingStore1 = await pool.query("SELECT id FROM stores WHERE id = 1");
  if (existingStore1.rows.length > 0 && !storeIds.includes(1)) {
    storeIds.push(1);
  }

  // 3. Normal Users (Customers, names 20-60 chars)
  const normalUsers = [
    {
      name: "Aarav Chaitanya Kulkarni",
      email: "aarav.kulkarni@example.com",
      address: "Flat 402, Sunshine Heights, Kothrud, Pune 411038"
    },
    {
      name: "Snehal Digambar Bhalerao",
      email: "snehal.bhalerao@example.com",
      address: "Plot 88, Sector 17, Vashi, Navi Mumbai 400703"
    },
    {
      name: "Tanmay Dattatray Shinde",
      email: "tanmay.shinde@example.com",
      address: "14 Shivaji Park, Dadar West, Mumbai 400028"
    },
    {
      name: "Ishaan Harishchandra Rao",
      email: "ishaan.rao@example.com",
      address: "Villa 22, Green Glen Layout, Bellandur, Bengaluru 560103"
    },
    {
      name: "Meera Chandrashekhar Nair",
      email: "meera.nair@example.com",
      address: "Apartment 9B, Prestige Towers, Residency Road, Bengaluru 560025"
    },
    {
      name: "Gaurav Bhaskar Waghmare",
      email: "gaurav.waghmare@example.com",
      address: "Bungalow 7, Gangapur Road, Anandwalli, Nashik 422013"
    },
    {
      name: "Kavita Suryakant Sawant",
      email: "kavita.sawant@example.com",
      address: "Tower 4, Golf Course Extension Road, Gurugram 122018"
    },
    {
      name: "Aditya Murlidhar Gaikwad",
      email: "aditya.gaikwad@example.com",
      address: "House 301, Sector 45, Near HUDA City Centre, Gurugram 122003"
    }
  ];

  const userIds = [];

  for (const u of normalUsers) {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [u.email]);
    if (existing.rows.length > 0) {
      userIds.push(existing.rows[0].id);
      console.log(`User already exists: ${u.name}`);
    } else {
      const res = await pool.query(
        `INSERT INTO users (name, email, password, address, role)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [u.name, u.email, hashedPassword, u.address, "normal_user"]
      );
      userIds.push(res.rows[0].id);
      console.log(`Created Normal User: ${u.name} (ID: ${res.rows[0].id})`);
    }
  }

  // 4. Submit varied ratings from customers to stores
  console.log("Submitting varied store ratings...");
  const ratingsDistribution = [
    // [userIdIndex, storeIdIndex, rating]
    [0, 0, 5], [1, 0, 5], [2, 0, 4], [3, 0, 5], // Mehta Organic: ~4.75
    [4, 1, 4], [5, 1, 4], [6, 1, 5], [7, 1, 4], // Apex Gourmet: ~4.25
    [0, 2, 5], [2, 2, 5], [4, 2, 4],            // Deshmukh Lifestyle: ~4.67
    [1, 3, 5], [3, 3, 4], [5, 3, 5],            // Royal Heritage: ~4.67
    [0, 4, 3], [2, 4, 4], [6, 4, 4], [7, 4, 5], // Patil Electronics: ~4.00
    [1, 5, 5], [4, 5, 5], [5, 5, 4],            // Kulkarni Home Decor: ~4.67
    [3, 6, 5], [7, 6, 5], [0, 6, 4],            // Bloom & Blossom: ~4.67
    [2, 7, 4], [5, 7, 3], [6, 7, 4],            // Joshi Sports: ~3.67
    [1, 8, 5], [4, 8, 5], [7, 8, 4]             // Starlight Books: ~4.67
  ];

  let addedRatings = 0;
  for (const [uIdx, sIdx, ratingVal] of ratingsDistribution) {
    const uId = userIds[uIdx];
    const sId = storeIds[sIdx];
    if (uId && sId) {
      await pool.query(
        `INSERT INTO ratings (user_id, store_id, rating)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, store_id)
         DO UPDATE SET rating = EXCLUDED.rating, updated_at = CURRENT_TIMESTAMP`,
        [uId, sId, ratingVal]
      );
      addedRatings++;
    }
  }

  console.log(`Processed ${addedRatings} ratings!`);

  // Final summary count
  const uCount = await pool.query("SELECT role, count(*) FROM users GROUP BY role");
  const sCount = await pool.query("SELECT count(*) FROM stores");
  const rCount = await pool.query("SELECT count(*) FROM ratings");

  console.log("\n================ POPULATION COMPLETED ================");
  console.log("Users summary:", uCount.rows);
  console.log("Total Stores:", sCount.rows[0].count);
  console.log("Total Ratings:", rCount.rows[0].count);
  console.log("All newly created users have password: Password123!");
  console.log("======================================================");

  await pool.end();
}

seed().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
