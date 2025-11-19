import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./category.css";

/**
 * Sidebar danh mục (được import trong pages/Home.js)
 * Lưu ý: backend phải có route GET /api/categories (http://localhost:5000/api/categories)
 */
export default function CategorySidebar() {
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
          setCategories(res.data || []);
        }
      } catch (err) {
        console.error("Error fetching categories (sidebar):", err);
        if (mounted) setError("Không thể tải danh mục");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchCategories();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading)
    return <div className="category-sidebar">Đang tải danh mục...</div>;
  if (error) return <div className="category-sidebar error">{error}</div>;

  return (
    <aside className="category-sidebar">
      <h3 className="category-sidebar-title">Category</h3>
      <ul className="category-list-vertical">
        {categories.map((cat) => (
          <li key={cat._id} className="category-item-vertical">
            <Link
              to={`/products?category=${encodeURIComponent(cat.name)}`}
              className="category-link-vertical"
            >
              {cat.imageUrl ? (
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="category-icon-vertical"
                />
              ) : (
                <div className="category-icon-placeholder-vertical" />
              )}
              <div className="category-meta-vertical">
                <span className="category-name-vertical">{cat.name}</span>
                <span className="category-count-vertical">
                  {typeof cat.productCount !== "undefined"
                    ? `${cat.productCount} items`
                    : ""}
                </span>
              </div>
            </Link>
          </li>
        ))}
        <li className="category-item-vertical view-all">
          <Link to="/categories" className="category-link-vertical">
            Xem tất cả danh mục →
          </Link>
        </li>
      </ul>
    </aside>
  );
}
