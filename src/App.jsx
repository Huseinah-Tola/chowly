import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import "./App.css";

function App() {
  const [mode, setMode] = useState("customer");

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>CHOWLY</h1>
          <p>Restaurant ordering made simple.</p>
        </div>

        <div className="mode-switch">
          <button
            className={mode === "customer" ? "active" : ""}
            onClick={() => setMode("customer")}
          >
            Customer
          </button>

          <button
            className={mode === "waiter" ? "active" : ""}
            onClick={() => setMode("waiter")}
          >
            Waiter
          </button>
        </div>
      </header>

      <main>
        {mode === "customer" ? (
          <Customer />
        ) : (
          <Waiter />
        )}
      </main>
    </div>
  );
}


/* =========================================
   CUSTOMER
========================================= */

function Customer() {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("All");
  const [orderHistory, setOrderHistory] = useState([]);
  const [tableNumber, setTableNumber] = useState("");

  useEffect(() => {
    loadMenu();
    loadExistingOrder();
    loadOrderHistory();
  }, []);

  async function loadOrderHistory() {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (
        quantity,
        price,
        menu_items (
          name
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  setOrderHistory(data || []);
}

  async function loadMenu() {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("available", true)
      .order("category")
      .order("name");

    if (error) {
      console.error(error);
      setMessage("Could not load menu.");
    } else {
      setMenu(data);
    }

    setLoading(false);
  }

  async function loadExistingOrder() {
    const savedOrderId = localStorage.getItem("chowlyOrderId");

    if (!savedOrderId) {
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          menu_items (
            name,
            category
          )
        ),
        chef:staff!orders_chef_id_fkey (
          name
        ),
        bartender:staff!orders_bartender_id_fkey (
          name
        )
      `)
      .eq("id", savedOrderId)
      .single();

    if (!error && data) {
      setOrder(data);
    }
  }

  function addToCart(item) {
    const existing = cart.find(
      (cartItem) => cartItem.id === item.id
    );

    if (existing) {
      setCart(
        cart.map((cartItem) =>
          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1
              }
            : cartItem
        )
      );
    } else {
      setCart([
        ...cart,
        {
          ...item,
          quantity: 1
        }
      ]);
    }
  }

  function increaseQuantity(id) {
    setCart(
      cart.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity + 1
            }
          : item
      )
    );
  }

  function decreaseQuantity(id) {
    setCart(
      cart
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity - 1
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(id) {
    setCart(
      cart.filter((item) => item.id !== id)
    );
  }

  function getTotal() {
    return cart.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );
  }

  function getWaitingTime() {
    if (cart.length === 0) {
      return 0;
    }

    return Math.max(
      ...cart.map(
        (item) => item.preparation_time
      )
    );
  }

  async function placeOrder() {
     if (!tableNumber) {
    setMessage("Please select your table number.");
    return;
  }
    // existing order code...
    if (cart.length === 0) {
      setMessage("Please add something to your order.");
      return;
    }

    setMessage("Placing your order...");

    const total = getTotal();
    const waitingTime = getWaitingTime();

    const { data: newOrder, error: orderError } =
      await supabase
        .from("orders")
        .insert({
          status: "pending",
          total_amount: total,
          waiting_time: waitingTime,
          payment_status: "unpaid",
          table_number: Number(tableNumber)
        })
        .select()
        .single();

    if (orderError) {
      console.error(orderError);
      setMessage(
        "There was a problem creating the order."
      );
      return;
    }

    const orderItems = cart.map((item) => ({
      order_id: newOrder.id,
      menu_item_id: item.id,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: itemsError } =
      await supabase
        .from("order_items")
        .insert(orderItems);

    if (itemsError) {
      console.error(itemsError);
      setMessage(
        "The order was created but its items could not be saved."
      );
      return;
    }

    localStorage.setItem(
      "chowlyOrderId",
      newOrder.id
    );

    setCart([]);
    setMessage("");
    await loadExistingOrder();
  }

  if (loading) {
    return (
      <section className="section">
        <div className="loading">
          Loading Chowly menu...
        </div>
      </section>
    );
  }

  if (order) {
    function backToMenu() {
      localStorage.removeItem("chowlyOrderId");
      setOrder(null);
      setCart([]);
      setMessage("");
    }

    return (
      <CustomerOrder
        order={order}
        reloadOrder={loadExistingOrder}
        backToMenu={backToMenu}
      />
    );
  }

  const filteredMenu = menu.filter((item) => {
  const matchesSearch = item.name
    .toLowerCase()
    .includes(searchTerm.toLowerCase());

  const matchesCategory =
    category === "All" ||
    item.category === category;

  return matchesSearch && matchesCategory;
});

const food = filteredMenu.filter(
  (item) => item.category === "Food"
);

const drinks = filteredMenu.filter(
  (item) => item.category === "Drink"
);

  return (
    <section className="section">

      <div className="hero">
        <div>
          <span className="eyebrow">
            WELCOME TO CHOWLY
          </span>

          <h2>
            Good food.
            <br />
            Less waiting.
          </h2>

          <p>
            Browse our menu, place your order and
            track it from preparation to payment.
          </p>
        </div>
      </div>

      {message && (
        <div className="message">
          {message}
        </div>
      )}
      
      <div className="customer-layout">
        <div className="menu-column">
          <div className="table-selector">
            <label htmlFor="tableNumber">Table Number</label>
            <select
              id="tableNumber"
              value={tableNumber}
              onChange={(event) => setTableNumber(event.target.value)}
            >
              <option value="">Select your table</option>
              {Array.from({ length: 20 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  Table {index + 1}
                </option>
              ))}
            </select>
          </div>

          <div className="menu-controls">
            <input
              type="text"
              placeholder="Search menu..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <div className="category-buttons">
              {['All', 'Food', 'Drink'].map((itemCategory) => (
                <button
                  key={itemCategory}
                  type="button"
                  className={category === itemCategory ? 'active' : ''}
                  onClick={() => setCategory(itemCategory)}
                >
                  {itemCategory === 'Drink' ? 'Drinks' : itemCategory}
                </button>
              ))}
            </div>
          </div>

          <div className="menu-list">
            <MenuSection title="Food" items={food} addToCart={addToCart} />
            <MenuSection title="Drinks" items={drinks} addToCart={addToCart} />
          </div>
        </div>

        <aside className="order-sidebar">
          <section className="order-history">
            <div className="section-heading">
              <h2>Order History</h2>
              <p>Your previous Chowly orders</p>
            </div>
            {orderHistory.length === 0 ? (
              <div className="empty-history">
                <p>No previous orders yet.</p>
              </div>
            ) : (
              <div className="history-list">
                {orderHistory.map((historyOrder) => (
                  <div className="history-card" key={historyOrder.id}>
                    <div className="history-card-top">
                      <div>
                        <h3>Order #{historyOrder.id}</h3>
                        <p>{new Date(historyOrder.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`history-status ${historyOrder.status}`}>
                        {historyOrder.status}
                      </span>
                    </div>
                    <div className="history-items">
                      {historyOrder.order_items?.map((item, index) => (
                        <div
                          className="history-item"
                          key={`${historyOrder.id}-${item.menu_items?.name || index}`}
                        >
                          <span>{item.quantity} × {item.menu_items?.name}</span>
                          <span>
                            ₦{(Number(item.price) * Number(item.quantity)).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="history-total">
                      <strong>Total</strong>
                      <strong>₦{Number(historyOrder.total_amount).toLocaleString()}</strong>
                    </div>
                    <div className="history-payment">
                      Payment:{' '}
                      <strong>
                        {historyOrder.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Cart
            cart={cart}
            total={getTotal()}
            waitingTime={getWaitingTime()}
            increaseQuantity={increaseQuantity}
            decreaseQuantity={decreaseQuantity}
            removeFromCart={removeFromCart}
            placeOrder={placeOrder}
          />
        </aside>
      </div>
    </section>
  );
}


/* =========================================
   MENU SECTION
========================================= */

const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1000&q=88',
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1000&q=88',
  'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=1000&q=88',
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1000&q=88',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=88',
  'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1000&q=88',
  'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=1000&q=88',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=88'
];

const DRINK_IMAGES = [
  'https://images.unsplash.com/photo-1629203849820-fdd70d49c38e?auto=format&fit=crop&w=900&q=88',
  'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=88',
  'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=900&q=88',
  'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=900&q=88',
  'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=900&q=88',
  'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=88',
  'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=88'
];

function getMenuImage(item, index = 0) {
  const name = String(item?.name || '').toLowerCase();
  const category = String(item?.category || '').toLowerCase();

  const matches = [
    ['jollof', FOOD_IMAGES[0]],
    ['fried rice', FOOD_IMAGES[1]],
    ['white rice', FOOD_IMAGES[1]],
    ['rice', FOOD_IMAGES[1]],
    ['grilled chicken', FOOD_IMAGES[2]],
    ['chicken', FOOD_IMAGES[2]],
    ['alfredo', FOOD_IMAGES[3]],
    ['pasta', FOOD_IMAGES[3]],
    ['spaghetti', FOOD_IMAGES[3]],
    ['burger', FOOD_IMAGES[4]],
    ['hamburger', FOOD_IMAGES[4]],
    ['pizza', FOOD_IMAGES[5]],
    ['fries', FOOD_IMAGES[6]],
    ['chips', FOOD_IMAGES[6]],
    ['salad', FOOD_IMAGES[7]],
    ['coke', DRINK_IMAGES[0]],
    ['cola', DRINK_IMAGES[0]],
    ['sprite', DRINK_IMAGES[0]],
    ['7up', DRINK_IMAGES[0]],
    ['orange juice', DRINK_IMAGES[1]],
    ['juice', DRINK_IMAGES[1]],
    ['smoothie', DRINK_IMAGES[2]],
    ['milkshake', DRINK_IMAGES[2]],
    ['water', DRINK_IMAGES[3]],
    ['latte', DRINK_IMAGES[4]],
    ['coffee', DRINK_IMAGES[4]],
    ['cappuccino', DRINK_IMAGES[4]],
    ['espresso', DRINK_IMAGES[4]],
    ['chapman', DRINK_IMAGES[5]],
    ['mocktail', DRINK_IMAGES[5]],
    ['cocktail', DRINK_IMAGES[5]]
  ];

  const matched = matches.find(([word]) => name.includes(word));
  if (matched) return matched[1];

  const images = category === 'drink' ? DRINK_IMAGES : FOOD_IMAGES;
  return images[index % images.length];
}

function MenuSection({ title, items, addToCart }) {
  const isFood = title.toLowerCase() === 'food';
  const fallback = isFood ? FOOD_IMAGES[0] : DRINK_IMAGES[0];

  return (
    <section className={`menu-section ${isFood ? 'food-section' : 'drink-section'}`}>
      <div className="section-title-row">
        <div>
          <h2>{title}</h2>
          <p>{isFood ? 'Freshly prepared meals' : 'Refreshing beverages'}</p>
        </div>
        <button className="view-all-button" type="button">
          View all <span>→</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="empty-menu">No {title.toLowerCase()} items found.</div>
      ) : (
        <div className="menu-grid">
          {items.map((item, index) => (
            <article className="menu-card" key={item.id}>
              <div className="menu-image-wrap">
                <img
                  src={getMenuImage(item, index)}
                  alt={item.name}
                  className="menu-image"
                  loading="eager"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = fallback;
                  }}
                />
              </div>
              <div className="menu-card-body">
                <h3>{item.name}</h3>
                <p className="prep-time">
                  Preparation time: {item.preparation_time} min
                </p>
                <div className="menu-card-bottom">
                  <strong className="menu-price">
                    ₦{Number(item.price).toLocaleString()}
                  </strong>
                  <button
                    className="add-button"
                    type="button"
                    onClick={() => addToCart(item)}
                  >
                    Add
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Cart({
  cart,
  total,
  waitingTime,
  increaseQuantity,
  decreaseQuantity,
  removeFromCart,
  placeOrder
}) {
  return (
    <aside className="cart">

      <div className="cart-header">
        <div>
          <span className="eyebrow">
            YOUR TABLE
          </span>
          <h2>Your Order</h2>
        </div>

        <span className="cart-count">
          {cart.length}
        </span>
      </div>

      {cart.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-icon">🛒</div>

          <h3>Your order is empty</h3>

          <p>
            Add food or drinks from the menu
            to get started.
          </p>
        </div>
      ) : (
        <>
          <div className="cart-items">

            {cart.map((item) => (
              <div
                className="cart-item"
                key={item.id}
              >

                <div>
                  <strong>{item.name}</strong>

                  <small>
                    ₦{Number(item.price).toLocaleString()}
                  </small>
                </div>

                <div className="quantity-controls">

                  <button
                    onClick={() =>
                      decreaseQuantity(item.id)
                    }
                  >
                    −
                  </button>

                  <span>{item.quantity}</span>

                  <button
                    onClick={() =>
                      increaseQuantity(item.id)
                    }
                  >
                    +
                  </button>

                </div>

                <button
                  className="remove-button"
                  onClick={() =>
                    removeFromCart(item.id)
                  }
                >
                  Remove
                </button>

              </div>
            ))}

          </div>

          <div className="cart-summary">

            <div>
              <span>Estimated wait</span>
              <strong>{waitingTime} minutes</strong>
            </div>

            <div>
              <span>Total</span>
              <strong>
                ₦{Number(total).toLocaleString()}
              </strong>
            </div>

          </div>

          <button
            className="primary-button full"
            onClick={placeOrder}
          >
            Place Order
          </button>

        </>
      )}

    </aside>
  );
}


/* =========================================
   CUSTOMER ORDER
========================================= */

function CustomerOrder({
  order,
  reloadOrder,
  backToMenu
}) {
  const [complaint, setComplaint] =
    useState(order.complaint || "");

  const [rating, setRating] =
    useState(order.rating || 0);

  const [savingFeedback, setSavingFeedback] =
    useState(false);

  const [paying, setPaying] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function submitFeedback() {
    if (!complaint && !rating) {
      setMessage(
        "Please provide a complaint or rating."
      );
      return;
    }

    setSavingFeedback(true);

    const { error } = await supabase
      .from("orders")
      .update({
        complaint: complaint || null,
        rating: rating || null
      })
      .eq("id", order.id);

    setSavingFeedback(false);

    if (error) {
      console.error(error);
      setMessage(
        "Could not save your feedback."
      );
      return;
    }

    setMessage(
      "Your feedback has been saved."
    );

    await reloadOrder();
  }

  async function makePayment() {
    setPaying(true);
    setMessage("Processing pretend payment...");

    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: "paid"
      })
      .eq("id", order.id);

    setPaying(false);

    if (error) {
      console.error(error);
      setMessage(
        "Payment could not be recorded."
      );
      return;
    }

    setMessage(
      "Pretend payment successful!"
    );

    await reloadOrder();
  }

  const statusLabel = {
    pending: "Order received",
    preparing: "Being prepared",
    served: "Served"
  };

  return (
    <section className="section">

      <div className="order-page">

        <div className="order-success">
          <span className="success-icon">✓</span>

          <span className="eyebrow">
            ORDER CONFIRMED
          </span>

          <h2>
            Order #{order.id}
          </h2>
          {order.table_number && (
            <p className="table-badge">
              Table {order.table_number}
            </p>
)}

          <p>
            Your order has been sent to the
            restaurant.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={backToMenu}
        >
          Back to Menu
        </button>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        <div className="order-status-card">

          <div className="status-header">
            <div>
              <span className="eyebrow">
                CURRENT STATUS
              </span>

              <h3>
                {statusLabel[order.status]}
              </h3>
            </div>

            <span
              className={`status ${order.status}`}
            >
              {order.status}
            </span>
          </div>

          <div className="progress">

            <div
              className={
                order.status === "pending" ||
                order.status === "preparing" ||
                order.status === "served"
                  ? "progress-step complete"
                  : "progress-step"
              }
            >
              <span>1</span>
              Order received
            </div>

            <div
              className={
                order.status === "preparing" ||
                order.status === "served"
                  ? "progress-step complete"
                  : "progress-step"
              }
            >
              <span>2</span>
              Preparing
            </div>

            <div
              className={
                order.status === "served"
                  ? "progress-step complete"
                  : "progress-step"
              }
            >
              <span>3</span>
              Served
            </div>

          </div>

        </div>

        <div className="order-details">

          <div className="card">

            <div className="section-heading">
              <h3>Order Details</h3>
            </div>

            {order.order_items?.map((item) => (
              <div
                className="detail-row"
                key={item.id}
              >
                <span>
                  {item.menu_items?.name}
                  {" × "}
                  {item.quantity}
                </span>

                <strong>
                  ₦
                  {Number(
                    item.price * item.quantity
                  ).toLocaleString()}
                </strong>
              </div>
            ))}

            <div className="total-row">
              <span>Total</span>

              <strong>
                ₦
                {Number(
                  order.total_amount
                ).toLocaleString()}
              </strong>
            </div>

          </div>


          <div className="card">

            <span className="eyebrow">
              ESTIMATED WAIT
            </span>

            <div className="waiting-time">
              {order.waiting_time}
              <span>min</span>
            </div>

            <div className="waiting-card">
              <span className="waiting-icon">⏱</span>

              <div>
                <strong>Estimated waiting time</strong>
                <p>
                  About {order.waiting_time} minutes
                </p>
              </div>
</div>



            {order.chef && (
              <p>
                Chef: {order.chef.name}
              </p>
            )}

            {order.bartender && (
              <p>
                Bartender: {order.bartender.name}
              </p>
            )}

          </div>

        </div>


        {order.status !== "served" && (
          <div className="card feedback-card">

            <span className="eyebrow">
              HAVING A PROBLEM?
            </span>

            <h3>
              Tell us if your order is delayed
            </h3>

            <textarea
              value={complaint}
              onChange={(event) =>
                setComplaint(event.target.value)
              }
              placeholder="Describe the problem..."
            />

            <div className="rating">

              <span>Rating</span>

              <div>
                {[1, 2, 3, 4, 5].map(
                  (number) => (
                    <button
                      key={number}
                      className={
                        number <= rating
                          ? "star selected"
                          : "star"
                      }
                      onClick={() =>
                        setRating(number)
                      }
                    >
                      ★
                    </button>
                  )
                )}
              </div>

            </div>

            <button
              className="secondary-button"
              onClick={submitFeedback}
              disabled={savingFeedback}
            >
              {savingFeedback
                ? "Saving..."
                : "Submit Feedback"}
            </button>

          </div>
        )}


        {order.status === "served" &&
          order.payment_status === "unpaid" && (
            <div className="payment-card">

              <span className="eyebrow">
                BEFORE YOU LEAVE
              </span>

              <h2>
                Ready to pay?
              </h2>

              <p>
                Your order has been served.
                Complete your payment before
                leaving the restaurant.
              </p>

              <div className="payment-amount">
                ₦
                {Number(
                  order.total_amount
                ).toLocaleString()}
              </div>

              <p className="pretend-label">
                This is a pretend payment.
                No real money will be charged.
              </p>

              <button
                className="primary-button"
                onClick={makePayment}
                disabled={paying}
              >
                {paying
                  ? "Processing..."
                  : "Confirm Pretend Payment"}
              </button>

            </div>
          )}


        {order.payment_status === "paid" && (
          <div className="paid-card">

            <div className="success-icon">
              ✓
            </div>

            <span className="eyebrow">
              PAYMENT COMPLETE
            </span>

            <h2>
              ₦
              {Number(
                order.total_amount
              ).toLocaleString()}
            </h2>

            <p>
              Your pretend payment has been
              successfully recorded.
            </p>

          </div>
        )}

      </div>

    </section>
  );
}


/* =========================================
   WAITER
========================================= */

function Waiter() {
  const [orders, setOrders] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedOrder, setSelectedOrder] =
    useState(null);

  const [chefId, setChefId] =
    useState("");

  const [bartenderId, setBartenderId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    loadData();

    const interval = setInterval(
      loadData,
      5000
    );

    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    const { data: orderData, error } =
      await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            *,
            menu_items (
              name
            )
          ),
          chef:staff!orders_chef_id_fkey (
            name
          ),
          bartender:staff!orders_bartender_id_fkey (
            name
          )
        `)
        .order("created_at", {
          ascending: false
        });

    if (error) {
      console.error(error);
      setMessage(
        "Could not load orders."
      );
    } else {
      setOrders(orderData);
    }


    const { data: staffData } =
      await supabase
        .from("staff")
        .select("*")
        .order("name");

    setStaff(staffData || []);
    setLoading(false);
  }

  function openOrder(order) {
    setSelectedOrder(order);

    setChefId(
      order.chef_id
        ? String(order.chef_id)
        : ""
    );

    setBartenderId(
      order.bartender_id
        ? String(order.bartender_id)
        : ""
    );
  }

  async function updateOrderStatus(newStatus) {
  if (!selectedOrder) {
    return;
  }

  const updates = {
    status: newStatus
  };

  // Chef and bartender are required before serving
  if (newStatus === "served") {
    if (!chefId || !bartenderId) {
      setMessage("Please assign both a chef and bartender.");
      return;
    }

    updates.chef_id = Number(chefId);
    updates.bartender_id = Number(bartenderId);
  }

  const { error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", selectedOrder.id);

  if (error) {
    console.error(error);
    setMessage("Could not update the order.");
    return;
  }

  setMessage(
    `Order #${selectedOrder.id} is now ${newStatus}.`
  );

  setSelectedOrder(null);
  await loadData();
}

  const chefs = staff.filter(
    (person) => person.role === "Chef"
  );

  const bartenders = staff.filter(
    (person) => person.role === "Bartender"
  );

  if (loading) {
    return (
      <section className="section">
        <div className="loading">
          Loading waiter dashboard...
        </div>
      </section>
    );
  }

  return (
    <section className="section">

      <div className="dashboard-header">

        <div>
          <span className="eyebrow">
            STAFF DASHBOARD
          </span>

          <h2>
            Today's Orders
          </h2>

          <p>
            Manage incoming restaurant orders.
          </p>
        </div>

        <div className="dashboard-stat">
          <strong>{orders.length}</strong>
          <span>Total Orders</span>
        </div>

      </div>

      {message && (
        <div className="message">
          {message}
        </div>
      )}

      <div className="orders-grid">

        {orders.length === 0 ? (
          <div className="empty-dashboard">
            <h3>
              No orders yet
            </h3>

            <p>
              New customer orders will appear here.
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <div
              className="order-card"
              key={order.id}
            >

              <div className="order-card-top">

                <div>
                  <span className="eyebrow">
                    ORDER
                  </span>

                  <h3>
                    #{order.id}
                  </h3>
                  {order.table_number && (
                    <p className="order-table">
                      Table {order.table_number}
                    </p>
)}
                </div>

                <span
                  className={`status ${order.status}`}
                >
                  {order.status}
                </span>

              </div>

              <div className="order-items">

                {order.order_items?.map(
                  (item) => (
                    <div
                      key={item.id}
                    >
                      {item.menu_items?.name}
                      {" × "}
                      {item.quantity}
                    </div>
                  )
                )}

              </div>

              <div className="order-card-bottom">

                <strong>
                  ₦
                  {Number(
                    order.total_amount
                  ).toLocaleString()}
                </strong>

                <button
                  className="secondary-button"
                  onClick={() =>
                    openOrder(order)
                  }
                >
                  Open Order
                </button>

              </div>

            </div>
          ))
        )}

      </div>


      {selectedOrder && (
        <div className="modal-overlay">

          <div className="modal">

            <button
              className="close-button"
              onClick={() =>
                setSelectedOrder(null)
              }
            >
              ×
            </button>

            <span className="eyebrow">
              ORDER #{selectedOrder.id}
            </span>

            <h2>
              Assign Order
            </h2>

            <div className="modal-items">

              {selectedOrder.order_items?.map(
                (item) => (
                  <div
                    className="detail-row"
                    key={item.id}
                  >
                    <span>
                      {item.menu_items?.name}
                      {" × "}
                      {item.quantity}
                    </span>

                    <strong>
                      ₦
                      {Number(
                        item.price *
                        item.quantity
                      ).toLocaleString()}
                    </strong>
                  </div>
                )
              )}

            </div>

            <label>
              Chef

              <select
                value={chefId}
                onChange={(event) =>
                  setChefId(event.target.value)
                }
              >
                <option value="">
                  Select chef
                </option>

                {chefs.map((chef) => (
                  <option
                    key={chef.id}
                    value={chef.id}
                  >
                    {chef.name}
                  </option>
                ))}
              </select>
            </label>


            <label>
              Bartender

              <select
                value={bartenderId}
                onChange={(event) =>
                  setBartenderId(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select bartender
                </option>

                {bartenders.map(
                  (bartender) => (
                    <option
                      key={bartender.id}
                      value={bartender.id}
                    >
                      {bartender.name}
                    </option>
                  )
                )}
              </select>
            </label>


            <div className="modal-total">

              <span>
                Order Total
              </span>

              <strong>
                ₦
                {Number(
                  selectedOrder.total_amount
                ).toLocaleString()}
              </strong>

            </div>


            {selectedOrder.status === "pending" && (
  <button
    className="primary-button"
    onClick={() => updateOrderStatus("preparing")}
  >
    Start Preparing
  </button>
)}

{selectedOrder.status === "preparing" && (
  <button
    className="primary-button"
    onClick={() => updateOrderStatus("served")}
  >
    Mark Order as Served
  </button>
)}

          </div>

        </div>
      )}

    </section>
  );
}


export default App;