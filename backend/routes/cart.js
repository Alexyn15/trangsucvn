const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { auth } = require("../middleware/auth");

// GET /api/cart - Lấy cart của user
router.get("/", auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product"
    );

    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [], total: 0 });
      await cart.save();
    }

    res.json(cart);
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

// POST /api/cart/add - Thêm hoặc update sản phẩm vào cart
router.post("/add", auth, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    // Validate input
    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({
        message: "Invalid product ID or quantity",
      });
    }

    // Kiểm tra product tồn tại
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Kiểm tra stock
    if (product.stock < quantity) {
      return res.status(400).json({
        message: "Not enough stock available",
      });
    }

    // Tìm hoặc tạo cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // Kiểm tra sản phẩm đã có trong cart chưa
    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity nếu đã tồn tại
      cart.items[existingItemIndex].quantity = quantity;
    } else {
      // Thêm mới nếu chưa có
      cart.items.push({
        product: productId,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        quantity: quantity,
      });
    }

    await cart.save(); // Middleware sẽ tự tính total

    // Populate để trả về đầy đủ thông tin
    cart = await Cart.findById(cart._id).populate("items.product");

    res.json(cart);
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

// PUT /api/cart/update/:productId - Cập nhật số lượng
router.put("/update/:productId", auth, async (req, res) => {
  try {
    const { quantity } = req.body;
    const { productId } = req.params;

    if (!quantity || quantity < 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    if (quantity === 0) {
      // Nếu quantity = 0, xóa item
      cart.items = cart.items.filter(
        (item) => item.product.toString() !== productId
      );
    } else {
      // Update quantity
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity = quantity;
      } else {
        return res.status(404).json({ message: "Product not in cart" });
      }
    }

    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate("items.product");
    res.json(updatedCart);
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

// DELETE /api/cart/remove/:productId - Xóa sản phẩm khỏi cart
router.delete("/remove/:productId", auth, async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate("items.product");
    res.json(updatedCart);
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

// DELETE /api/cart/clear - Xóa toàn bộ cart
router.delete("/clear", auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = [];
    cart.total = 0;
    await cart.save();

    res.json({ message: "Cart cleared successfully", cart });
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;
