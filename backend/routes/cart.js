const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart"); // Model từ trước
const auth = require("../middleware/auth"); // Middleware verify token

// GET /api/cart - Lấy cart user
router.get("/", auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user_id: req.user.id });
    if (!cart) {
      cart = new Cart({ user_id: req.user.id });
      await cart.save();
    }
    res.json(cart); // Trả { items: [...], total: ... }
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
});

// POST /api/cart/add - Thêm/update item
router.post("/add", auth, async (req, res) => {
  const { productId, quantity } = req.body;
  try {
    let cart = await Cart.findOne({ user_id: req.user.id });
    if (!cart) {
      cart = new Cart({ user_id: req.user.id });
    }

    const existingItem = cart.items.find(
      (item) => item.product_id.toString() === productId
    );
    if (existingItem) {
      existingItem.quantity = quantity;
    } else {
      // Fetch product để lấy price/name (giả sử có Product model)
      const Product = require("../models/Product");
      const product = await Product.findById(productId);
      if (!product)
        return res.status(404).json({ error: "Sản phẩm không tồn tại" });

      cart.items.push({
        product_id: productId,
        quantity,
        price: product.price,
        name: product.name,
      });
    }

    cart.total = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    cart.updated_at = new Date();
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: "Lỗi thêm cart" });
  }
});

// DELETE /api/cart/remove/:productId
router.delete("/remove/:productId", auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user_id: req.user.id });
    if (cart) {
      cart.items = cart.items.filter(
        (item) => item.product_id.toString() !== req.params.productId
      );
      cart.total = cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      cart.updated_at = new Date();
      await cart.save();
    }
    res.json({ message: "Xóa thành công" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi xóa cart" });
  }
});

// PUT /api/cart/clear
router.put("/clear", auth, async (req, res) => {
  try {
    await Cart.findOneAndUpdate(
      { user_id: req.user.id },
      { items: [], total: 0, updated_at: new Date() }
    );
    res.json({ message: "Xóa giỏ thành công" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi clear cart" });
  }
});

module.exports = router;
