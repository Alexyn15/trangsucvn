import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
} from "react";
import { AuthContext } from "./AuthContext";
import axios from "axios";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]); // [{ _id, name, price, imageUrl, quantity }]
  const authContext = useContext(AuthContext);
  const { user } = authContext || {};
  const prevUserIdRef = useRef(null);

  // Load local cart on init (guest)
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (err) {
      console.error("Failed to parse local cart:", err);
    }
  }, []);

  // Persist guest cart to localStorage; remove local when logged in
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem("cart", JSON.stringify(cart));
      } catch (err) {
        console.error("Failed to save cart to localStorage:", err);
      }
    } else {
      try {
        // keep localStorage empty to avoid cross-account leakage
        localStorage.removeItem("cart");
      } catch (err) {}
    }
  }, [cart, user]);

  // On user change: merge guest cart to server, then fetch server cart; on logout clear in-memory cart
  useEffect(() => {
    if (user) {
      if (prevUserIdRef.current !== user._id) {
        (async () => {
          try {
            const raw = localStorage.getItem("cart");
            if (raw) {
              let guestItems = [];
              try {
                const parsed = JSON.parse(raw);
                guestItems = parsed
                  .map((it) => {
                    const productId = it._id || it.productId || it.product;
                    const quantity = Number(it.quantity) || 1;
                    if (!productId || quantity <= 0) return null;
                    return { productId, quantity };
                  })
                  .filter(Boolean);
              } catch (err) {
                console.error("Invalid local cart format", err);
              }

              if (guestItems.length > 0) {
                try {
                  await axios.post("http://localhost:5000/api/cart/merge", {
                    items: guestItems,
                  });
                } catch (err) {
                  console.error(
                    "Merge cart failed:",
                    err.response?.data || err.message
                  );
                }
              }
              try {
                localStorage.removeItem("cart");
              } catch (err) {}
            }

            await fetchCartFromServer();
          } finally {
            prevUserIdRef.current = user._id;
          }
        })();
      }
    } else {
      // logout or guest mode
      prevUserIdRef.current = null;
      setCart([]);
      try {
        localStorage.removeItem("cart");
      } catch (err) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchCartFromServer = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/cart");
      const serverCart = (res.data && res.data.items) || [];
      const mapped = serverCart.map((it) => {
        const prod = it.product || {};
        const prodId =
          typeof prod === "object" && prod._id
            ? prod._id.toString()
            : it.product
            ? it.product.toString()
            : "";
        return {
          _id: prodId,
          name: it.name || prod.name || "Unknown",
          price: it.price != null ? it.price : prod.price || 0,
          imageUrl: it.imageUrl || prod.imageUrl || "",
          quantity: it.quantity || 1,
        };
      });
      setCart(mapped);
    } catch (error) {
      console.error(
        "Error fetching server cart:",
        error.response?.data || error.message
      );
    }
  };

  // Helper to sync actions to server; returns mapped cart if server returns items
  const syncToServer = async (action, productId = null, quantity = null) => {
    if (!user) return;
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
          response = await axios.delete("http://localhost:5000/api/cart/clear");
          break;
        default:
          return;
      }

      if (response && response.data && response.data.items) {
        const mapped = response.data.items.map((it) => {
          const prod = it.product || {};
          const prodId =
            typeof prod === "object" && prod._id
              ? prod._id.toString()
              : it.product
              ? it.product.toString()
              : "";
          return {
            _id: prodId,
            name: it.name || prod.name || "Unknown",
            price: it.price != null ? it.price : prod.price || 0,
            imageUrl: it.imageUrl || prod.imageUrl || "",
            quantity: it.quantity || 1,
          };
        });
        setCart(mapped);
        return mapped;
      } else {
        await fetchCartFromServer();
        return cart;
      }
    } catch (error) {
      console.error(
        `Sync ${action} failed:`,
        error.response?.data || error.message
      );
      throw error;
    }
  };

  /**
   * addToCart:
   * - If logged in => call server POST /api/cart/add (await) and update state from response.
   * - If guest => update local state & localStorage.
   */
  const addToCart = async (product, qty = 1) => {
    if (!product || !product._id) {
      throw new Error("Invalid product");
    }

    if (user) {
      try {
        const res = await axios.post("http://localhost:5000/api/cart/add", {
          productId: product._id,
          quantity: qty,
        });
        if (res && res.data && res.data.items) {
          const mapped = res.data.items.map((it) => {
            const prod = it.product || {};
            const prodId =
              typeof prod === "object" && prod._id
                ? prod._id.toString()
                : it.product
                ? it.product.toString()
                : "";
            return {
              _id: prodId,
              name: it.name || prod.name || "Unknown",
              price: it.price != null ? it.price : prod.price || 0,
              imageUrl: it.imageUrl || prod.imageUrl || "",
              quantity: it.quantity || 1,
            };
          });
          setCart(mapped);
          return mapped;
        } else {
          await fetchCartFromServer();
          return cart;
        }
      } catch (error) {
        console.error(
          "Error addToCart (server):",
          error.response?.data || error.message
        );
        throw error;
      }
    }

    // Guest flow
    const existing = cart.find((item) => item._id === product._id);
    let newCart;
    if (existing) {
      newCart = cart.map((item) =>
        item._id === product._id
          ? { ...item, quantity: item.quantity + qty }
          : item
      );
    } else {
      newCart = [
        ...cart,
        {
          _id: product._id,
          name: product.name,
          price: product.price || 0,
          imageUrl: product.imageUrl || "",
          quantity: qty,
        },
      ];
    }
    setCart(newCart);
    try {
      localStorage.setItem("cart", JSON.stringify(newCart));
    } catch (err) {
      console.error("Failed save cart to localStorage:", err);
    }
    return newCart;
  };

  const removeFromCart = (productId) => {
    const newCart = cart.filter((item) => item._id !== productId);
    setCart(newCart);
    if (user) {
      syncToServer("remove", productId).catch(() => {});
    } else {
      try {
        localStorage.setItem("cart", JSON.stringify(newCart));
      } catch (err) {}
    }
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
    if (user) {
      syncToServer("update", productId, quantity).catch(() => {});
    } else {
      try {
        localStorage.setItem("cart", JSON.stringify(newCart));
      } catch (err) {}
    }
  };

  const clearCart = () => {
    setCart([]);
    if (user) {
      syncToServer("clear").catch(() => {});
    } else {
      try {
        localStorage.removeItem("cart");
      } catch (err) {}
    }
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
