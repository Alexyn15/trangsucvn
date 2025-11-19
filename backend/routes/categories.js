const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const Product = require("../models/Product");

// GET /api/categories - Lấy tất cả categories với số lượng sản phẩm
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    // Đếm số lượng sản phẩm cho mỗi category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({
          category: category.name,
        });

        return {
          _id: category._id,
          name: category.name,
          description: category.description,
          imageUrl: category.imageUrl,
          productCount: productCount,
          createdAt: category.createdAt,
        };
      })
    );

    res.json(categoriesWithCount);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

// GET /api/categories/:id - Lấy single category
router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Đếm số lượng sản phẩm
    const productCount = await Product.countDocuments({
      category: category.name,
    });

    res.json({
      _id: category._id,
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl,
      productCount: productCount,
      createdAt: category.createdAt,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;
