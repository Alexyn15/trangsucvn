import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import axios from "axios";

const AdminUsers = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.isAdmin) {
      navigate("/");
    } else {
      fetchUsers();
    }
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/admin/users");
      setUsers(res.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !user.isAdmin) return null;
  if (loading) return <div className="loading">Đang tải...</div>;

  return (
    <div className="admin-users">
      <h1>Quản lý người dùng</h1>
      <p className="admin-subtitle">Xem danh sách tất cả tài khoản</p>

      {users.length === 0 ? (
        <div className="empty-state">
          <p>Chưa có người dùng nào</p>
        </div>
      ) : (
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Địa chỉ</th>
                <th>Vai trò</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <span className="user-id">{u._id.slice(-8)}</span>
                  </td>
                  <td>
                    <strong>{u.name}</strong>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.phone || "-"}</td>
                  <td>
                    <div className="address-cell">{u.address || "-"}</div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        u.isAdmin ? "badge-admin" : "badge-user"
                      }`}
                    >
                      {u.isAdmin ? "Admin" : "User"}
                    </span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString("vi-VN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="users-stats">
        <div className="stat-card">
          <h3>Tổng người dùng</h3>
          <p className="stat-number">{users.length}</p>
        </div>
        <div className="stat-card">
          <h3>Admin</h3>
          <p className="stat-number">{users.filter((u) => u.isAdmin).length}</p>
        </div>
        <div className="stat-card">
          <h3>Khách hàng</h3>
          <p className="stat-number">
            {users.filter((u) => !u.isAdmin).length}
          </p>
        </div>
        <div className="stat-card">
          <h3>Người dùng mới (7 ngày)</h3>
          <p className="stat-number">
            {
              users.filter((u) => {
                const diff = new Date() - new Date(u.createdAt);
                return diff < 7 * 24 * 60 * 60 * 1000;
              }).length
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
