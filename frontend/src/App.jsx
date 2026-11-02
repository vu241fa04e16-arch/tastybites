
import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ALL FOOD IMAGES ARE MANAGED IN FRONTEND
const foodImages = {
  pizza: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
  burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
  pasta: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800",
  biryani: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800",
  "french fries": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800",
  sandwich: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800",
  "chocolate cake": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800",
  "ice cream": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800",
  "orange juice": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800",
  coffee: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
  momos: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"
};

function getFoodImage(name) {
  const key = String(name || "").trim().toLowerCase();

  return foodImages[key] ||
    "https://placehold.co/600x400?text=Food+Image";
}

const categories = [
  "All",
  "Fast Food",
  "Main Course",
  "Desserts",
  "Drinks"
];

const money = value => "₹" + Number(value || 0).toFixed(0);

async function api(path, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("tasty-wishlist") || "[]");
    } catch {
      return [];
    }
  });

  const [page, setPage] = useState("Home");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("popular");

  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: ""
  });

  const [address, setAddress] = useState(
    localStorage.getItem("tasty-address") || ""
  );

  const [historyEmail, setHistoryEmail] = useState("");
  const [orders, setOrders] = useState([]);

  const [trackId, setTrackId] = useState("");
  const [trackedOrder, setTrackedOrder] = useState(null);

  const [message, setMessage] = useState("");

  const orderStatuses = [
    "Placed",
    "Preparing",
    "Out for delivery",
    "Delivered"
  ];

  // LOAD PRODUCTS FROM MONGODB
  useEffect(() => {
    api("/api/products")
      .then(setProducts)
      .catch(error => setMessage(error.message));
  }, []);

  // SAVE WISHLIST
  useEffect(() => {
    localStorage.setItem(
      "tasty-wishlist",
      JSON.stringify(wishlist)
    );
  }, [wishlist]);

  // SAVE ADDRESS
  useEffect(() => {
    localStorage.setItem("tasty-address", address);
  }, [address]);

  // FILTER AND SORT PRODUCTS
  const filteredProducts = useMemo(() => {
    let result = products.filter(product => {
      const matchesCategory =
        category === "All" || product.category === category;

      const matchesSearch =
        product.name.toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });

    if (sort === "low") {
      result.sort((a, b) => a.price - b.price);
    } else if (sort === "high") {
      result.sort((a, b) => b.price - a.price);
    } else if (sort === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      result.sort(
        (a, b) => Number(b.bestseller) - Number(a.bestseller)
      );
    }

    return result;
  }, [products, category, search, sort]);

  // CART TOTALS
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const discount = appliedCoupon?.discount || 0;
  const deliveryFee = subtotal === 0 || subtotal >= 499 ? 0 : 30;
  const total = subtotal - discount + deliveryFee;

  // ADD TO CART
  function addToCart(product) {
    setCart(current => {
      const found = current.find(item => item._id === product._id);

      if (found) {
        return current.map(item =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });

    setMessage(product.name + " added to cart");
  }

  // CHANGE QUANTITY
  function changeQuantity(id, amount) {
    setCart(current =>
      current
        .map(item =>
          item._id === id
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
        .filter(item => item.quantity > 0)
    );

    setAppliedCoupon(null);
  }

  // WISHLIST
  function toggleWishlist(product) {
    setWishlist(current =>
      current.some(item => item._id === product._id)
        ? current.filter(item => item._id !== product._id)
        : [...current, product]
    );
  }

  // NAVIGATION
  function navigate(pageName) {
    setPage(pageName);
    setMessage("");
    window.scrollTo(0, 0);
  }

  // APPLY COUPON
  async function applyCoupon() {
    try {
      const result = await api("/api/coupons/validate", {
        method: "POST",
        body: JSON.stringify({
          code: coupon,
          subtotal
        })
      });

      setAppliedCoupon(result);
      setMessage("Coupon applied successfully");
    } catch (error) {
      setAppliedCoupon(null);
      setMessage(error.message);
    }
  }

  // PLACE ORDER
  async function placeOrder(event) {
    event.preventDefault();

    try {
      const result = await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          ...customer,
          address,
          items: cart.map(item => ({
            productId: item._id,
            quantity: item.quantity
          })),
          couponCode: appliedCoupon?.code || ""
        })
      });

      setCart([]);
      setAppliedCoupon(null);

      const order = await api("/api/orders/" + result.orderId);

      setTrackedOrder(order);
      setTrackId(result.orderId);

      navigate("Track Order");
      setMessage("Your order has been placed successfully");
    } catch (error) {
      setMessage(error.message);
    }
  }

  // CUSTOMER ORDER HISTORY
  async function loadOrders(event) {
    event.preventDefault();

    try {
      const result = await api(
        "/api/orders?email=" + encodeURIComponent(historyEmail)
      );

      setOrders(result);
    } catch (error) {
      setMessage(error.message);
    }
  }

  // TRACK ORDER
  async function trackOrder(event) {
    event.preventDefault();

    try {
      const result = await api("/api/orders/" + trackId);
      setTrackedOrder(result);
      setMessage("");
    } catch (error) {
      setTrackedOrder(null);
      setMessage(error.message);
    }
  }

  const navigation = [
    "Home",
    "Menu",
    "Wishlist",
    "Cart",
    "My Orders",
    "Track Order"
  ];

  return (
    <>
      {/* HEADER */}
      <header>
        <a className="logo" onClick={() => navigate("Home")}>
          Tasty<span>Bites</span>
          <small>FRESH FOOD · HAPPY MOOD</small>
        </a>

        <nav>
          {navigation.map(item => (
            <button
              key={item}
              className={page === item ? "active" : ""}
              onClick={() => navigate(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <button className="carttop" onClick={() => navigate("Cart")}>
          Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
        </button>
      </header>

      {/* NOTIFICATION */}
      {message && (
        <div className="notice">
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      {/* HOME PAGE */}
      {page === "Home" && (
        <>
          <section className="hero">
            <div>
              <small>FRESHLY MADE, JUST FOR YOU</small>

              <h1>
                Good food.
                <br />
                <em>Good mood.</em>
              </h1>

              <p>
                Delicious meals, fresh ingredients and flavours
                you'll keep coming back for.
              </p>

              <button onClick={() => navigate("Menu")}>
                Explore menu →
              </button>
            </div>

            <img
              src="https://images.unsplash.com/photo-1547592180-85f173990554?w=1200"
              alt="Delicious food"
            />
          </section>

          <main className="wrap">
            <h2>
              Our <em>bestsellers</em>
            </h2>

            <p className="sub">
              The dishes everyone is talking about.
            </p>

            <div className="grid">
              {products
                .filter(product => product.bestseller)
                .slice(0, 4)
                .map(product => (
                  <FoodCard
                    key={product._id}
                    product={product}
                    addToCart={addToCart}
                    wishlist={wishlist}
                    toggleWishlist={toggleWishlist}
                  />
                ))}
            </div>

            <div className="couponbanner">
              <h2>Your first treat is on us!</h2>
              <p>Use WELCOME10 for 10% off orders above ₹199.</p>

              <button onClick={() => navigate("Menu")}>
                Order now
              </button>
            </div>
          </main>
        </>
      )}

      {/* MENU PAGE */}
      {page === "Menu" && (
        <main className="wrap">
          <h1>Explore our menu</h1>

          <p className="sub">
            Find something delicious for every craving.
          </p>

          <div className="tools">
            <input
              placeholder="Search your favourite food..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />

            <select
              value={sort}
              onChange={event => setSort(event.target.value)}
            >
              <option value="popular">Most popular</option>
              <option value="low">Price low to high</option>
              <option value="high">Price high to low</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>

          <div className="chips">
            {categories.map(item => (
              <button
                key={item}
                className={category === item ? "chosen" : ""}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="grid">
            {filteredProducts.map(product => (
              <FoodCard
                key={product._id}
                product={product}
                addToCart={addToCart}
                wishlist={wishlist}
                toggleWishlist={toggleWishlist}
              />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <p className="empty">No food items found.</p>
          )}
        </main>
      )}

      {/* WISHLIST PAGE */}
      {page === "Wishlist" && (
        <main className="wrap">
          <h1>Your wishlist</h1>

          <div className="grid">
            {wishlist.map(product => (
              <FoodCard
                key={product._id}
                product={product}
                addToCart={addToCart}
                wishlist={wishlist}
                toggleWishlist={toggleWishlist}
              />
            ))}
          </div>

          {wishlist.length === 0 && (
            <p className="empty">Your wishlist is empty.</p>
          )}
        </main>
      )}

      {/* CART PAGE */}
      {page === "Cart" && (
        <main className="wrap">
          <h1>Your cart</h1>

          {cart.length === 0 ? (
            <div className="panel">
              <p>Your cart is empty.</p>

              <button onClick={() => navigate("Menu")}>
                Explore menu
              </button>
            </div>
          ) : (
            <div className="columns">
              <section className="panel">
                {cart.map(item => (
                  <div className="cartitem" key={item._id}>
                    <img
                      src={getFoodImage(item.name)}
                      alt={item.name}
                      onError={event => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src =
                          "https://placehold.co/600x400?text=Food+Image";
                      }}
                    />

                    <div>
                      <b>{item.name}</b>
                      <p>{money(item.price)} each</p>

                      <button
                        onClick={() => changeQuantity(item._id, -1)}
                      >
                        −
                      </button>

                      <span className="quantity">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => changeQuantity(item._id, 1)}
                      >
                        +
                      </button>
                    </div>

                    <b>{money(item.price * item.quantity)}</b>
                  </div>
                ))}
              </section>

              <aside className="panel">
                <h3>Order summary</h3>

                <div className="coupon">
                  <input
                    placeholder="Coupon code"
                    value={coupon}
                    onChange={event =>
                      setCoupon(event.target.value.toUpperCase())
                    }
                  />

                  <button onClick={applyCoupon}>Apply</button>
                </div>

                <p>
                  Subtotal <b>{money(subtotal)}</b>
                </p>

                <p>
                  Delivery{" "}
                  <b>{deliveryFee ? money(deliveryFee) : "FREE"}</b>
                </p>

                <p>
                  Discount <b>-{money(discount)}</b>
                </p>

                <h2>Total: {money(total)}</h2>

                <button
                  className="wide"
                  onClick={() => navigate("Checkout")}
                >
                  Checkout
                </button>
              </aside>
            </div>
          )}
        </main>
      )}

      {/* CHECKOUT PAGE */}
      {page === "Checkout" && (
        <main className="wrap narrow">
          <h1>Checkout</h1>

          <form className="panel" onSubmit={placeOrder}>
            <InputField
              label="Full name"
              value={customer.name}
              onChange={value =>
                setCustomer({ ...customer, name: value })
              }
            />

            <InputField
              label="Email"
              type="email"
              value={customer.email}
              onChange={value =>
                setCustomer({ ...customer, email: value })
              }
            />

            <InputField
              label="Phone number"
              type="tel"
              value={customer.phone}
              onChange={value =>
                setCustomer({ ...customer, phone: value })
              }
            />

            <InputField
              label="Delivery address"
              value={address}
              onChange={setAddress}
            />

            <h2>Payable amount: {money(total)}</h2>

            <button className="wide" disabled={cart.length === 0}>
              Place order
            </button>

            <small>
              Demo checkout. No online payment is collected.
            </small>
          </form>
        </main>
      )}

      {/* ORDER HISTORY PAGE */}
      {page === "My Orders" && (
        <main className="wrap narrow">
          <h1>Order history</h1>

          <form className="tools" onSubmit={loadOrders}>
            <input
              type="email"
              required
              placeholder="Enter checkout email"
              value={historyEmail}
              onChange={event => setHistoryEmail(event.target.value)}
            />

            <button>Find orders</button>
          </form>

          {orders.map(order => (
            <div className="panel order" key={order._id}>
              <div>
                <b>Order #{order._id.slice(-8)}</b>

                <p>
                  {new Date(order.createdAt).toLocaleString()}
                </p>

                <p>Status: {order.status}</p>
              </div>

              <b>{money(order.total)}</b>

              <button
                onClick={() => {
                  setTrackedOrder(order);
                  setTrackId(order._id);
                  navigate("Track Order");
                }}
              >
                Track
              </button>
            </div>
          ))}
        </main>
      )}

      {/* TRACK ORDER PAGE */}
      {page === "Track Order" && (
        <main className="wrap narrow">
          <h1>Track your order</h1>

          <form className="tools" onSubmit={trackOrder}>
            <input
              placeholder="Enter order ID"
              value={trackId}
              onChange={event => setTrackId(event.target.value)}
              required
            />

            <button>Track order</button>
          </form>

          {trackedOrder && (
            <div className="panel">
              <h2>{trackedOrder.status}</h2>

              <p>Order ID: {trackedOrder._id}</p>

              <div className="steps">
                {orderStatuses.map((status, index) => (
                  <span
                    key={status}
                    className={
                      orderStatuses.indexOf(trackedOrder.status) >= index
                        ? "done"
                        : ""
                    }
                  >
                    {status}
                  </span>
                ))}
              </div>

              <p>
                Delivery address: {trackedOrder.customer?.address || trackedOrder.address}
              </p>

              <p>
                Total: <b>{money(trackedOrder.total)}</b>
              </p>
            </div>
          )}
        </main>
      )}

      
    </>
  );
}

// FOOD CARD COMPONENT
function FoodCard({
  product,
  addToCart,
  wishlist,
  toggleWishlist
}) {
  const saved = wishlist.some(item => item._id === product._id);

  return (
    <article className="card">
      <div className="photo">
        <img
          src={getFoodImage(product.name)}
          alt={product.name}
          onError={event => {
            event.currentTarget.onerror = null;
            event.currentTarget.src =
              "https://placehold.co/600x400?text=Food+Image";
          }}
        />

        {product.bestseller && <label>Bestseller</label>}

        <button
          className="heart"
          onClick={() => toggleWishlist(product)}
          aria-label="Toggle wishlist"
        >
          {saved ? "♥" : "♡"}
        </button>
      </div>

      <div className="cardbody">
        <small>{product.category}</small>

        <h3>{product.name}</h3>

        <p>{product.description}</p>

        <div>
          <b>{money(product.price)}</b>

          <button onClick={() => addToCart(product)}>
            + Add
          </button>
        </div>
      </div>
    </article>
  );
}

// REUSABLE INPUT COMPONENT
function InputField({
  label,
  value,
  onChange,
  type = "text"
}) {
  return (
    <label className="field">
      {label}

      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        required
      />
    </label>
  );
}
