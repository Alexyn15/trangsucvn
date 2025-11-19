import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";

const Cart = () => {
  const { cart, updateQuantity, removeFromCart, getTotal, clearCart } =
    useContext(CartContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });

  const handleCheckout = async () => {
    if (!user) {
      alert("Vui lòng đăng nhập để thanh toán");
      navigate("/login");
      return;
    }

    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
      alert("Vui lòng điền đầy đủ thông tin giao hàng");
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        items: cart.map((item) => ({
          product: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
        })),
        shippingAddress: shippingInfo,
        totalAmount: getTotal(),
      };

      const res = await axios.post(
        "http://localhost:5000/api/orders",
        orderData
      );

      // Redirect to VNPay
      window.location.href = res.data.paymentUrl;
      clearCart();
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Có lỗi xảy ra khi thanh toán");
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="empty-cart">
        <h2>Giỏ hàng trống</h2>
        <button onClick={() => navigate("/")} className="btn btn-primary">
          Tiếp tục mua sắm
        </button>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>Giỏ hàng của bạn</h1>

      <div className="cart-container">
        <div className="cart-items">
          {cart.map((item) => (
            <div key={item._id} className="cart-item">
              <img src={item.imageUrl} alt={item.name} />
              <div className="cart-item-info">
                <h3>{item.name}</h3>
                <p className="item-price">
                  {item.price.toLocaleString("vi-VN")} đ
                </p>
              </div>
              <div className="cart-item-actions">
                <div className="quantity-control">
                  <button
                    onClick={() => updateQuantity(item._id, item.quantity - 1)}
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item._id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item._id)}
                  className="btn-remove"
                >
                  Xóa
                </button>
              </div>
              <div className="item-total">
                {(item.price * item.quantity).toLocaleString("vi-VN")} đ
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h2>Thông tin giao hàng</h2>
          <input
            type="text"
            placeholder="Họ tên"
            value={shippingInfo.name}
            onChange={(e) =>
              setShippingInfo({ ...shippingInfo, name: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Số điện thoại"
            value={shippingInfo.phone}
            onChange={(e) =>
              setShippingInfo({ ...shippingInfo, phone: e.target.value })
            }
          />
          <textarea
            placeholder="Địa chỉ giao hàng"
            value={shippingInfo.address}
            onChange={(e) =>
              setShippingInfo({ ...shippingInfo, address: e.target.value })
            }
            rows="3"
          />

          <div className="summary-total">
            <h3>Tổng cộng:</h3>
            <h2>{getTotal().toLocaleString("vi-VN")} đ</h2>
          </div>

          <button
            onClick={handleCheckout}
            className="btn btn-primary btn-large"
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Thanh toán VNPay"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
