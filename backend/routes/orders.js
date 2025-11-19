/**
 * backend/routes/orders.js
 *
 *
 *
 * Endpoints:
 * - POST   /api/orders         -> Tạo đơn hàng và trả về URL thanh toán VNPay
 * - GET    /api/orders/my-orders -> Lấy danh sách đơn hàng của user hiện tại
 * - GET    /api/orders/vnpay-return -> VNPay redirect (callback) sau thanh toán, kiểm tra chữ ký và cập nhật trạng thái đơn
 *
 */

const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const { auth } = require("../middleware/auth");
const crypto = require("crypto");

/**
 * Các hàm trợ giúp nội bộ để xử lý chữ ký VNPay.
 * - buildVnpSignData: dựng chuỗi ký (signData) từ tham số (loại bỏ vnp_SecureHash/vnp_SecureHashType).
 * - computeVnpHash: tính HMAC-SHA512 từ signData và secret key.
 * - verifyVnpSignature: xác thực chữ ký nhận từ VNPay.
 *
 * Tất cả đặt trong file này để bạn dán đè dễ dàng (theo yêu cầu không tách file).
 */

/**
 * buildVnpSignData(params)
 * - Tham số: params: object chứa các tham số VNPay
 * - Trả về: chuỗi signData dưới dạng "key1=val1&key2=val2..." theo thứ tự key ASCII tăng dần.
 * - Lưu ý: encodeURIComponent được áp dụng cho value để đảm bảo encoding nhất quán.
 */
function buildVnpSignData(params) {
  const data = { ...params };
  delete data.vnp_SecureHash;
  delete data.vnp_SecureHashType;

  const sortedKeys = Object.keys(data).sort();
  const parts = sortedKeys.map((k) => {
    // Nếu value undefined/null thì chuyển thành chuỗi rỗng để tránh "undefined"
    const value =
      typeof data[k] === "undefined" || data[k] === null ? "" : data[k];
    return `${k}=${encodeURIComponent(value)}`;
  });
  return parts.join("&");
}

/**
 * computeVnpHash(signData, secretKey)
 * - Tính HMAC-SHA512 hex digest từ signData dùng secretKey.
 */
function computeVnpHash(signData, secretKey) {
  return crypto
    .createHmac("sha512", secretKey)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");
}

/**
 * verifyVnpSignature(params, secretKey)
 * - Kiểm tra chữ ký VNPay trả về.
 * - Trả về object chi tiết để debug: { ok, signData, computed, incomingHash, reason }
 */
function verifyVnpSignature(params, secretKey) {
  const incomingHash = params.vnp_SecureHash || "";
  if (!incomingHash) {
    return {
      ok: false,
      reason: "no_incoming_hash",
      incomingHash: "",
      computed: "",
    };
  }
  const signData = buildVnpSignData(params);
  const computed = computeVnpHash(signData, secretKey);
  const ok = computed === incomingHash;
  return {
    ok,
    signData,
    computed,
    incomingHash,
    reason: ok ? "" : "hash_mismatch",
  };
}

/**
 * getVnpSecret()
 * - Lấy secret từ process.env và loại bỏ quote thừa + trim,
 *   phòng trường hợp người cấu hình .env có thêm dấu ngoặc kép vô tình.
 */
function getVnpSecret() {
  const raw = process.env.VNPAY_HASH_SECRET || "";
  // loại bỏ dấu " hoặc ' nếu có và trim khoảng trắng
  return raw
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "")
    .trim();
}

/**
 * POST /api/orders
 * - Yêu cầu: user phải auth (middleware auth)
 * - Body: { items: [{product, name, price, quantity, imageUrl}], shippingAddress, totalAmount }
 * - Tạo record Order, sau đó sinh URL thanh toán VNPay và trả về cho frontend.
 */
