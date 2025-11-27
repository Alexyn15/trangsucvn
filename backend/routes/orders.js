/**
 * backend/routes/orders.js
 *
 * Endpoints:
 * - POST   /api/orders           -> Tạo đơn hàng và trả về URL thanh toán VNPay
 * - GET    /api/orders/my-orders -> Lấy danh sách đơn hàng của user hiện tại
 * - GET    /api/orders/vnpay_return -> VNPay redirect (callback) sau thanh toán
 * - PUT    /api/orders/pay/:txnRef -> Cập nhật trạng thái thanh toán theo VNPay txnRef
 */

const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const { auth } = require("../middleware/auth");
const crypto = require("crypto");
const config = require("config");
const qs = require("qs");

/**
 * sortAndEncodeObject(obj)
 */
function sortAndEncodeObject(obj) {
  const keys = Object.keys(obj || {})
    .filter(
      (k) => obj[k] !== undefined && obj[k] !== null && String(obj[k]) !== ""
    )
    .sort();

  const out = {};
  for (const k of keys) {
    out[k] = encodeURIComponent(String(obj[k])).replace(/%20/g, "+");
  }
  return out;
}

/**
 * formatDate(date) -> yyyyMMddHHmmss
 */
function formatDate(date) {
  const d = new Date(date);
  const YYYY = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const DD = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${YYYY}${MM}${DD}${hh}${mm}${ss}`;
}

/**
 * POST /api/orders -> Tạo đơn hàng
 */
router.post("/", auth, async (req, res) => {
  try {
    const { items, shippingAddress, totalAmount } = req.body;

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "items required" });
    if (typeof totalAmount !== "number" || totalAmount <= 0)
      return res.status(400).json({ message: "totalAmount must be positive" });

    const order = new Order({
      user: req.user._id,
      items,
      totalAmount,
      shippingAddress,
      paymentStatus: "pending",
      orderStatus: "created",
    });

    const txnRef = `${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`;
    order.vnp_TxnRef = txnRef;

    await order.save();

    const vnpUrl = await generateVNPayUrl(order, req);

    return res.status(201).json({
      orderId: order._id,
      vnp_TxnRef: txnRef,
      paymentUrl: vnpUrl,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

/**
 * GET /api/orders/my-orders -> Lấy đơn hàng user
 */
router.get("/my-orders", auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("items.product");
    return res.json(orders);
  } catch (error) {
    console.error("Fetch my orders error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

/**
 * GET /api/orders/vnpay_return -> VNPay redirect
 */
router.get("/vnpay_return", async (req, res) => {
  try {
    const vnp_Params = { ...req.query };
    const incomingSecureHash = vnp_Params["vnp_SecureHash"];

    const tmnCode = config.get("vnp_TmnCode");
    const secretKey = config.get("vnp_HashSecret");
    const returnUrl =
      config.get("vnp_ReturnUrl") || "http://localhost:3000/payment-result";

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    const sortedParams = sortAndEncodeObject(vnp_Params);
    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const computedHash = hmac
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    if (incomingSecureHash !== computedHash) {
      console.warn("[VNPAY] Invalid signature");
      return res.redirect(`${returnUrl}?status=97&message=invalid_signature`);
    }

    const txnRef = vnp_Params["vnp_TxnRef"];
    const rspCode = vnp_Params["vnp_ResponseCode"];
    const order = await Order.findOne({ vnp_TxnRef: txnRef });
    if (!order)
      return res.redirect(`${returnUrl}?status=01&message=order_not_found`);

    if (rspCode === "00") {
      order.paymentStatus = "paid";
      order.orderStatus = "processing";
    } else {
      order.paymentStatus = "failed";
    }

    // Lưu thêm thông tin VNPay
    order.vnp_ResponseCode = rspCode;
    order.vnp_TransactionNo = vnp_Params["vnp_TransactionNo"];
    order.vnp_BankCode = vnp_Params["vnp_BankCode"];
    order.vnp_PayDate = vnp_Params["vnp_PayDate"];

    await order.save();
    return res.redirect(`${returnUrl}?status=${rspCode}`);
  } catch (error) {
    console.error("[VNPAY] Return handler error:", error);
    return res.status(500).send("Server error");
  }
});

/**
 * PUT /api/orders/pay/:txnRef -> Cập nhật trạng thái thanh toán
 */
router.put("/pay/:txnRef", auth, async (req, res) => {
  try {
    const { txnRef } = req.params;
    const order = await Order.findOne({ vnp_TxnRef: txnRef });
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.paymentStatus = "paid";
    if (order.orderStatus === "created" || order.orderStatus === "pending") {
      order.orderStatus = "processing";
    }

    await order.save();
    return res.json({ message: "Payment status updated", order });
  } catch (error) {
    console.error("Update payment status error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

/**
 * generateVNPayUrl(order, req) -> Tạo URL thanh toán VNPay
 */
async function generateVNPayUrl(order, req) {
  process.env.TZ = "Asia/Ho_Chi_Minh";

  const createDate = formatDate(new Date());
  const ipAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  const tmnCode = config.get("vnp_TmnCode");
  const secretKey = config.get("vnp_HashSecret");
  const vnpUrl = config.get("vnp_Url");
  const returnUrl = config.get("vnp_ReturnUrl");

  if (!tmnCode || !secretKey || !vnpUrl || !returnUrl) {
    throw new Error("VNPay config missing");
  }

  const amount = Math.round(Number(order.totalAmount));
  if (!amount || amount <= 0) throw new Error("Invalid order amount");

  const vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Locale: "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: order.vnp_TxnRef,
    vnp_OrderInfo: `Thanh toan don hang:${order.vnp_TxnRef}`,
    vnp_OrderType: "other",
    vnp_Amount: amount * 100,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  const sortedParams = sortAndEncodeObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac("sha512", secretKey);
  sortedParams["vnp_SecureHash"] = hmac
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");

  return `${vnpUrl}?${qs.stringify(sortedParams, { encode: false })}`;
}

module.exports = router;
