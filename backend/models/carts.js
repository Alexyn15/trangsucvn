const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  }, // ID thật từ collection products
  quantity: { type: Number, default: 1, min: 1 },
  price: { type: Number, required: true }, // Giá lúc thêm vào cart
  name: { type: String }, // Optional: Lưu tên để hiển thị nhanh nếu cần
});

const cartSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [cartItemSchema], // Mảng items
  total: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Cart", cartSchema);
