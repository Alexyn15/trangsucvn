const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const { auth } = require("../middleware/auth");
const crypto = require("crypto");

// Create order and VNPay payment URL
router.post("/", auth, async (req, res) => {
  try {
    const { items, shippingAddress, totalAmount } = req.body;

    const order = new Order({
      user: req.user._id,
      items,
      totalAmount,
      shippingAddress,
    });

    await order.save();

    // Generate VNPay URL
    const vnpUrl = generateVNPayUrl(order);

    res.status(201).json({
      orderId: order._id,
      paymentUrl: vnpUrl,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user orders
router.get("/my-orders", auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("items.product");

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// VNPay return handler
router.get("/vnpay-return", async (req, res) => {
  try {
    const vnpParams = req.query;

    // In production, verify checksum here
    if (vnpParams.vnp_ResponseCode === "00") {
      // Payment successful
      const orderId = vnpParams.vnp_TxnRef;
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "paid",
        orderStatus: "processing",
      });
    }

    res.redirect(
      `${process.env.VNPAY_RETURN_URL}?status=${vnpParams.vnp_ResponseCode}`
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Helper function to generate VNPay URL
function generateVNPayUrl(order) {
  const vnpUrl = process.env.VNPAY_URL;
  const returnUrl = `http://localhost:5000/api/orders/vnpay-return`;
  const tmnCode = process.env.VNPAY_TMN_CODE;
  const secretKey = process.env.VNPAY_HASH_SECRET;

  const createDate = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const orderId = order._id.toString();
  const amount = order.totalAmount * 100; // VNPay uses VND * 100

  let vnpParams = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Amount: amount,
    vnp_CreateDate: createDate,
    vnp_CurrCode: "VND",
    vnp_IpAddr: "127.0.0.1",
    vnp_Locale: "vn",
    vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
    vnp_OrderType: "other",
    vnp_ReturnUrl: returnUrl,
    vnp_TxnRef: orderId,
  };

  // Sort params
  vnpParams = sortObject(vnpParams);

  const signData = new URLSearchParams(vnpParams).toString();
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
  vnpParams.vnp_SecureHash = signed;

  return vnpUrl + "?" + new URLSearchParams(vnpParams).toString();
}

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  keys.forEach((key) => {
    sorted[key] = obj[key];
  });
  return sorted;
}

module.exports = router;
