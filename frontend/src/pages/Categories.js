import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "../components/category.css";

/**
 * Trang hiển thị danh mục dạng grid (mô phỏng ảnh 2)
 * - URL: /categories
 * - Có thể click vào category để show sản phẩm theo category (nếu bạn có route /products?category=...)
 */
export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchCategories() {
      try {
        setLoading(true);
        const res = await axios.get("http://localhost:5000/api/categories");
        if (mounted) {
          // Backend trả về productCount (theo routes/categories.js)
          setCategories(res.data || []);
        }
      } catch (err) {
        console.error("Error fetching categories (page):", err);
        if (mounted) setError("Không thể tải danh mục");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchCategories();
    return () => (mounted = false);
  }, []);

  if (loading)
    return <div className="categories-page">Đang tải danh mục...</div>;
  if (error) return <div className="categories-page error">{error}</div>;

  return (
    <div className="categories-page container">
      <h2 className="categories-title">Category</h2>
      <div className="categories-grid">
        {categories.map((cat) => (
          <Link
            to={`/products?category=${encodeURIComponent(cat.name)}`}
            key={cat._id}
            className="category-card"
            title={cat.name}
          >
            {cat.imageUrl ? (
              <img
                src={cat.imageUrl}
                alt={cat.name}
                className="category-card-icon"
              />
            ) : (
              <div className="category-card-icon-placeholder" />
            )}
            <div className="category-card-name">{cat.name}</div>
            <div className="category-card-count">
              {cat.productCount ?? 0} items
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
