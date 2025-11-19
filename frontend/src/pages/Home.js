import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { CartContext } from "../context/CartContext";
import CategorySidebar from "../components/CategorySidebar";
import "../components/category.css";
import "./home.css"; // optional: page-specific styles (create if you want)

const Home = () => {
  const [products, setProducts] = useState([]);
  const [categoriesForFilter, setCategoriesForFilter] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const { addToCart } = useContext(CartContext);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/categories");
      setCategoriesForFilter(res.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      let url = `http://localhost:5000/api/products?search=${encodeURIComponent(
        search
      )}`;
      if (selectedCategory) {
        url += `&category=${encodeURIComponent(selectedCategory)}`;
      }
      const res = await axios.get(url);
      setProducts(res.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product) => {
    try {
      setAddingId(product._id);
      await addToCart(product, 1);
      alert("Đã thêm vào giỏ hàng!");
    } catch (err) {
      console.error("Add to cart failed:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Không thể thêm vào giỏ hàng");
    } finally {
      setAddingId(null);
    }
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  return (
    <div className="home container" style={{ display: "flex", gap: 20 }}>
      {/* Sidebar left */}
      <div style={{ width: 250 }}>
        <CategorySidebar />
      </div>

      {/* Main content */}
      <div style={{ flex: 1 }}>
        <div className="hero">
          <h1>Chào mừng đến với Jewelry Shop</h1>
          <p>Trang sức cao cấp - Thiết kế tinh tế</p>
        </div>

        <div className="search-section" style={{ margin: "16px 0" }}>
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="products-grid">
          {products.map((product) => (
            <div key={product._id} className="product-card">
              <Link to={`/product/${product._id}`}>
                <img src={product.imageUrl} alt={product.name} />
              </Link>
              <div className="product-info">
                <h3>{product.name}</h3>
                <p className="product-category">{product.category}</p>
                <p className="product-price">
                  {product.price.toLocaleString("vi-VN")} đ
                </p>
                <button
                  onClick={() => handleAddToCart(product)}
                  className="btn btn-primary"
                  disabled={addingId === product._id || product.stock === 0}
                >
                  {addingId === product._id ? "Đang thêm..." : "Thêm vào giỏ"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
