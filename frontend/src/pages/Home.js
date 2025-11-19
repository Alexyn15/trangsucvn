import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { CartContext } from "../context/CartContext";

const Home = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [search, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/categories");
      setCategories(res.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      let url = `http://localhost:5000/api/products?search=${search}`;
      if (selectedCategory) {
        url += `&category=${selectedCategory}`;
      }
      const res = await axios.get(url);
      setProducts(res.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    alert("Đã thêm vào giỏ hàng!");
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  return (
    <div className="home">
      <div className="hero">
        <h1>Chào mừng đến với Jewelry Shop</h1>
        <p>Trang sức cao cấp - Thiết kế tinh tế</p>
      </div>

      <div className="search-section">
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
              >
                Thêm vào giỏ
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
