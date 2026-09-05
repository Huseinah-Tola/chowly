import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import "./App.css";

import heroImage from "./assets/menu/hero.jpg";
import jollofRiceImage from "./assets/menu/jollof-rice.jpg";
import friedRiceImage from "./assets/menu/fried-rice.jpg";
import grilledChickenImage from "./assets/menu/grilled-chicken.jpg";
import pastaAlfredoImage from "./assets/menu/pasta-alfredo.jpg";
import beefBurgerImage from "./assets/menu/beef-burger.jpg";
import pizzaImage from "./assets/menu/pizza.jpg";
import cokeImage from "./assets/menu/coke.jpg";
import orangeJuiceImage from "./assets/menu/orange-juice.jpg";
import strawberrySmoothieImage from "./assets/menu/strawberry-smoothie.jpg";
import waterImage from "./assets/menu/water.jpg";
import latteImage from "./assets/menu/latte.jpg";
import spriteImage from "./assets/menu/sprite.svg";
import fantaImage from "./assets/menu/fanta.svg";
import sevenUpImage from "./assets/menu/seven-up.svg";
import chapmanImage from "./assets/menu/chapman.svg";
import milkshakeImage from "./assets/menu/milkshake.svg";

// Premium external product photography for the three branded soft drinks.
// Local SVG assets remain as fallbacks if an external image ever fails.
const PREMIUM_DRINK_IMAGES = {
  // High-resolution product photography. Local SVG/JPG assets are kept as fallbacks.
  coke: "https://images.unsplash.com/photo-1629019416996-712aa1bd87f4?fm=jpg&ixlib=rb-4.1.0&q=90&w=1600",
  fanta: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Fanta_Orange_Glass_Bottle.jpg",
  sprite: "https://assets.nextorder.co/public/6d5db421-93f1-4d5d-8761-3f2a3af83c99",
  chapman: "https://www.ikoyichapmans.co.uk/assets/img/cocktails/cocktails-1.png",
};

