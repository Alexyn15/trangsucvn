import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";

const MyOrders = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else {
      fetchOrders();
    }
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/orders/my-orders");
      setOrders(res.data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: "Chờ xử lý",
      processing: "Đang xử lý",
      shipped: "Đang giao",
      delivered: "Đã giao",
      cancelled: "Đã hủy",
    };
    return statusMap[status] || status;
  };

  const getPaymentStatusText = (status) => {
    const statusMap = {
      pending: "Chờ thanh toán",
      paid: "Đã thanh toán",
      failed: "Thất bại",
    };
    return statusMap[status] || status;
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  return (
    <div className="orders-page">
      <h1>Đơn hàng của tôi</h1>

      {orders.length === 0 ? (
        <div className="empty-orders">
          <p>Bạn chưa có đơn hàng nào</p>
          <button onClick={() => navigate("/")} className="btn btn-primary">
            Mua sắm ngay
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <div>
                  <p>
                    <strong>Mã đơn:</strong> {order._id}
                  </p>
                  <p>
                    <strong>Ngày đặt:</strong>{" "}
                    {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <div>
                  <span className={`status-badge status-${order.orderStatus}`}>
                    {getStatusText(order.orderStatus)}
                  </span>
                  <span
                    className={`status-badge status-${order.paymentStatus}`}
                  >
                    {getPaymentStatusText(order.paymentStatus)}
                  </span>
                </div>
              </div>

              <div className="order-items">
                {order.items.map((item, index) => (
                  <div key={index} className="order-item">
                    <img src={item.imageUrl} alt={item.name} />
                    <div>
                      <p>
                        <strong>{item.name}</strong>
                      </p>
                      <p>Số lượng: {item.quantity}</p>
                      <p>{item.price.toLocaleString("vi-VN")} đ</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-footer">
                <p>
                  <strong>Tổng tiền:</strong>{" "}
                  {order.totalAmount.toLocaleString("vi-VN")} đ
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
