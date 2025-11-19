import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";

const Cart = () => {
  const { cart, updateQuantity, removeFromCart, getTotal, clearCart } =
    useContext(CartContext);
  const { user, token } = useContext(AuthContext); // Giả sử AuthContext có token (JWT) để auth API
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });

  // Fetch cart từ server khi component load (nếu user logged in)
  useEffect(() => {
    const fetchCart = async () => {
      if (user && token) {
        try {
          const res = await axios.get("http://localhost:5000/api/cart", {
            headers: { Authorization: `Bearer ${token}` }, // Auth với token
          });
          // Merge server cart vào local (nếu local có thêm item guest)
          if (res.data.items) {
            res.data.items.forEach((serverItem) => {
              const localItem = cart.find(
                (item) => item._id === serverItem.product_id
              );
              if (localItem) {
                updateQuantity(localItem._id, serverItem.quantity); // Sync quantity
              } else {
                // Thêm item mới từ server vào local
                // Giả sử bạn cần fetch product info nếu chưa có
                // updateCartLocal([{ ...serverItem, name: '...', imageUrl: '...', price: serverItem.price }]);
              }
            });
          }
        } catch (error) {
          console.error("Lỗi fetch cart:", error);
        }
      }
    };
    fetchCart();
  }, [user, token]); // Chạy khi user thay đổi (login/logout)

  // Wrapper cho updateQuantity: Gọi API nếu logged in
  const handleUpdateQuantity = async (productId, newQuantity) => {
    updateQuantity(productId, newQuantity); // Update local trước
    if (user && token && newQuantity > 0) {
      try {
        await axios.post(
          "http://localhost:5000/api/cart/add",
          { productId, quantity: newQuantity },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (error) {
        console.error("Lỗi update cart:", error);
        // Rollback local nếu API fail (optional)
      }
    }
  };

  // Wrapper cho removeFromCart: Gọi API nếu logged in
  const handleRemoveFromCart = async (productId) => {
    removeFromCart(productId); // Remove local trước
    if (user && token) {
      try {
        await axios.delete(
          `http://localhost:5000/api/cart/remove/${productId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } catch (error) {
        console.error("Lỗi remove cart:", error);
      }
    }
  };

  // Wrapper cho clearCart: Gọi API nếu logged in
  const handleClearCart = async () => {
    clearCart(); // Clear local
    if (user && token) {
      try {
        await axios.put(
          "http://localhost:5000/api/cart/clear",
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } catch (error) {
        console.error("Lỗi clear cart:", error);
      }
    }
  };

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
      // Nếu logged in, dùng cart từ server để đảm bảo sync
      let finalCart = cart;
      if (user && token) {
        const res = await axios.get("http://localhost:5000/api/cart", {
          headers: { Authorization: `Bearer ${token}` },
        });
        finalCart = res.data.items || cart; // Ưu tiên server cart
      }

      const orderData = {
        items: finalCart.map((item) => ({
          product: item._id || item.product_id, // Linh hoạt với _id hoặc product_id
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
        orderData,
        {
          headers: { Authorization: `Bearer ${token}` }, // Thêm auth cho order nếu cần
        }
      );

      // Redirect to VNPay
      window.location.href = res.data.paymentUrl;
      handleClearCart(); // Clear sau khi order thành công
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
            <div key={item._id || item.product_id} className="cart-item">
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
                    onClick={() =>
                      handleUpdateQuantity(
                        item._id || item.product_id,
                        item.quantity - 1
                      )
                    }
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() =>
                      handleUpdateQuantity(
                        item._id || item.product_id,
                        item.quantity + 1
                      )
                    }
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() =>
                    handleRemoveFromCart(item._id || item.product_id)
                  }
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