// Premium chicken shawarma photography so it never falls back to the Jollof Rice image.
const CHICKEN_SHAWARMA_IMAGE =
  "https://images.pexels.com/photos/29306505/pexels-photo-29306505.jpeg?cs=srgb&dl=pexels-nano-erdozain-120534369-29306505.jpg&fm=jpg";

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
  const [showAllFood, setShowAllFood] = useState(false);
  const [showAllDrinks, setShowAllDrinks] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

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
    } else if (error) {
      localStorage.removeItem("chowlyOrderId");
      setOrder(null);
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
      await supabase.from("orders").delete().eq("id", newOrder.id);
      setMessage("The order could not be completed. Please try again.");
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

      <div className="hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(249,241,227,.98) 0%, rgba(249,241,227,.92) 44%, rgba(249,241,227,.28) 74%, rgba(249,241,227,.04) 100%), url(${heroImage})` }}>
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
            <MenuSection
              title="Food"
              items={food}
              addToCart={addToCart}
              showAll={showAllFood}
              onToggle={() => setShowAllFood((value) => !value)}
            />
            <MenuSection
              title="Drinks"
              items={drinks}
              addToCart={addToCart}
              showAll={showAllDrinks}
              onToggle={() => setShowAllDrinks((value) => !value)}
            />
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
              <>
                <div className="history-actions">
                  <button
                    type="button"
                    className="view-all-button"
                    onClick={() => setShowAllHistory((value) => !value)}
                  >
                    {showAllHistory ? "Show recent" : "View all"} <span>→</span>
                  </button>
                </div>
                <div className="history-list">
                {orderHistory
                  .filter((historyOrder) => !order || historyOrder.id !== order.id)
                  .slice(0, showAllHistory ? undefined : 3)
                  .map((historyOrder) => (
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
              </>
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

const MENU_IMAGES = {
  jollof: jollofRiceImage,
  friedRice: friedRiceImage,
  grilledChicken: grilledChickenImage,
  pasta: pastaAlfredoImage,
  burger: beefBurgerImage,
  pizza: pizzaImage,
  coke: PREMIUM_DRINK_IMAGES.coke,
  chickenShawarma: CHICKEN_SHAWARMA_IMAGE,
  orangeJuice: orangeJuiceImage,
  smoothie: strawberrySmoothieImage,
  water: waterImage,
  latte: latteImage
};

// Exact drink images for common restaurant drinks. These are only used when the
// database item name clearly matches the drink; otherwise we use the local assets.
const DRINK_IMAGES = {
  sprite: PREMIUM_DRINK_IMAGES.sprite,
  fanta: PREMIUM_DRINK_IMAGES.fanta,
  sevenUp: sevenUpImage,
  chapman: PREMIUM_DRINK_IMAGES.chapman,
  milkshake: milkshakeImage
};

function getMenuImage(item) {
  const name = String(item?.name || "").toLowerCase().trim();
  const category = String(item?.category || "").toLowerCase().trim();

  if (name.includes("jollof")) return MENU_IMAGES.jollof;
  if (name.includes("fried rice")) return MENU_IMAGES.friedRice;
  if (name.includes("grilled chicken")) return MENU_IMAGES.grilledChicken;
  if (name.includes("shawarma")) return MENU_IMAGES.chickenShawarma;
  if (name.includes("alfredo")) return MENU_IMAGES.pasta;
  if (name.includes("pasta")) return MENU_IMAGES.pasta;
  if (name.includes("spaghetti")) return MENU_IMAGES.pasta;
  if (name.includes("burger")) return MENU_IMAGES.burger;
  if (name.includes("pizza")) return MENU_IMAGES.pizza;

  if (name.includes("coke") || name.includes("coca")) return MENU_IMAGES.coke;
  if (name.includes("sprite")) return DRINK_IMAGES.sprite;
  if (name.includes("fanta")) return DRINK_IMAGES.fanta;
  if (name.includes("7up") || name.includes("7 up") || name.includes("seven up")) return DRINK_IMAGES.sevenUp;
  if (name.includes("chapman")) return DRINK_IMAGES.chapman;
  if (name.includes("milkshake") || name.includes("milk shake")) return DRINK_IMAGES.milkshake;
  if (name.includes("orange juice")) return MENU_IMAGES.orangeJuice;
  if (name === "juice" || name.includes("fruit juice")) return MENU_IMAGES.orangeJuice;
  if (name.includes("strawberry") || name.includes("smoothie")) return MENU_IMAGES.smoothie;
  if (name.includes("water")) return MENU_IMAGES.water;
  if (name.includes("latte") || name.includes("coffee") || name.includes("cappuccino") || name.includes("espresso")) return MENU_IMAGES.latte;

  return category === "drink" ? MENU_IMAGES.water : MENU_IMAGES.jollof;
}

function categoryFallbackImage(item) {
  const name = String(item?.name || "").toLowerCase().trim();
  const category = String(item?.category || "").toLowerCase();

  // Keep the correct local image as a safety net if an external premium image is unavailable.
  if (name.includes("coke") || name.includes("coca")) return cokeImage;
  if (name.includes("sprite")) return spriteImage;
  if (name.includes("fanta")) return fantaImage;
  if (name.includes("shawarma")) return MENU_IMAGES.chickenShawarma;
  if (name.includes("7up") || name.includes("7 up") || name.includes("seven up")) return sevenUpImage;
  if (name.includes("chapman")) return chapmanImage;
  if (name.includes("milkshake") || name.includes("milk shake")) return milkshakeImage;

  return category === "drink" ? MENU_IMAGES.water : MENU_IMAGES.jollof;
}

function MenuSection({ title, items, addToCart, showAll, onToggle }) {
  const isFood = title.toLowerCase() === "food";
  const initialCount = isFood ? 4 : 5;
  const visibleItems = showAll ? items : items.slice(0, initialCount);
  const hasMore = items.length > initialCount;

  return (
    <section className={`menu-section ${isFood ? "food-section" : "drink-section"}`}>
      <div className="section-title-row">
        <div>
          <span className="section-eyebrow">{isFood ? "OUR MENU" : "SOMETHING TO SIP"}</span>
          <h2>{title}</h2>
          <p>{isFood ? "Freshly prepared favourites" : "Refreshing drinks and beverages"}</p>
        </div>

        {hasMore && (
          <button className="view-all-button" type="button" onClick={onToggle}>
            {showAll ? "Show less" : "View all"}
            <span aria-hidden="true">{showAll ? "↑" : "→"}</span>
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-menu">No {title.toLowerCase()} items found.</div>
      ) : (
        <div className="menu-grid">
          {visibleItems.map((item) => {
            const image = getMenuImage(item);

            return (
              <article className="menu-card" key={item.id}>
                <div className="menu-image-wrap">
                  <img
                    src={image}
                    alt={item.name}
                    className={`menu-image ${item.category === "Drink" ? "drink-image" : ""}`}
                    loading="eager"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = categoryFallbackImage(item);
                    }}
                  />
                </div>

                <div className="menu-card-body">
                  <div className="menu-card-copy">
                    <h3>{item.name}</h3>
                    <p className="prep-time">{Number(item.preparation_time) || 0} min preparation</p>
                  </div>

                  <div className="menu-card-bottom">
                    <strong className="menu-price">
                      ₦{Number(item.price).toLocaleString()}
                    </strong>
                    <button
                      className="add-button"
                      type="button"
                      onClick={() => addToCart(item)}
                    >
                      Add <span>+</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
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
          <div className="empty-cart-symbol">+</div>

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

                <img
                  src={getMenuImage(item)}
                  alt={item.name}
                  className="cart-item-image"
                  loading="lazy"
                />

                <div className="cart-item-info">
                  <strong>{item.name}</strong>
                  <span>₦{Number(item.price).toLocaleString()}</span>
                  <div className="quantity-controls">
                    <button type="button" onClick={() => decreaseQuantity(item.id)}>−</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => increaseQuantity(item.id)}>+</button>
                  </div>
                </div>

<button type="button" className="remove-button" aria-label={`Remove ${item.name}`} onClick={() => removeFromCart(item.id)}>×</button>

              </div>
            ))}

          </div>

          <div className="cart-summary">
            <div className="wait-row">
              <span>Estimated wait</span>
              <strong>{waitingTime} min</strong>
            </div>
            <div className="total-row-cart">
              <span>Total</span>
              <strong>₦{Number(total).toLocaleString()}</strong>
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

  useEffect(() => {
    setComplaint(order.complaint || "");
    setRating(order.rating || 0);
  }, [order.complaint, order.rating]);

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
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [chefId, setChefId] = useState("");
  const [bartenderId, setBartenderId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          menu_items (name)
        ),
        chef:staff!orders_chef_id_fkey (name),
        bartender:staff!orders_bartender_id_fkey (name)
      `)
      .order("created_at", { ascending: false });

    if (orderError) {
      console.error(orderError);
      setMessage("Could not load orders. Please check your Supabase connection.");
    } else {
      setOrders(orderData || []);
    }

    const { data: staffData, error: staffError } = await supabase
      .from("staff")
      .select("*")
      .order("name");

    if (staffError) {
      console.error(staffError);
    } else {
      setStaff(staffData || []);
    }

    setLoading(false);
  }

  function openOrder(order) {
    setSelectedOrder(order);
    setChefId(order.chef_id ? String(order.chef_id) : "");
    setBartenderId(order.bartender_id ? String(order.bartender_id) : "");
    setMessage("");
  }

  async function saveAssignments() {
    if (!selectedOrder) return;

    if (!chefId || !bartenderId) {
      setMessage("Please select both a chef and bartender.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("orders")
      .update({
        chef_id: Number(chefId),
        bartender_id: Number(bartenderId)
      })
      .eq("id", selectedOrder.id);
    setSaving(false);

    if (error) {
      console.error(error);
      setMessage("Could not save the staff assignment.");
      return;
    }

    setMessage(`Staff assigned to order #${selectedOrder.id}.`);
    await loadData();
    setSelectedOrder((current) => current ? {
      ...current,
      chef_id: Number(chefId),
      bartender_id: Number(bartenderId)
    } : null);
  }

  async function updateOrderStatus(newStatus) {
    if (!selectedOrder) return;

    if (!chefId || !bartenderId) {
      setMessage("Please select both a chef and bartender before changing the order status.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("orders")
      .update({
        status: newStatus,
        chef_id: Number(chefId),
        bartender_id: Number(bartenderId)
      })
      .eq("id", selectedOrder.id);
    setSaving(false);

    if (error) {
      console.error(error);
      setMessage("Could not update the order. Please try again.");
      return;
    }

    setSelectedOrder(null);
    setMessage(`Order #${selectedOrder.id} is now ${newStatus}.`);
    await loadData();
  }

  const chefs = staff.filter(
    (person) => String(person.role || "").toLowerCase() === "chef"
  );

  const bartenders = staff.filter(
    (person) => String(person.role || "").toLowerCase() === "bartender"
  );

  const counts = {
    all: orders.length,
    pending: orders.filter((order) => order.status === "pending").length,
    preparing: orders.filter((order) => order.status === "preparing").length,
    served: orders.filter((order) => order.status === "served").length
  };

  const visibleOrders = filter === "all"
    ? orders
    : orders.filter((order) => order.status === filter);

  if (loading) {
    return (
      <section className="section">
        <div className="loading">Loading waiter dashboard...</div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">STAFF DASHBOARD</span>
          <h2>Active Orders</h2>
          <p>Manage and track all customer orders in real time.</p>
        </div>
        <div className="dashboard-stat">
          <strong>{orders.length}</strong>
          <span>Total Orders</span>
        </div>
      </div>

      {message && <div className="message">{message}</div>}

      <div className="order-filters" role="tablist" aria-label="Order status filters">
        {[
          ["all", "All"],
          ["pending", "Pending"],
          ["preparing", "Preparing"],
          ["served", "Served"]
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={filter === value ? "active" : ""}
            onClick={() => setFilter(value)}
          >
            {label} <span>({counts[value]})</span>
          </button>
        ))}
      </div>

      <div className="orders-list">
        {visibleOrders.length === 0 ? (
          <div className="empty-dashboard">
            <h3>No {filter === "all" ? "orders" : filter + " orders"} found</h3>
            <p>New customer orders will appear here automatically.</p>
          </div>
        ) : (
          visibleOrders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="order-card-top">
                <div>
                  <span className="eyebrow">ORDER #{order.id}</span>
                  <h3>{order.table_number ? `Table ${order.table_number}` : "Table not selected"}</h3>
                  <p className="order-date">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`status ${order.status}`}>{order.status}</span>
              </div>

              <div className="order-items">
                {order.order_items?.map((item) => (
                  <div className="order-item-line" key={item.id}>
                    <span>{item.quantity} × {item.menu_items?.name || "Menu item"}</span>
                    <span>₦{(Number(item.price) * Number(item.quantity)).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="order-total-line">
                <strong>Total</strong>
                <strong>₦{Number(order.total_amount).toLocaleString()}</strong>
              </div>

              <div className="assigned-staff">
                <span>Chef: {order.chef?.name || "—"}</span>
                <span>Bartender: {order.bartender?.name || "—"}</span>
              </div>

              <button
                type="button"
                className="add-button waiter-open-button"
                onClick={() => openOrder(order)}
              >
                <span aria-hidden="true">🍴</span>
                Open Order
              </button>
            </article>
          ))
        )}
      </div>

      {selectedOrder && (
        <div className="order-modal-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setSelectedOrder(null);
        }}>
          <div className="order-modal" role="dialog" aria-modal="true" aria-labelledby="order-modal-title">
            <button
              className="modal-close"
              type="button"
              onClick={() => !saving && setSelectedOrder(null)}
              aria-label="Close order"
            >×</button>

            <span className="eyebrow">ORDER #{selectedOrder.id}</span>
            <h2 id="order-modal-title">Manage Order</h2>

            <div className="modal-order-meta">
              <strong>{selectedOrder.table_number ? `Table ${selectedOrder.table_number}` : "Table not selected"}</strong>
              <span className={`status ${selectedOrder.status}`}>{selectedOrder.status}</span>
            </div>

            <div className="modal-items">
              {selectedOrder.order_items?.map((item) => (
                <div className="detail-row" key={item.id}>
                  <span>{item.menu_items?.name || "Menu item"} × {item.quantity}</span>
                  <strong>₦{(Number(item.price) * Number(item.quantity)).toLocaleString()}</strong>
                </div>
              ))}
            </div>

            <label htmlFor="chef-select">Chef</label>
            <select id="chef-select" value={chefId} onChange={(event) => setChefId(event.target.value)}>
              <option value="">Select chef</option>
              {chefs.map((chef) => (
                <option key={chef.id} value={chef.id}>{chef.name}</option>
              ))}
            </select>

            <label htmlFor="bartender-select">Bartender</label>
            <select id="bartender-select" value={bartenderId} onChange={(event) => setBartenderId(event.target.value)}>
              <option value="">Select bartender</option>
              {bartenders.map((bartender) => (
                <option key={bartender.id} value={bartender.id}>{bartender.name}</option>
              ))}
            </select>

            <div className="modal-total">
              <span>Order Total</span>
              <strong>₦{Number(selectedOrder.total_amount).toLocaleString()}</strong>
            </div>

            <div className="order-modal-actions">
              <button className="secondary-button" type="button" onClick={saveAssignments} disabled={saving}>
                {saving ? "Saving..." : "Save Assignment"}
              </button>

              {selectedOrder.status === "pending" && (
                <button className="primary-button" type="button" onClick={() => updateOrderStatus("preparing")} disabled={saving}>
                  Start Preparing
                </button>
              )}

              {selectedOrder.status === "preparing" && (
                <button className="primary-button" type="button" onClick={() => updateOrderStatus("served")} disabled={saving}>
                  Mark as Served
                </button>
              )}

              {selectedOrder.status === "served" && (
                <button className="secondary-button" type="button" onClick={() => setSelectedOrder(null)} disabled={saving}>
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default App;