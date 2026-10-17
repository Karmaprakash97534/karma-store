
const express = require("express");
const Product = require("../models/Product");

const router = express.Router();

// GET: Saare active products
router.get("/", async (req, res, next) => {
  try {
    const products = await Product.find({ active: true })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
});

// GET: Ek product ID se
router.get("/:id", async (req, res, next) => {
  try {
    if (!/^[a-fA-F0-9]{24}$/.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      active: true,
    }).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
