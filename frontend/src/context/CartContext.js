import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
} from "react";
import { AuthContext } from "./AuthContext"; // Import để lấy user/token
import axios from "axios";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const authContext = useContext(AuthContext); // Lấy full AuthContext
  const { user, token } = authContext || {}; // Fallback nếu chưa ready
  const prevUserIdRef = useRef(user?._id); // Track user trước để detect switch

  // Load local cart khi init (chạy đầu tiên)
  useEffect(() => {
    console.log("🔄 Loading local cart..."); // Debug
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      setCart(parsedCart);
      console.log("📦 Local cart loaded:", parsedCart);
    }
  }, []);

  // Sync localStorage khi cart thay đổi
  useEffect(() => {
    if (cart.length > 0) {
      // Chỉ sync nếu có data
      localStorage.setItem("cart", JSON.stringify(cart));
      console.log("💾 Synced to localStorage:", cart.length, "items");
    }
  }, [cart]);

  // Fetch & merge cart từ server nếu logged in (chạy sau khi Auth ready)
  useEffect(() => {
    console.log("👤 User status:", user ? `Logged in: ${user._id}` : "Guest"); // Debug user ID
    if (user && token) {
      if (prevUserIdRef.current && prevUserIdRef.current !== user._id) {
        // Switch user: Clear local cũ
        localStorage.removeItem("cart");
        setCart([]);
        console.log("🔄 Switched user, cleared old cart");
      }
      prevUserIdRef.current = user._id;
      console.log("🌐 Fetching server cart for user:", user._id);
      fetchCartFromServer();
    } else {
      // Logout: Giữ local cho guest
      prevUserIdRef.current = null;
      console.log("🛒 Guest mode: Keep local only");
    }
  }, [user, token]); // Trigger mỗi khi user ID thay đổi (switch login)

  const fetchCartFromServer = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/cart");
      console.log("📡 Server cart response:", res.data); // Debug
      if (res.data && res.data.items && res.data.items.length > 0) {
        // Map server items bằng product_id (string)
        const serverItemsMap = new Map(
          res.data.items.map((item) => [
            item.product_id.toString(),
            { ...item, _id: item.product_id.toString() },
          ]) // Normalize _id cho merge
        );

        // Merge: Local + Server (ưu tiên server quantity, thêm local nếu server miss)
        let mergedCart = [...cart]; // Bắt đầu từ local
        serverItemsMap.forEach((serverItem, id) => {
          const localIndex = mergedCart.findIndex((item) => item._id === id);
          if (localIndex !== -1) {
            // Sync quantity từ server
            mergedCart[localIndex] = {
              ...mergedCart[localIndex],
              quantity: serverItem.quantity,
            };
          } else {
            // Thêm từ server
            mergedCart.push({
              _id: serverItem.product_id.toString(),
              name: serverItem.name,
              price: serverItem.price,
              imageUrl: serverItem.imageUrl || "", // Nếu server có
              quantity: serverItem.quantity,
            });
          }
        });

        setCart(mergedCart);
        console.log("🔄 Merged cart:", mergedCart);
      } else {
        // Server rỗng: Giữ local (không clear!)
        console.log("🗑️ Server cart empty, keeping local");
      }
    } catch (error) {
      console.error(
        "❌ Lỗi fetch cart từ server:",
        error.response?.data || error.message
      );
      // Không clear local nếu lỗi
    }
  };

  // Helper sync to server (ĐỊNH NGHĨA TRƯỚC ĐỂ TRÁNH ESLINT LỖI)
  const syncToServer = async (action, productId = null, quantity = null) => {
    if (!user || !token) {
      console.log("👤 Guest: Skip sync to server"); // Debug
      return;
    }

    console.log(
      `🌐 Syncing ${action} for product ${productId}, qty ${quantity}`
    ); // Debug

    try {
      let response;
      switch (action) {
        case "update":
          response = await axios.post("http://localhost:5000/api/cart/add", {
            productId,
            quantity,
          });
          break;
        case "remove":
          response = await axios.delete(
            `http://localhost:5000/api/cart/remove/${productId}`
          );
          break;
        case "clear":
          response = await axios.put("http://localhost:5000/api/cart/clear");
          break;
        default:
          return;
      }
      console.log("✅ Sync success:", response.status); // Debug
    } catch (error) {
      console.error(
        `❌ Sync ${action} failed:`,
        error.response?.status,
        error.response?.data || error.message
      );
      // Optional: Alert user hoặc rollback local (nhưng để mượt thì không)
    }
  };

  // BÂY GIỜ CÁC FUNCTION NÀY GỌI syncToServer SẼ OK (VÌ ĐÃ DEFINE TRƯỚC)
  const addToCart = (product) => {
    const existing = cart.find((item) => item._id === product._id);
    let newCart;
    if (existing) {
      newCart = cart.map((item) =>
        item._id === product._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      newCart = [...cart, { ...product, quantity: 1 }];
    }
    setCart(newCart);
    syncToServer("update", product._id, existing ? existing.quantity + 1 : 1);
  };

  const removeFromCart = (productId) => {
    const newCart = cart.filter((item) => item._id !== productId);
    setCart(newCart);
    syncToServer("remove", productId);
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const newCart = cart.map((item) =>
      item._id === productId ? { ...item, quantity } : item
    );
    setCart(newCart);
    syncToServer("update", productId, quantity);
  };

  const clearCart = () => {
    setCart([]);
    syncToServer("clear");
  };

  const getTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
