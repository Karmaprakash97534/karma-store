
import { useState } from "react";
import "./Admin.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/+$/, "");

const API_URL = `${API_BASE_URL}/api/v1/orders`;

const statuses = [
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function Admin() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadOrders(event) {
    if (event) event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(API_URL, {
        headers: {
          "x-admin-password": password,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Orders load nahi hue.");
      }

      setOrders(result.orders || []);
      setAuthenticated(true);
      setMessage(`${result.count || 0} orders mil gaye.`);
    } catch (err) {
      setAuthenticated(false);
      setError(err.message || "Backend se connection nahi ho raha.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(orderId, status) {
    setUpdatingId(orderId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Status update nahi hua.");
      }

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order._id === orderId
            ? { ...order, status: result.order.status }
            : order
        )
      );

      setMessage(`Order status ${status} ho gaya.`);
    } catch (err) {
      setError(err.message || "Status update nahi hua.");
    } finally {
      setUpdatingId("");
    }
  }

  function logout() {
    setPassword("");
    setAuthenticated(false);
    setOrders([]);
    setError("");
    setMessage("");
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">KARMA STORE</p>
          <h1>Admin Panel</h1>
          <p>Orders aur delivery status manage karein.</p>
        </div>

        <a className="admin-store-link" href="/">
          ← Back to Store
        </a>
      </header>

      {!authenticated && (
        <form className="admin-login" onSubmit={loadOrders}>
          <h2>Admin Login</h2>
          <p>Apna ADMIN_PASSWORD enter karein.</p>

          <label htmlFor="admin-password">Admin Password</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          {error && <p className="admin-error" role="alert">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Checking..." : "Login and View Orders"}
          </button>
        </form>
      )}

      {authenticated && (
        <>
          <section className="admin-toolbar">
            <div>
              <h2>Customer Orders</h2>
              <p>Total shown: {orders.length}</p>
            </div>

            <div className="admin-toolbar-actions">
              <button
                type="button"
                onClick={() => loadOrders()}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh Orders"}
              </button>

              <button type="button" className="admin-logout" onClick={logout}>
                Logout
              </button>
            </div>
          </section>

          {error && <p className="admin-error" role="alert">{error}</p>}
          {message && <p className="admin-message" role="status">{message}</p>}

          {orders.length === 0 ? (
            <section className="admin-empty">
              <h3>Abhi koi order nahi hai</h3>
              <p>Customer ka order aane par yahan dikhai dega.</p>
            </section>
          ) : (
            <section className="admin-orders">
              {orders.map((order) => (
                <article className="admin-order-card" key={order._id}>
                  <div className="admin-order-heading">
                    <div>
                      <span className="admin-muted">Order ID</span>
                      <strong>{order._id}</strong>
                      <span className="admin-muted">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString("en-IN")
                          : ""}
                      </span>
                    </div>

                    <span className="admin-status">{order.status}</span>
                  </div>

                  <div className="admin-order-grid">
                    <div>
                      <h3>Customer Details</h3>
                      <p><strong>Name:</strong> {order.customer?.name}</p>
                      <p><strong>Mobile:</strong> {order.customer?.phone}</p>
                      <p>
                        <strong>Address:</strong>{" "}
                        {[
                          order.customer?.address,
                          order.customer?.city,
                          order.customer?.state,
                          order.customer?.pincode,
                        ].filter(Boolean).join(", ")}
                      </p>
                    </div>

                    <div>
                      <h3>Order Summary</h3>

                      {(order.items || []).map((item, index) => (
                        <p key={`${order._id}-${index}`}>
                          {item.name} — Size {item.size} × {item.quantity}
                          {" · "}{money(item.price * item.quantity)}
                        </p>
                      ))}

                      <p>Subtotal: <strong>{money(order.subtotal)}</strong></p>
                      <p>Shipping: <strong>{money(order.shippingFee)}</strong></p>
                      <p className="admin-total">
                        Total: <strong>{money(order.total)}</strong>
                      </p>
                      <p>Payment: {order.paymentMethod || "COD"}</p>
                    </div>
                  </div>

                  <div className="admin-status-controls">
                    <label htmlFor={`status-${order._id}`}>
                      Update Order Status
                    </label>

                    <select
                      id={`status-${order._id}`}
                      value={order.status}
                      disabled={updatingId === order._id}
                      onChange={(event) =>
                        updateStatus(order._id, event.target.value)
                      }
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    {updatingId === order._id && (
                      <span>Saving...</span>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}

      <footer className="admin-footer">
        Karma Store Admin · Keep customer information private
      </footer>
    </main>
  );
}

export default Admin;
