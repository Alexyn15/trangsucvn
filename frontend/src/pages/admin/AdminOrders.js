import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import axios from "axios";

const AdminOrders = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.isAdmin) {
      navigate("/");
    } else {
      fetchOrders();
    }
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/admin/orders");
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

  if (!user || !user.isAdmin) return null;
  if (loading) return <div className="loading">Đang tải...</div>;

  return (
    <div className="admin-orders">
      <h1>Quản lý đơn hàng</h1>
      <p className="admin-subtitle">Xem danh sách tất cả đơn hàng</p>

      {orders.length === 0 ? (
        <div className="empty-state">
          <p>Chưa có đơn hàng nào</p>
        </div>
      ) : (
        <div className="orders-table">
          <table>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Địa chỉ giao hàng</th>
                <th>Ngày đặt</th>
                <th>Tổng tiền</th>
                <th>Thanh toán</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td>
                    <span className="order-id">{order._id.slice(-8)}</span>
                  </td>
                  <td>
                    <strong>{order.user?.name || "N/A"}</strong>
                  </td>
                  <td>{order.user?.email || "N/A"}</td>
                  <td>{order.shippingAddress?.phone || "N/A"}</td>
                  <td>
                    <div className="address-cell">
                      {order.shippingAddress?.address || "N/A"}
                    </div>
                  </td>
                  <td>
                    {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="price-cell">
                    {order.totalAmount.toLocaleString("vi-VN")} đ
                  </td>
                  <td>
                    <span className={`badge badge-${order.paymentStatus}`}>
                      {getPaymentStatusText(order.paymentStatus)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${order.orderStatus}`}>
                      {getStatusText(order.orderStatus)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-stats">
        <div className="stat-card">
          <h3>Tổng đơn hàng</h3>
          <p className="stat-number">{orders.length}</p>
        </div>
        <div className="stat-card">
          <h3>Chờ xử lý</h3>
          <p className="stat-number">
            {orders.filter((o) => o.orderStatus === "pending").length}
          </p>
        </div>
        <div className="stat-card">
          <h3>Đã thanh toán</h3>
          <p className="stat-number">
            {orders.filter((o) => o.paymentStatus === "paid").length}
          </p>
        </div>
        <div className="stat-card">
          <h3>Tổng doanh thu</h3>
          <p className="stat-number">
            {orders
              .reduce((sum, o) => sum + o.totalAmount, 0)
              .toLocaleString("vi-VN")}{" "}
            đ
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
