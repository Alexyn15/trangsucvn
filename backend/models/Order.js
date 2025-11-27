const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      name: String,
      price: Number,
      quantity: Number,
      imageUrl: String,
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  shippingAddress: {
    name: String,
    phone: String,
    address: String,
  },
  paymentMethod: {
    type: String,
    default: "VNPay",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },
  orderStatus: {
    type: String,
    enum: [
      "created",
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ],
    default: "created",
  },
  vnp_TxnRef: {
    // <-- thêm dòng này
    type: String,
    required: true,
    unique: true,
  },
  vnp_ResponseCode: String, // optional: lưu response code từ VNPay
  vnp_TransactionNo: String, // optional: lưu transactionNo từ VNPay
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Order", orderSchema);
