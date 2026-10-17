
const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");

const router = express.Router();

router.post("/", async (req, res) => {
  const decremented = [];

  // Zaroorat padne par stock ko wapas restore karein.
  async function restoreStock() {
    for (const item of decremented) {
      await Product.updateOne(
        { _id: item.id },
        { $inc: { stock: item.quantity } }
      );
    }
    decremented.length = 0;
  }

  try {
    const {
      customerName,
      phone,
      shippingAddress,
      city,
      state,
      pincode,
      items,
    } = req.body;

    if (
      !customerName?.trim() ||
      !phone ||
      !shippingAddress?.trim() ||
      !city?.trim() ||
      !state?.trim() ||
      !pincode
    ) {
      return res.status(400).json({
        success: false,
        message: "Customer ki saari details bharna zaroori hai.",
      });
    }

    if (!/^[6-9]\d{9}$/.test(String(phone).trim())) {
      return res.status(400).json({
        success: false,
        message: "Sahi 10-digit Indian mobile number enter karein.",
      });
    }

    if (!/^\d{6}$/.test(String(pincode).trim())) {
      return res.status(400).json({
        success: false,
        message: "Sahi 6-digit PIN code enter karein.",
      });
    }

    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Cart mein valid products add karein.",
      });
    }

    // Customer se aayi hui price par bharosa na karein.
    // Price aur stock hamesha MongoDB se liye jayenge.
    const stockTotals = new Map();

    for (const item of items) {
      if (
        !mongoose.isValidObjectId(item.productId) ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        typeof item.size !== "string" ||
        !item.size.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Cart mein kisi product ki details galat hain.",
        });
      }

      const id = String(item.productId);
      stockTotals.set(
        id,
        (stockTotals.get(id) || 0) + item.quantity
      );
    }

    const productIds = [...stockTotals.keys()];
    const products = await Product.find({
      _id: { $in: productIds },
      active: true,
    });

    const productMap = new Map(
      products.map((product) => [String(product._id), product])
    );

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: "Koi product available nahi hai. Cart refresh karein.",
      });
    }

    // Quantity aur selected size validate karein.
    for (const [id, quantity] of stockTotals) {
      const product = productMap.get(id);

      if (product.stock < quantity) {
        return res.status(409).json({
          success: false,
          message: `${product.name} ka required stock available nahi hai.`,
        });
      }
    }

    const orderItems = [];

    for (const item of items) {
      const product = productMap.get(String(item.productId));
      const size = item.size.trim();

      if (!product.sizes.includes(size)) {
        return res.status(400).json({
          success: false,
          message: `${product.name} ke liye selected size available nahi hai.`,
        });
      }

      orderItems.push({
        productId: product._id,
        name: product.name,
        image: product.image,
        price: product.price,
        size,
        quantity: item.quantity,
      });
    }

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // ₹1,999 ya usse zyada par free shipping.
    const shippingFee = subtotal >= 1999 ? 0 : 99;
    const total = subtotal + shippingFee;

    // Stock ko atomically per product update karein.
    for (const [id, quantity] of stockTotals) {
      const result = await Product.updateOne(
        {
          _id: id,
          active: true,
          stock: { $gte: quantity },
        },
        { $inc: { stock: -quantity } }
      );

      if (result.modifiedCount !== 1) {
        await restoreStock();

        return res.status(409).json({
          success: false,
          message: "Stock badal gaya hai. Cart dobara check karein.",
        });
      }

      decremented.push({ id, quantity });
    }

    const order = await Order.create({
      customer: {
        name: customerName.trim(),
        phone: String(phone).trim(),
        address: shippingAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: String(pincode).trim(),
      },
      items: orderItems,
      subtotal,
      shippingFee,
      total,
      paymentMethod: "COD",
      status: "Pending",
    });

    res.status(201).json({
      success: true,
      message: "Order successfully place ho gaya!",
      order: {
        id: order._id,
        status: order.status,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        total: order.total,
      },
    });
  } catch (error) {
    try {
      await restoreStock();
    } catch (rollbackError) {
      console.error("Stock restore error:", rollbackError.message);
    }

    console.error("Order creation error:", error.message);

    res.status(500).json({
      success: false,
      message: "Order save nahi ho saka. Dobara try karein.",
    });
  }
});

function requireAdmin(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const suppliedPassword = req.get("x-admin-password");

  if (!adminPassword) {
    return res.status(500).json({
      success: false,
      message: "Admin password .env mein set nahi hai.",
    });
  }

  if (!suppliedPassword || suppliedPassword !== adminPassword) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Admin password galat hai.",
    });
  }

  next();
}

// Latest orders dekhne ki protected API
router.get("/", requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Orders fetch error:", error.message);

    res.status(500).json({
      success: false,
      message: "Orders load nahi ho sake.",
    });
  }
});

// Order status update karne ki protected API
router.patch("/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status.",
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order nahi mila.",
      });
    }

    res.json({
      success: true,
      message: "Order status update ho gaya.",
      order,
    });
  } catch (error) {
    console.error("Order status update error:", error.message);

    res.status(500).json({
      success: false,
      message: "Order status update nahi hua.",
    });
  }
});

module.exports = router;
