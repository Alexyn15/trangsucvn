import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { CartContext } from "../context/CartContext";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/products/${id}`);
      setProduct(res.data);
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    addToCart(product);
    alert("Đã thêm vào giỏ hàng!");
  };

  if (loading) return <div className="loading">Đang tải...</div>;
  if (!product) return <div>Không tìm thấy sản phẩm</div>;

  return (
    <div className="product-detail">
      <button onClick={() => navigate(-1)} className="btn-back">
        ← Quay lại
      </button>

      <div className="detail-container">
        <div className="detail-image">
          <img src={product.imageUrl} alt={product.name} />
        </div>

        <div className="detail-info">
          <h1>{product.name}</h1>
          <p className="detail-category">{product.category}</p>
          <h2 className="detail-price">
            {product.price.toLocaleString("vi-VN")} đ
          </h2>

          <div className="detail-description">
            <h3>Mô tả sản phẩm</h3>
            <p>{product.description}</p>
          </div>

          <div className="detail-stock">
            <p>Còn hàng: {product.stock} sản phẩm</p>
          </div>

          <button
            onClick={handleAddToCart}
            className="btn btn-primary btn-large"
            disabled={product.stock === 0}
          >
            {product.stock > 0 ? "Thêm vào giỏ hàng" : "Hết hàng"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
