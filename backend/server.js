require("dotenv").config(); // Load .env
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const categoriesRoutes = require("./routes/categories"); // THÊM DÒNG NÀY: Import categories routes
const AdminOrders = require("./routes/admin");
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log(" MongoDB connected"))
  .catch((err) => console.error(" MongoDB connection error:", err));

// Routes - THÊM MOUNT CATEGORIES VÀO ĐÂY
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/categories", categoriesRoutes); // THÊM DÒNG NÀY: Mount categories route

app.get("/", (req, res) => {
  res.json({ message: "Jewelry Store API" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});
