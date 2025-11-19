import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { cart } = useContext(CartContext);

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          Jewelry Shop
        </Link>

        <ul className="nav-menu">
          <li>
            <Link to="/">Trang chủ</Link>
          </li>

          {user ? (
            <>
              <li>
                <Link to="/my-orders">Đơn hàng</Link>
              </li>
              <li>
                <Link to="/profile">Tài khoản</Link>
              </li>
              {user.isAdmin && (
                <li>
                  <Link to="/admin">Admin</Link>
                </li>
              )}
              <li>
                <button onClick={logout} className="btn-logout">
                  Đăng xuất
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/login">Đăng nhập</Link>
              </li>
              <li>
                <Link to="/register">Đăng ký</Link>
              </li>
            </>
          )}

          <li>
            <Link to="/cart" className="cart-link">
              Giỏ hàng ({cart.length})
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
