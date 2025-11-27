import React, { useEffect, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

const PaymentResult = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useContext(AuthContext); // lấy token từ context
  const vnpStatus = searchParams.get("vnp_ResponseCode"); // VNPay param
  const txnRef = searchParams.get("vnp_TxnRef"); // dùng vnp_TxnRef, không phải MongoDB _id

  useEffect(() => {
    if (vnpStatus === "00" && txnRef && token) {
      axios
        .put(
          `http://localhost:5000/api/orders/pay/${txnRef}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then((res) => console.log("Payment updated:", res.data))
        .catch((err) => console.error("Error updating payment:", err));
    }

    const timer = setTimeout(() => navigate("/my-orders"), 5000);
    return () => clearTimeout(timer);
  }, [vnpStatus, txnRef, token, navigate]);

  const isSuccess = vnpStatus === "00";

  return (
    <div className="payment-result">
      <div className="result-card">
        {isSuccess ? (
          <>
            <div className="success-icon">✓</div>
            <h1>Thanh toán thành công!</h1>
            <p>Đơn hàng của bạn đã được xác nhận.</p>
          </>
        ) : (
          <>
            <div className="error-icon">✗</div>
            <h1>Thanh toán thất bại</h1>
            <p>Vui lòng thử lại sau.</p>
          </>
        )}

        <div className="result-actions">
          <button
            onClick={() => navigate("/my-orders")}
            className="btn btn-primary"
          >
            Xem đơn hàng
          </button>
          <button onClick={() => navigate("/")} className="btn btn-secondary">
            Về trang chủ
          </button>
        </div>

        <p className="redirect-notice">Tự động chuyển hướng sau 5 giây...</p>
      </div>
    </div>
  );
};

export default PaymentResult;
