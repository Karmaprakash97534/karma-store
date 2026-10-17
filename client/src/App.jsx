
import Admin from "./Admin";
import { useEffect, useState } from "react";
import "./App.css";
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/+$/, "");

const API_URL = `${API_BASE_URL}/api/v1/products`;
const ORDERS_URL = `${API_BASE_URL}/api/v1/orders`;
const CART_KEY = "karmaStoreCart";

function StoreApp() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSizes, setSelectedSizes] = useState({});

  // Load saved cart during initial state setup
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem(CART_KEY);

      if (!savedCart) return [];

      const parsedCart = JSON.parse(savedCart);
      return Array.isArray(parsedCart) ? parsedCart : [];
    } catch (err) {
      console.error("Saved cart load nahi hua:", err);
      return [];
    }
  });

  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  // Load products from backend
  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();

        const productList = Array.isArray(result)
          ? result
          : Array.isArray(result.products)
            ? result.products
            : Array.isArray(result.data)
              ? result.data
              : Array.isArray(result.data?.products)
                ? result.data.products
                : [];

        if (!cancelled) {
          setProducts(
            productList.filter((product) => product.active !== false)
          );
        }
      } catch (err) {
        console.error("Products load error:", err);

        if (!cancelled) {
          setError(
            "Products load nahi ho rahe. Production par VITE_API_URL mein deployed backend URL set karein; local development par backend aur MongoDB start karein."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  // Save cart to browser storage
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (err) {
      console.error("Cart save nahi hua:", err);
    }
  }, [cart]);

  const cartCount = cart.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const cartTotal = cart.reduce(
    (total, item) =>
      total + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  const shippingFee = cartTotal >= 1999 || cartTotal === 0 ? 0 : 99;
  const grandTotal = cartTotal + shippingFee;

  function addToCart(product) {
    const sizes =
      Array.isArray(product.sizes) && product.sizes.length > 0
        ? product.sizes
        : ["S", "M", "L", "XL"];

    const size = selectedSizes[product._id] || sizes[0];
    const stock = Number(product.stock || 0);
    const key = `${product._id}-${size}`;
    const existingItem = cart.find((item) => item.key === key);

    if (stock <= 0) {
      alert("Yeh product abhi out of stock hai.");
      return;
    }

    if (existingItem && existingItem.quantity >= stock) {
      alert("Stock mein isse zyada quantity available nahi hai.");
      return;
    }

    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.key === key);

      if (existing) {
        return currentCart.map((item) =>
          item.key === key
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...currentCart,
        {
          key,
          productId: product._id,
          name: product.name,
          price: Number(product.price),
          image: product.image || "",
          size,
          stock,
          quantity: 1,
        },
      ];
    });

    setCartOpen(true);
  }

  function changeQuantity(item, change) {
    const newQuantity = item.quantity + change;

    if (newQuantity <= 0) {
      setCart((currentCart) =>
        currentCart.filter((cartItem) => cartItem.key !== item.key)
      );
      return;
    }

    if (newQuantity > item.stock) {
      alert("Itna stock available nahi hai.");
      return;
    }

    setCart((currentCart) =>
      currentCart.map((cartItem) =>
        cartItem.key === item.key
          ? { ...cartItem, quantity: newQuantity }
          : cartItem
      )
    );
  }

  function removeFromCart(key) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.key !== key)
    );
  }

  function updateCustomer(field, value) {
    setCustomer((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function placeOrder(event) {
    event.preventDefault();

    if (cart.length === 0) {
      setOrderMessage("Aapka cart khaali hai.");
      return;
    }

    setPlacingOrder(true);
    setOrderMessage("");

    try {
      const response = await fetch(ORDERS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: customer.name.trim(),
          phone: customer.phone.trim(),
          shippingAddress: customer.address.trim(),
          city: customer.city.trim(),
          state: customer.state.trim(),
          pincode: customer.pincode.trim(),
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Order place nahi ho saka."
        );
      }

      const order = result.order || {};
      const orderId = String(
        order.id || order._id || "CONFIRMED"
      )
        .slice(-8)
        .toUpperCase();

      const finalAmount = Number(order.total ?? grandTotal);

      // Clear the cart after a confirmed order
      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
      localStorage.removeItem(CART_KEY);

      alert(
        `Order successfully placed!\n` +
          `Order ID: ${orderId}\n` +
          `Total: ₹${finalAmount.toLocaleString("en-IN")}\n` +
          "Payment: Cash on Delivery"
      );

      setCustomer({
        name: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
      });
    } catch (err) {
      console.error("Order error:", err);
      setOrderMessage(
        err.message || "Server se connection nahi ho raha."
      );
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <div className="store">
      <div className="announcement">
        KARMA STORE | New Collection Is Here
      </div>

      <header className="navbar">
        <a className="logo" href="#home">
          KARMA <span>STORE.</span>
        </a>

        <nav>
          <a href="#home">Home</a>
          <a href="#products">Shop</a>
          <a href="#products">New Arrivals</a>
          <a href="/admin">Admin</a>
        </nav>

        <button
          className="cart-button"
          type="button"
          onClick={() => setCartOpen(true)}
        >
          🛍 Cart ({cartCount})
        </button>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <p className="eyebrow">THE NEW FASHION ERA</p>

            <h1>Style That Speaks. Quality That Lasts.</h1>

            <p>
              Discover your style with the latest clothing
              collections at Karma Store.
            </p>

            <a className="shop-button" href="#products">
              SHOP COLLECTION →
            </a>
          </div>
        </section>

        <section className="products-section" id="products">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CURATED FOR YOU</p>
              <h2>Trending Collection</h2>
            </div>

            <span>Fashion • Comfort • Quality</span>
          </div>

          {loading && (
            <p className="load-message">
              Products load ho rahe hain...
            </p>
          )}

          {!loading && error && (
            <p className="load-message" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && products.length === 0 && (
            <p className="load-message">
              Abhi koi product available nahi hai.
            </p>
          )}

          {!loading && !error && products.length > 0 && (
            <div className="product-grid">
              {products.map((product) => {
                const sizes =
                  Array.isArray(product.sizes) &&
                  product.sizes.length > 0
                    ? product.sizes
                    : ["S", "M", "L", "XL"];

                return (
                  <article
                    className="product-card"
                    key={product._id || product.slug}
                  >
                    <div className="product-image">
                      <img
                        src={
                          product.image ||
                          product.imageUrl ||
                          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80"
                        }
                        alt={product.name}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80";
                        }}
                      />
                    </div>

                    <p className="product-category">
                      {product.category}
                    </p>

                    <h3>{product.name}</h3>

                    <p className="product-description">
                      {product.description}
                    </p>

                    <label
                      className="size-label"
                      htmlFor={`size-${product._id}`}
                    >
                      Select Size
                    </label>

                    <select
                      id={`size-${product._id}`}
                      className="size-select"
                      value={selectedSizes[product._id] || sizes[0]}
                      onChange={(event) =>
                        setSelectedSizes((current) => ({
                          ...current,
                          [product._id]: event.target.value,
                        }))
                      }
                    >
                      {sizes.map((size) => (
                        <option value={size} key={size}>
                          {size}
                        </option>
                      ))}
                    </select>

                    <div className="product-bottom">
                      <strong>
                        ₹{Number(product.price).toLocaleString("en-IN")}
                      </strong>

                      <button
                        type="button"
                        disabled={Number(product.stock) <= 0}
                        onClick={() => addToCart(product)}
                        aria-label={`Add ${product.name} to cart`}
                      >
                        {Number(product.stock) <= 0
                          ? "Out of Stock"
                          : "Add +"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer>
        <a className="logo" href="#home">
          KARMA <span>STORE.</span>
        </a>

        <p>Wear Your Style. Own Your Karma.</p>

        <small>© {new Date().getFullYear()} Karma Store</small>
      </footer>

      {/* Shopping cart modal */}
      {cartOpen && (
        <div className="cart-backdrop">
          <section
            className="cart-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
          >
            <div className="cart-header">
              <h2 id="cart-title">Your Shopping Cart</h2>

              <button
                className="cart-close"
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
              >
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="cart-empty">
                <p>Your cart is empty.</p>

                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <article
                      className="cart-item"
                      key={item.key}
                    >
                      <img
                        src={
                          item.image ||
                          "https://placehold.co/100x120?text=Product"
                        }
                        alt={item.name}
                      />

                      <div className="cart-item-info">
                        <h3>{item.name}</h3>

                        <p>Size: {item.size}</p>

                        <strong>
                          ₹
                          {(item.price * item.quantity).toLocaleString(
                            "en-IN"
                          )}
                        </strong>

                        <div className="quantity-controls">
                          <button
                            type="button"
                            onClick={() => changeQuantity(item, -1)}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            type="button"
                            disabled={item.quantity >= item.stock}
                            onClick={() => changeQuantity(item, 1)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>

                          <button
                            className="remove-button"
                            type="button"
                            onClick={() => removeFromCart(item.key)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="cart-summary">
                  <div>
                    <span>Subtotal</span>
                    <strong>
                      ₹{cartTotal.toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <p>
                    Shipping aur final total checkout par calculate honge.
                  </p>

                  <button
                    className="continue-button"
                    type="button"
                    disabled={cart.length === 0}
                    onClick={() => {
                      setOrderMessage("");
                      setCartOpen(false);
                      setCheckoutOpen(true);
                    }}
                  >
                    Proceed to Checkout
                  </button>

                  <button
                    className="continue-button"
                    type="button"
                    onClick={() => setCartOpen(false)}
                  >
                    Continue Shopping
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* Checkout modal - separate from the cart modal */}
      {checkoutOpen && (
        <div className="cart-backdrop">
          <section
            className="checkout-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
          >
            <div className="cart-header">
              <h2 id="checkout-title">Checkout</h2>

              <button
                className="cart-close"
                type="button"
                onClick={() => setCheckoutOpen(false)}
                aria-label="Close checkout"
              >
                ✕
              </button>
            </div>

            <form className="checkout-form" onSubmit={placeOrder}>
              <label htmlFor="customer-name">Full Name</label>

              <input
                id="customer-name"
                type="text"
                autoComplete="name"
                value={customer.name}
                onChange={(event) =>
                  updateCustomer("name", event.target.value)
                }
                required
              />

              <label htmlFor="customer-phone">Mobile Number</label>

              <input
                id="customer-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={customer.phone}
                onChange={(event) =>
                  updateCustomer("phone", event.target.value)
                }
                required
              />

              <label htmlFor="customer-address">
                Full Delivery Address
              </label>

              <textarea
                id="customer-address"
                autoComplete="street-address"
                rows={3}
                value={customer.address}
                onChange={(event) =>
                  updateCustomer("address", event.target.value)
                }
                required
              />

              <div className="checkout-two-columns">
                <div>
                  <label htmlFor="customer-city">City</label>

                  <input
                    id="customer-city"
                    autoComplete="address-level2"
                    value={customer.city}
                    onChange={(event) =>
                      updateCustomer("city", event.target.value)
                    }
                    required
                  />
                </div>

                <div>
                  <label htmlFor="customer-state">State</label>

                  <input
                    id="customer-state"
                    autoComplete="address-level1"
                    value={customer.state}
                    onChange={(event) =>
                      updateCustomer("state", event.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <label htmlFor="customer-pincode">PIN Code</label>

              <input
                id="customer-pincode"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={customer.pincode}
                onChange={(event) =>
                  updateCustomer("pincode", event.target.value)
                }
                required
              />

              <div className="checkout-total">
                <div>
                  <span>Subtotal</span>
                  <strong>
                    ₹{cartTotal.toLocaleString("en-IN")}
                  </strong>
                </div>

                <div>
                  <span>Shipping</span>
                  <strong>
                    {shippingFee === 0
                      ? "Free"
                      : `₹${shippingFee.toLocaleString("en-IN")}`}
                  </strong>
                </div>

                <div className="checkout-grand-total">
                  <span>Total to Pay</span>
                  <strong>
                    ₹{grandTotal.toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>

              <p className="cod-note">
                Payment Method: Cash on Delivery (COD)
              </p>

              {orderMessage && (
                <p className="order-error" role="alert">
                  {orderMessage}
                </p>
              )}

              <button
                className="place-order-button"
                type="submit"
                disabled={placingOrder || cart.length === 0}
              >
                {placingOrder ? "Placing Order..." : "Place COD Order"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function App() {
  const path = window.location.pathname.replace(/\/+$/, "");

  if (path === "/admin") {
    return <Admin />;
  }

  return <StoreApp />;
}

export default App;