router.post("/", auth, async (req, res) => {
  try {
    const { items, shippingAddress, totalAmount } = req.body;

    // Validate cơ bản
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items required" });
    }
    if (
      typeof totalAmount !== "number" ||
      Number.isNaN(totalAmount) ||
      totalAmount <= 0
    ) {
      return res.status(400).json({
        message: "totalAmount required and must be a positive number",
      });
    }

    // Tạo đơn hàng trong DB (chưa tính trạng thái thanh toán)
    const order = new Order({
      user: req.user._id,
      items,
      totalAmount,
      shippingAddress,
    });

    await order.save();

    // Sinh URL VNPay
    const vnpUrl = generateVNPayUrl(order);

    return res.status(201).json({
      orderId: order._id,
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
 * GET /api/orders/my-orders
 * - Trả về danh sách đơn hàng của user hiện tại (đã authenticate)
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
 * GET /api/orders/vnpay-return
 * - VNPay redirect về endpoint này sau khi người dùng thanh toán.
 * - Chúng ta cần:
 *   1) Verify chữ ký vnp_SecureHash để đảm bảo request là hợp lệ từ VNPay.
 *   2) Nếu hợp lệ và vnp_ResponseCode === "00" => cập nhật order.paymentStatus = 'paid'.
 *   3) Redirect người dùng về frontend (VNPAY_RETURN_URL) cùng status.
 *
 * Nếu chữ ký không hợp lệ, redirect về frontend với status=99 và message=sai_chu_ky (dễ debug).
 */
router.get("/vnpay-return", async (req, res) => {
  try {
    const vnpParams = req.query || {};
    const secretKey = getVnpSecret();

    // Verify chữ ký
    const { ok, signData, computed, incomingHash, reason } = verifyVnpSignature(
      vnpParams,
      secretKey
    );
    if (!ok) {
      // Log đầy đủ để debug: bạn sẽ so sánh computed vs incomingHash và signData
      console.warn("[VNPAY] signature mismatch", {
        reason,
        incomingHash,
        computed,
        signData,
        params: vnpParams,
      });

      // Redirect về frontend và báo lỗi chữ ký
      const returnUrl = (
        process.env.VNPAY_RETURN_URL || "http://localhost:3000/payment-result"
      ).replace(/\?.*$/, "");
      return res.redirect(`${returnUrl}?status=99&message=sai_chu_ky`);
    }

    // Nếu chữ ký hợp lệ -> xử lý tiếp theo theo vnp_ResponseCode
    const responseCode = vnpParams.vnp_ResponseCode;
    if (responseCode === "00") {
      // Thanh toán thành công -> cập nhật order
      const orderId = vnpParams.vnp_TxnRef;
      try {
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: "paid",
          orderStatus: "processing",
        });
      } catch (err) {
        console.error("[VNPAY] update order status error:", err);
      }
    } else {
      // Thanh toán thất bại hoặc trạng thái khác -> bạn có thể cập nhật order.paymentStatus = 'failed' nếu muốn
    }

    // Redirect về frontend kèm status trả về từ VNPay
    const returnUrl = (
      process.env.VNPAY_RETURN_URL || "http://localhost:3000/payment-result"
    ).replace(/\?.*$/, "");
    return res.redirect(
      `${returnUrl}?status=${encodeURIComponent(responseCode)}`
    );
  } catch (error) {
    console.error("[VNPAY] return handler error:", error);
    return res.status(500).send("Server error");
  }
});

/**
 * generateVNPayUrl(order)
 * - Xây dựng tham số VNPay, tính sign (vnp_SecureHash) và trả về URL đầy đủ để redirect người dùng tới VNPay.
 * - Lưu ý: VNPay yêu cầu amount tính theo "VND * 100" (ví dụ 10000 đồng -> 10000 * 100 = 1000000).
 * - Hàm này cũng log signData và secureHash để bạn tiện debug (xóa log khi deploy production).
 */
function generateVNPayUrl(order) {
  const vnpUrlBase =
    process.env.VNPAY_URL ||
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  const returnUrl =
    process.env.VNPAY_RETURN_URL || "http://localhost:3000/payment-result";
  const tmnCode = (process.env.VNPAY_TMN_CODE || "")
    .replace(/^"+|"+$/g, "")
    .trim();
  const secretKey = getVnpSecret();

  const createDate = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const orderId = order._id.toString();
  // VNPay muốn amount là số nguyên VND * 100
  const amount = Math.round(order.totalAmount) * 100;

  const vnpParams = {
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

  // Dựng signData và tính HMAC
  const signData = buildVnpSignData(vnpParams);
  const secureHash = computeVnpHash(signData, secretKey);
  vnpParams.vnp_SecureHash = secureHash;

  // Tạo query string (encode cả key và value)
  const queryString = Object.keys(vnpParams)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(vnpParams[k])}`)
    .join("&");

  // Log thông tin hỗ trợ debug (bạn nên xóa hoặc giảm log level khi production)
  console.log("[VNPAY] create signData:", signData);
  console.log("[VNPAY] computed secure hash:", secureHash);
  console.log("[VNPAY] vnp URL:", `${vnpUrlBase}?${queryString}`);

  return `${vnpUrlBase}?${queryString}`;
}

module.exports = router;
