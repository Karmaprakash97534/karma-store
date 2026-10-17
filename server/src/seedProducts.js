const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Product = require("./models/Product");

const products = [
  {
    name: "Classic Black T-Shirt",
    slug: "classic-black-t-shirt",
    category: "T-Shirts",
    description: "Comfortable black casual T-shirt.",
    price: 499,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85",
    sizes: ["S", "M", "L", "XL"],
    stock: 25,
    active: true,
  },
  {
    name: "Premium White Shirt",
    slug: "premium-white-shirt",
    category: "Shirts",
    description: "Stylish white shirt for everyday wear.",
    price: 899,
    image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=85",
    sizes: ["S", "M", "L", "XL"],
    stock: 15,
    active: true,
  },
  {
    name: "Blue Denim Jeans",
    slug: "blue-denim-jeans",
    category: "Jeans",
    description: "Modern blue denim jeans.",
    price: 1299,
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=85",
    sizes: ["30", "32", "34", "36"],
    stock: 20,
    active: true,
  },
  {
    name: "Casual Grey Hoodie",
    slug: "casual-grey-hoodie",
    category: "Hoodies",
    description: "Soft grey hoodie for a casual look.",
    price: 1499,
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85",
    sizes: ["S", "M", "L", "XL"],
    stock: 12,
    active: true,
  },
];

async function seedProducts() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI missing. Configure server/.env first.");
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const operations = products.map((product) => ({
      updateOne: {
        filter: { slug: product.slug },
        update: { $set: product },
        upsert: true,
      },
    }));

    const result = await Product.bulkWrite(operations);
    console.log(
      `Demo catalogue synced. Added: ${result.upsertedCount}; updated: ${result.modifiedCount}.`
    );
  } catch (error) {
    console.error("Error syncing demo products:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedProducts();
