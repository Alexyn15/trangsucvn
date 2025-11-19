import React, { useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.isAdmin) {
      navigate("/");
    }
  }, [user, navigate]);

  if (!user || !user.isAdmin) return null;

  return (
    <div className="admin-dashboard">
      <h1>Quản trị hệ thống</h1>

      <div className="admin-menu">
        <Link to="/admin/products" className="admin-card">
          <h2> Quản lý sản phẩm</h2>
          <p>Thêm, sửa, xóa sản phẩm</p>
        </Link>

        <Link to="/admin/orders" className="admin-card">
          <h2> Quản lý đơn hàng</h2>
          <p>Xem và cập nhật đơn hàng</p>
        </Link>

        <Link to="/admin/users" className="admin-card">
          <h2> Quản lý người dùng</h2>
          <p>Xem danh sách tài khoản</p>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
