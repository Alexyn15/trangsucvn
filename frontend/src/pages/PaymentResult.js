import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const PaymentResult = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get("status");

  useEffect(() => {
    // Auto redirect after 5 seconds
    const timer = setTimeout(() => {
      navigate("/my-orders");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const isSuccess = status === "00";

  return (
    <div className="payment-result">
      <div className="result-card">
        {isSuccess ? (
          <>
            <div className="success-icon">✓</div>
            <h1>Thanh toán thành công!</h1>
            <p>Đơn hàng của bạn đã được xác nhận.</p>
            <p>Cảm ơn bạn đã mua hàng tại Jewelry Shop.</p>
          </>
        ) : (
          <>
            <div className="error-icon">✗</div>
            <h1>Thanh toán thất bại</h1>
            <p>Đã có lỗi xảy ra trong quá trình thanh toán.</p>
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
