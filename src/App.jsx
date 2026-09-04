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

  useEffect(() => {
    loadMenu();
    loadExistingOrder();
  }, []);

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
          payment_status: "unpaid"
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

      <div className="content-grid">

        <div>

          <MenuSection
            title="Food"
            items={food}
            addToCart={addToCart}
          />

          <MenuSection
            title="Drinks"
            items={drinks}
            addToCart={addToCart}
          />

        </div>

        <Cart
          cart={cart}
          total={getTotal()}
          waitingTime={getWaitingTime()}
          increaseQuantity={increaseQuantity}
          decreaseQuantity={decreaseQuantity}
          removeFromCart={removeFromCart}
          placeOrder={placeOrder}
        />

      </div>

    </section>
  );
}


/* =========================================
   MENU SECTION
========================================= */

function MenuSection({
  title,
  items,
  addToCart
}) {
  return (
    <div className="menu-section">

      <div className="section-heading">
        <h2>{title}</h2>
        <span>{items.length} items</span>
      </div>

      <div className="menu-grid">

        {items.map((item) => (
          <div
            className="menu-card"
            key={item.id}
          >
            <div className="food-icon">
              {item.category === "Food"
                ? "🍽️"
                : "🥤"}
            </div>

            <div className="menu-card-content">

              <h3>{item.name}</h3>

              <p>
                Preparation time:{" "}
                {item.preparation_time} min
              </p>

              <div className="menu-card-footer">

                <strong>
                  ₦{Number(item.price).toLocaleString()}
                </strong>

                <button
                  onClick={() => addToCart(item)}
                >
                  Add
                </button>

              </div>

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}


/* =========================================
   CART
========================================= */

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

  async function updateOrder() {
    if (!selectedOrder) {
      return;
    }

    if (!chefId || !bartenderId) {
      setMessage(
        "Please select both a chef and bartender."
      );
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({
        chef_id: Number(chefId),
        bartender_id: Number(bartenderId),
        status: "served"
      })
      .eq("id", selectedOrder.id);

    if (error) {
      console.error(error);
      setMessage(
        "Could not update the order."
      );
      return;
    }

    setMessage(
      `Order #${selectedOrder.id} has been marked as served.`
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


            <button
              className="primary-button full"
              onClick={updateOrder}
            >
              Assign Staff & Mark Served
            </button>

          </div>

        </div>
      )}

    </section>
  );
}


export default App;