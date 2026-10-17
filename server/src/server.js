const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");

const app = express();

// 1. CORS middleware
const allowedOrigins = (
  process.env.CLIENT_URL ||
  "http://localhost:5173,http://127.0.0.1:5180"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
  })
);

// 2. JSON request body read karne ke liye
app.use(express.json({ limit: "1mb" }));

// 3. Health check API
app.get("/api/v1/health", (req, res) => {
  res.json({
    success: true,
    message: "Karma Store API is running",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// 4. Products API
app.use("/api/v1/products", productRoutes);

// 5. Orders API
app.use("/api/v1/orders", orderRoutes);

// 6. Unknown API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// 7. Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// 8. MongoDB connect karke server start karein
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");

    const port = process.env.PORT || 5000;

    app.listen(port, "0.0.0.0", () => {
  console.log(`Karma Store API running on port ${port}`);
});
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
