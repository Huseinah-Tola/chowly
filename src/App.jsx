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
import cokePremiumImage from "./assets/menu/coke-premium.jpg";
import fantaImage from "./assets/menu/fanta-premium.jpg";
import spritePremiumImage from "./assets/menu/sprite-premium.jpg";
import spriteImage from "./assets/menu/sprite.svg";
import sevenUpImage from "./assets/menu/seven-up.svg";
import chapmanImage from "./assets/menu/chapman.svg";
import milkshakeImage from "./assets/menu/milkshake.svg";

// Premium external product photography for the three branded soft drinks.
// Local SVG assets remain as fallbacks if an external image ever fails.
const PREMIUM_DRINK_IMAGES = {
  coke: cokePremiumImage,
  fanta: fantaImage,
  sprite: spritePremiumImage,
  chapman: chapmanImage
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
  const [viewingHistoryOrder, setViewingHistoryOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("All");
  const [orderHistory, setOrderHistory] = useState([]);
  const [tableNumber, setTableNumber] = useState("");
  const [showAllFood, setShowAllFood] = useState(false);
  const [showAllDrinks, setShowAllDrinks] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showTablePopup, setShowTablePopup] = useState(false);

  useEffect(() => {
    loadMenu();
    loadExistingOrder();
    loadOrderHistory();
  }, []);

  async function loadOrderById(orderId) {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          menu_items (name, category)
        ),
        chef:staff!orders_chef_id_fkey (name),
        bartender:staff!orders_bartender_id_fkey (name)
      `)
      .eq("id", orderId)
      .single();

    if (error) {
      console.error(error);
      return null;
    }

    return data;
  }

  async function loadOrderHistory() {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          quantity,
          price,
          menu_items (name)
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
      setMenu(data || []);
    }

    setLoading(false);
  }

  async function loadExistingOrder() {
    const savedOrderId = localStorage.getItem("chowlyOrderId");

    if (!savedOrderId) return;

    const data = await loadOrderById(savedOrderId);

    if (data) {
      setOrder(data);
    } else {
      localStorage.removeItem("chowlyOrderId");
      setOrder(null);
    }
  }

  async function openHistoryOrder(orderId) {
    setMessage("");
    const fullOrder = await loadOrderById(orderId);

    if (!fullOrder) {
      setMessage("Could not open this order. Please try again.");
      return;
    }

    setViewingHistoryOrder(fullOrder);
  }


  function addToCart(item) {
    const existing = cart.find((cartItem) => cartItem.id === item.id);

    if (existing) {
      setCart(
        cart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      );
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  }

  function increaseQuantity(id) {
    setCart(
      cart.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  }

  function decreaseQuantity(id) {
    setCart(
      cart
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(id) {
    setCart(cart.filter((item) => item.id !== id));
  }

  function getTotal() {
    return cart.reduce(
      (total, item) => total + Number(item.price) * item.quantity,
      0
    );
  }

  function getWaitingTime() {
    if (cart.length === 0) return 0;
    return Math.max(...cart.map((item) => Number(item.preparation_time) || 0));
  }

  async function placeOrder() {
    if (!tableNumber) {
      setShowTablePopup(true);
      return;
    }

    if (cart.length === 0) {
      setMessage("Please add something to your order.");
      return;
    }

    setMessage("Placing your order...");

    const total = getTotal();
    const waitingTime = getWaitingTime();

    const { data: newOrder, error: orderError } = await supabase
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
      setMessage("There was a problem creating the order.");
      return;
    }

    const orderItems = cart.map((item) => ({
      order_id: newOrder.id,
      menu_item_id: item.id,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error(itemsError);
      await supabase.from("orders").delete().eq("id", newOrder.id);
      setMessage("The order could not be completed. Please try again.");
      return;
    }

    localStorage.setItem("chowlyOrderId", newOrder.id);
    setCart([]);
    setMessage("");
    await loadExistingOrder();
    await loadOrderHistory();
  }

  function backToMenu() {
    localStorage.removeItem("chowlyOrderId");
    setOrder(null);
    setViewingHistoryOrder(null);
    setCart([]);
    setMessage("");
    loadOrderHistory();
  }

  function reloadCurrentOrder() {
    if (order?.id) return loadOrderById(order.id).then((data) => data && setOrder(data));
  }

  function reloadHistoryOrder() {
    if (viewingHistoryOrder?.id) {
      return loadOrderById(viewingHistoryOrder.id).then((data) => data && setViewingHistoryOrder(data));
    }
  }

  if (loading) {
    return (
      <section className="section">
        <div className="loading">Loading Chowly menu...</div>
      </section>
    );
  }

  if (viewingHistoryOrder) {
    return (
      <CustomerOrder
        order={viewingHistoryOrder}
        reloadOrder={reloadHistoryOrder}
        backToMenu={() => setViewingHistoryOrder(null)}
        isHistoryView={true}
      />
    );
  }

  if (order) {
    return (
      <CustomerOrder
        order={order}
        reloadOrder={reloadCurrentOrder}
        backToMenu={backToMenu}
        isHistoryView={false}
      />
    );
  }

  const filteredMenu = menu.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === "All" || item.category === category;
    return matchesSearch && matchesCategory;
  });

  const food = filteredMenu.filter((item) => item.category === "Food");
  const drinks = filteredMenu.filter((item) => item.category === "Drink");

  return (
    <section className="section">
      <div
        className="hero"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(249,241,227,.98) 0%, rgba(249,241,227,.92) 44%, rgba(249,241,227,.28) 74%, rgba(249,241,227,.04) 100%), url(${heroImage})`
        }}
      >
        <div>
          <span className="eyebrow">WELCOME TO CHOWLY</span>
          <h2>Good food.<br />Less waiting.</h2>
          <p>Browse our menu, place your order and track it from preparation to payment.</p>
        </div>
      </div>

      {message && <div className="message">{message}</div>}

      <div className="customer-layout">
        <div className="menu-column">
          <div className="table-selector">
            <label htmlFor="tableNumber">Table Number</label>
            <select id="tableNumber" value={tableNumber} onChange={(event) => {
              setTableNumber(event.target.value);
              if (event.target.value) {
                setShowTablePopup(false);
              }
            }}>
              <option value="">Select your table</option>
              {Array.from({ length: 20 }, (_, index) => (
                <option key={index + 1} value={index + 1}>Table {index + 1}</option>
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
            <MenuSection title="Food" items={food} addToCart={addToCart} menu={menu} showAll={showAllFood} onToggle={() => setShowAllFood((value) => !value)} />
            <MenuSection title="Drinks" items={drinks} addToCart={addToCart} menu={menu} showAll={showAllDrinks} onToggle={() => setShowAllDrinks((value) => !value)} />
          </div>
        </div>

        <aside className="order-sidebar">
          <section className="order-history">
            <div className="section-heading">
              <div>
                <h2>Order History</h2>
                <p>Click an order to see its details, feedback and payment.</p>
              </div>
            </div>

            {orderHistory.length === 0 ? (
              <div className="empty-history"><p>No previous orders yet.</p></div>
            ) : (
              <>
                <div className="history-toolbar">
                  <button
                    type="button"
                    className="view-all-button"
                    onClick={() => setShowAllHistory((value) => !value)}
                  >
                    {showAllHistory ? "Show recent" : "View all"} <span>{showAllHistory ? "↑" : "→"}</span>
                  </button>
                </div>

                <div className="history-list">
                  {orderHistory
                    .slice(0, showAllHistory ? undefined : 3)
                    .map((historyOrder) => (
                      <button
                        className="history-card history-card-button"
                        key={historyOrder.id}
                        type="button"
                        onClick={() => openHistoryOrder(historyOrder.id)}
                      >
                        <div className="history-card-top">
                          <div>
                            <h3>Order #{historyOrder.id}</h3>
                            <p>{new Date(historyOrder.created_at).toLocaleString()}</p>
                          </div>
                          <span className={`history-status ${historyOrder.status}`}>{historyOrder.status}</span>
                        </div>

                        <div className="history-items">
                          {historyOrder.order_items?.map((item, index) => (
                            <div className="history-item" key={`${historyOrder.id}-${item.menu_items?.name || index}`}>
                              <span>{item.quantity} × {item.menu_items?.name}</span>
                              <span>₦{(Number(item.price) * Number(item.quantity)).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>

                        <div className="history-total">
                          <strong>Total</strong>
                          <strong>₦{Number(historyOrder.total_amount).toLocaleString()}</strong>
                        </div>

                        <div className="history-meta-row">
                          <span>Payment</span>
                          <strong>{historyOrder.payment_status === "paid" ? "Paid" : "Unpaid"}</strong>
                        </div>

                        <div className="history-feedback-preview">
                          <span>
                            {historyOrder.rating ? `${"★".repeat(Number(historyOrder.rating))}${"☆".repeat(5 - Number(historyOrder.rating))}` : "No rating yet"}
                          </span>
                          <span>{historyOrder.complaint ? "Feedback submitted" : "View order →"}</span>
                        </div>
                      </button>
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

       {showTablePopup && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99999,
      padding: "20px",
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: "420px",
        backgroundColor: "#fffaf2",
        borderRadius: "20px",
        padding: "35px 30px",
        textAlign: "center",
        boxShadow: "0 25px 70px rgba(0, 0, 0, 0.35)",
        border: "2px solid #dca63b",
      }}
    >
      <div
        style={{
          fontSize: "45px",
          marginBottom: "15px",
        }}
      >
        🍽️
      </div>

      <h2
        style={{
          margin: "0 0 12px",
          color: "#321b0f",
          fontSize: "25px",
        }}
      >
        Table Number Required
      </h2>

      <p
        style={{
          color: "#725f50",
          fontSize: "16px",
          lineHeight: "1.6",
          marginBottom: "25px",
        }}
      >
        Please select your table number before placing your order.
      </p>

      <button
        type="button"
        onClick={() => {
          setShowTablePopup(false);

          setTimeout(() => {
            document
              .getElementById("tableNumber")
              ?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
          }, 100);
        }}
        style={{
          width: "100%",
          padding: "14px",
          border: "none",
          borderRadius: "10px",
          backgroundColor: "#dca63b",
          color: "#261507",
          fontSize: "16px",
          fontWeight: "700",
          cursor: "pointer",
        }}
      >
        Select Table
      </button>
    </div>
  </div>
)}

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
  if (name.includes("fanta")) return fantaImage;
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

function MenuSection({ title, items, addToCart, showAll, onToggle, menu }) {
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
                    <div className="menu-name-row">

  <h3>{item.name}</h3>

  {["jollof", "shawarma", "burger"].some((word) =>
    item.name.toLowerCase().includes(word)
  ) && (
    <span className="popular-badge">
      ★ Popular
    </span>
  )}

</div>
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
                  {isFood && (
  <div className="menu-recommendation">
    <div>
      <span>Complete your meal</span>
      <small>Choose a drink to add to your order</small>
    </div>

    <div className="drink-recommendation">
      <select
        defaultValue=""
        onChange={(event) => {
          const drink = menu.find(
            (item) => String(item.id) === event.target.value
          );

          if (drink) {
            addToCart(drink);
            event.target.value = "";
          }
        }}
      >
        <option value="" disabled>
          Choose a drink
        </option>

        {menu
          .filter((item) => item.category === "Drink" && item.available)
          .map((drink) => (
            <option key={drink.id} value={drink.id}>
              {drink.name} — ₦{Number(drink.price).toLocaleString()}
            </option>
          ))}
      </select>
    </div>
  </div>
)}
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
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = categoryFallbackImage(item);
                  }}
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
  backToMenu,
  isHistoryView = false
}) {
  const [complaint, setComplaint] = useState(order.complaint || "");
  const [rating, setRating] = useState(Number(order.rating) || 0);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [message, setMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
  const timer = setInterval(() => {
    setCurrentTime(Date.now());
  }, 60000);

  return () => clearInterval(timer);
}, []);
  const elapsedMinutes = order
  ? Math.floor(
      (currentTime - new Date(order.created_at).getTime()) / 60000
    )
  : 0;

const delayMinutes = order
  ? Math.max(
      0,
      elapsedMinutes - Number(order.waiting_time || 0)
    )
  : 0;

const delayMessage =
  order?.status === "served"
    ? "Your order has been served."
    : delayMinutes > 0
    ? `Your order is running ${delayMinutes} minute${
          delayMinutes === 1 ? "" : "s"
        } late.`
      : elapsedMinutes >=
        Math.max(1, Number(order?.waiting_time || 0) - 5)
        ? "Your order should be ready soon."
        : "Your order is on schedule.";

  useEffect(() => {
  if (order.status === "pending") {
    setStatusMessage("Your order has been received by the restaurant.");
  }

  if (order.status === "preparing") {
    setStatusMessage("Your order is now being prepared.");
  }

  if (order.status === "served") {
    setStatusMessage("Your order is ready. Enjoy your meal!");
  }
}, [order.status]);

  useEffect(() => {
    setComplaint(order.complaint || "");
    setRating(Number(order.rating) || 0);
  }, [order.complaint, order.rating]);

  async function submitFeedback() {
    if (!complaint.trim() && !rating) {
      setMessage("Please provide a complaint or rating.");
      return;
    }

    setSavingFeedback(true);
    setMessage("");

    const { error } = await supabase
      .from("orders")
      .update({
        complaint: complaint.trim() || null,
        rating: rating || null
      })
      .eq("id", order.id);

    setSavingFeedback(false);

    if (error) {
      console.error(error);
      setMessage("Could not save your feedback.");
      return;
    }

    setMessage("Your feedback has been saved and is visible below.");
    await reloadOrder();
  }

  async function makePretendPayment() {
    if (order.payment_status === "paid") return;

    setSavingPayment(true);
    setMessage("");

    const { error } = await supabase
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("id", order.id);

    setSavingPayment(false);

    if (error) {
      console.error(error);
      setMessage("Could not record the demo payment.");
      return;
    }

    setMessage("Demo payment recorded successfully.");
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
        <div className="order-page-actions">
          <button className="secondary-button" type="button" onClick={backToMenu}>
            {isHistoryView ? "← Back to Order History" : "← Back to Menu"}
          </button>
        </div>

        {message && <div className="message">{message}</div>}
        {statusMessage && (
  <div className={`status-notification ${order.status}`}>
    <span>
      {order.status === "served"
        ? "✓"
        : order.status === "preparing"
        ? "◷"
        : "✓"}
    </span>

    <div>
      <strong>
        {order.status === "served"
          ? "Order ready"
          : order.status === "preparing"
          ? "Order in preparation"
          : "Order received"}
      </strong>

      <p>{statusMessage}</p>
    </div>
  </div>
)}

        <div className="order-success">
          <span className="success-icon">✓</span>
          <span className="eyebrow">ORDER CONFIRMATION</span>
          <h2>Order #{order.id}</h2>
          {order.table_number && <p className="table-badge">Table {order.table_number}</p>}
          <p>{isHistoryView ? "Here are the details from this previous Chowly order." : "Your order has been sent to the restaurant."}</p>
        </div>

        <div className="order-status-card">
          <div className="status-header">
            <div>
              <span className="eyebrow">CURRENT STATUS</span>
              <h3>{statusLabel[order.status] || order.status}</h3>
            </div>
            <span className={`status ${order.status}`}>{order.status}</span>
          </div>

          <div className="progress">
            <div className={`progress-step ${["pending", "preparing", "served"].includes(order.status) ? "complete" : ""}`}>
              <span>1</span>Order received
            </div>
            <div className={`progress-step ${["preparing", "served"].includes(order.status) ? "complete" : ""}`}>
              <span>2</span>Preparing
            </div>
            <div className={`progress-step ${order.status === "served" ? "complete" : ""}`}>
              <span>3</span>Served
            </div>
          </div>
          <div className={`delay-status ${delayMinutes > 0 ? "delayed" : ""}`}>
  <span className="delay-status-icon">
    {delayMinutes > 0 ? "⚠️" : "✓"}
  </span>

  <div>
    <strong>{delayMessage}</strong>

    {delayMinutes > 0 && (
      <p>
        We apologise for the delay. Thank you for your patience.
      </p>
    )}
  </div>
</div>
        </div>

        <div className="order-details">
          <div className="card">
            <div className="section-heading"><h3>Order Details</h3></div>
            {order.order_items?.map((item) => (
              <div className="detail-row" key={item.id}>
                <span>{item.menu_items?.name} × {item.quantity}</span>
                <strong>₦{(Number(item.price) * Number(item.quantity)).toLocaleString()}</strong>
              </div>
            ))}
            <div className="total-row">
              <span>Total</span>
              <strong>₦{Number(order.total_amount).toLocaleString()}</strong>
            </div>
          </div>

          <div className="card">
            <span className="eyebrow">ESTIMATED WAIT</span>
            <div className="waiting-experience">

  <div className="waiting-number">
    <span className="eyebrow">ESTIMATED WAIT</span>

    <div className="waiting-time">
      {order.waiting_time}
      <span>min</span>
    </div>
  </div>

  <div className="waiting-message">
    {order.status === "pending" && (
      <>
        <strong>Your order has been received.</strong>
        <p>The restaurant is getting everything ready.</p>
      </>
    )}

    {order.status === "preparing" && (
      <>
        <strong>Your order is being prepared.</strong>
        <p>Our kitchen and bar are working on your order.</p>
      </>
    )}

    {order.status === "served" && (
      <>
        <strong>Your order is ready.</strong>
        <p>Enjoy your meal. Thank you for dining with Chowly.</p>
      </>
    )}
  </div>

</div>
            <div className="waiting-card">
              <span className="waiting-icon">⏱</span>
              <div><strong>Estimated waiting time</strong><p>About {order.waiting_time} minutes</p></div>
            </div>
            {order.chef && <p>Chef: {order.chef.name}</p>}
            {order.bartender && <p>Bartender: {order.bartender.name}</p>}
          </div>
        </div>

        <div className="card feedback-card">
          <span className="eyebrow">FEEDBACK & RATING</span>
          <h3>How was your Chowly experience?</h3>

          <div className="rating">
            <span>Your rating</span>
            <div aria-label="Rating from 1 to 5 stars">
              {[1, 2, 3, 4, 5].map((number) => (
                <button
                  key={number}
                  type="button"
                  className={number <= rating ? "star selected" : "star"}
                  onClick={() => setRating(number)}
                  aria-label={`${number} star${number > 1 ? "s" : ""}`}
                >★</button>
              ))}
            </div>
          </div>

          <textarea
            value={complaint}
            onChange={(event) => setComplaint(event.target.value)}
            placeholder="Tell us what went well or describe any problem..."
          />

          <button className="primary-button" type="button" onClick={submitFeedback} disabled={savingFeedback}>
            {savingFeedback ? "Saving..." : "Submit Feedback"}
          </button>

          {(order.rating || order.complaint) && (
            <div className="saved-feedback">
              <div className="saved-feedback-heading">
                <span className="eyebrow">YOUR SAVED FEEDBACK</span>
                <span className="saved-stars">
                  {order.rating ? `${"★".repeat(Number(order.rating))}${"☆".repeat(5 - Number(order.rating))}` : "No rating"}
                </span>
              </div>
              {order.complaint ? <p>{order.complaint}</p> : <p>No written feedback was submitted.</p>}
            </div>
          )}
        </div>

        <div className="card payment-status-card">
          <div>
            <span className="eyebrow">PAYMENT</span>
            <h3>{order.payment_status === "paid" ? "Payment completed" : "Payment pending"}</h3>
            <p>
              {order.payment_status === "paid"
                ? "This order has been recorded as paid by the restaurant."
                : "Payment has not yet been recorded for this order."}
            </p>
          </div>
          <div className="payment-actions">
            <span className={`payment-badge ${order.payment_status === "paid" ? "paid" : "unpaid"}`}>
              {order.payment_status === "paid" ? "Paid" : "Unpaid"}
            </span>
            {order.payment_status !== "paid" && (
              <button
                className="primary-button pretend-payment-button"
                type="button"
                onClick={makePretendPayment}
                disabled={savingPayment}
              >
                {savingPayment ? "Processing..." : "Pretend Payment"}
              </button>
            )}
          </div>
        </div>
        {order.payment_status === "paid" && (
  <div className="card receipt-card">

    <div className="receipt-header">
      <div>
        <span className="eyebrow">CHOWLY</span>
        <h3>Payment Receipt</h3>
      </div>

      <span className="receipt-paid">PAID ✓</span>
    </div>

    <div className="receipt-meta">
      <span>Order #{order.id}</span>

      {order.table_number && (
        <span>Table {order.table_number}</span>
      )}

      <span>
        {new Date(order.created_at).toLocaleString()}
      </span>
    </div>

    <div className="receipt-items">
      {order.order_items?.map((item) => (
        <div className="receipt-line" key={item.id}>
          <span>
            {item.quantity} × {item.menu_items?.name}
          </span>

          <strong>
            ₦{(
              Number(item.price) * Number(item.quantity)
            ).toLocaleString()}
          </strong>
        </div>
      ))}
    </div>

    <div className="receipt-total">
      <span>Total paid</span>
      <strong>
        ₦{Number(order.total_amount).toLocaleString()}
      </strong>
    </div>

    <p className="receipt-thank-you">
      Thank you for dining with Chowly.
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

    if (!staffError) setStaff(staffData || []);
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

    setSaving(true);
    const { error } = await supabase
      .from("orders")
      .update({
        chef_id: chefId ? Number(chefId) : null,
        bartender_id: bartenderId ? Number(bartenderId) : null
      })
      .eq("id", selectedOrder.id);
    setSaving(false);

    if (error) {
      console.error(error);
      setMessage("Could not save the staff assignment.");
      return;
    }

    setMessage(`Staff assignment saved for order #${selectedOrder.id}.`);
    await loadData();
    setSelectedOrder((current) => current ? {
      ...current,
      chef_id: chefId ? Number(chefId) : null,
      bartender_id: bartenderId ? Number(bartenderId) : null,
      chef: chefs.find((person) => String(person.id) === String(chefId)) || null,
      bartender: bartenders.find((person) => String(person.id) === String(bartenderId)) || null
    } : null);
  }

  async function updateOrderStatus(newStatus) {
    if (!selectedOrder) return;

    setSaving(true);
    const { error } = await supabase
      .from("orders")
      .update({
        status: newStatus,
        chef_id: chefId ? Number(chefId) : null,
        bartender_id: bartenderId ? Number(bartenderId) : null
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

  async function recordPayment() {
    if (!selectedOrder || selectedOrder.payment_status === "paid") return;

    setSaving(true);
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("id", selectedOrder.id);
    setSaving(false);

    if (error) {
      console.error(error);
      setMessage("Could not record the payment.");
      return;
    }

    setSelectedOrder((current) => current ? { ...current, payment_status: "paid" } : null);
    setMessage(`Payment recorded for order #${selectedOrder.id}.`);
    await loadData();
  }

  const chefs = staff.filter((person) => String(person.role || "").toLowerCase() === "chef");
  const bartenders = staff.filter((person) => String(person.role || "").toLowerCase() === "bartender");

  const chefWorkload = chefs.map((chef) => ({
  ...chef,
  activeOrders: orders.filter(
    (order) =>
      Number(order.chef_id) === Number(chef.id) &&
      order.status !== "served"
  ).length
}));

const bartenderWorkload = bartenders.map((bartender) => ({
  ...bartender,
  activeOrders: orders.filter(
    (order) =>
      Number(order.bartender_id) === Number(bartender.id) &&
      order.status !== "served"
  ).length
}));

  const counts = {
  all: orders.length,
  pending: orders.filter((order) => order.status === "pending").length,
  preparing: orders.filter((order) => order.status === "preparing").length,
  served: orders.filter((order) => order.status === "served").length
};

const totalRevenue = orders
  .filter((order) => order.payment_status === "paid")
  .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

const averageWait =
  orders.length > 0
    ? Math.round(
        orders.reduce(
          (sum, order) => sum + Number(order.waiting_time || 0),
          0
        ) / orders.length
      )
    : 0;

const servedPercentage =
  orders.length > 0
    ? Math.round((counts.served / orders.length) * 100)
    : 0;

  const visibleOrders = filter === "all" ? orders : orders.filter((order) => order.status === filter);

  if (loading) {
    return <section className="section"><div className="loading">Loading waiter dashboard...</div></section>;
  }

  return (
    <section className="section">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">STAFF DASHBOARD</span>
          <h2>Active Orders</h2>
          <p>Manage and track all customer orders in real time.</p>
        </div>
        <div className="dashboard-stat"><strong>{orders.length}</strong><span>Total Orders</span></div>
      </div>

      {message && <div className="message">{message}</div>}
      <div className="analytics-grid">

  <div className="analytics-card">
    <span className="analytics-icon">₦</span>
    <span className="analytics-label">PAID REVENUE</span>
    <strong>₦{totalRevenue.toLocaleString()}</strong>
    <small>Recorded payments</small>
  </div>

  <div className="analytics-card">
    <span className="analytics-icon">◉</span>
    <span className="analytics-label">TOTAL ORDERS</span>
    <strong>{counts.all}</strong>
    <small>Orders received</small>
  </div>

  <div className="analytics-card">
    <span className="analytics-icon">◷</span>
    <span className="analytics-label">AVG. WAIT</span>
    <strong>{averageWait} min</strong>
    <small>Estimated preparation</small>
  </div>

  <div className="analytics-card">
    <span className="analytics-icon">✓</span>
    <span className="analytics-label">SERVED</span>
    <strong>{servedPercentage}%</strong>
    <small>Orders completed</small>
  </div>

    <div className="workload-section">

  <div>
    <span className="eyebrow">KITCHEN TEAM</span>
    <h3>Chef Workload</h3>

    <div className="workload-list">
      {chefWorkload.map((chef) => (
        <div className="workload-row" key={chef.id}>
          <div>
            <strong>{chef.name}</strong>
            <span>Chef</span>
          </div>

          <b>
            {chef.activeOrders}
            <small> active</small>
          </b>
        </div>
      ))}
    </div>
  </div>

  <div>
    <span className="eyebrow">BAR TEAM</span>
    <h3>Bartender Workload</h3>

    <div className="workload-list">
      {bartenderWorkload.map((bartender) => (
        <div className="workload-row" key={bartender.id}>
          <div>
            <strong>{bartender.name}</strong>
            <span>Bartender</span>
          </div>

          <b>
            {bartender.activeOrders}
            <small> active</small>
          </b>
        </div>
      ))}
    </div>
  </div>

</div>

</div>
      <div className="order-filters" role="tablist" aria-label="Order status filters">
        {[['all', 'All'], ['pending', 'Pending'], ['preparing', 'Preparing'], ['served', 'Served']].map(([value, label]) => (
          <button key={value} type="button" className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>
            {label} <span>({counts[value]})</span>
          </button>
        ))}
      </div>

      <div className="orders-list">
        {visibleOrders.length === 0 ? (
          <div className="empty-dashboard">
            <h3>No {filter === "all" ? "orders" : `${filter} orders`} found</h3>
            <p>New customer orders will appear here automatically.</p>
          </div>
        ) : visibleOrders.map((order) => (
          <article className="order-card" key={order.id}>
            <div className="order-card-top">
              <div>
                <span className="eyebrow">ORDER #{order.id}</span>
                <h3>{order.table_number ? `Table ${order.table_number}` : "Table not selected"}</h3>
                <p className="order-date">{new Date(order.created_at).toLocaleString()}</p>
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

            <div className="waiter-card-feedback">
              <div>
                <span className="feedback-label">Rating</span>
                <strong>{order.rating ? `${"★".repeat(Number(order.rating))}${"☆".repeat(5 - Number(order.rating))}` : "Not rated"}</strong>
              </div>
              <div>
                <span className="feedback-label">Payment</span>
                <strong className={order.payment_status === "paid" ? "payment-text paid" : "payment-text unpaid"}>{order.payment_status === "paid" ? "Paid" : "Unpaid"}</strong>
              </div>
            </div>

            {order.complaint && (
              <div className="complaint-preview">
                <span>Customer feedback</span>
                <p>“{order.complaint}”</p>
              </div>
            )}

            <button type="button" className="add-button waiter-open-button" onClick={() => openOrder(order)}>
              <span aria-hidden="true">🍴</span> Open Order
            </button>
          </article>
        ))}
      </div>

      {selectedOrder && (
        <div className="order-modal-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setSelectedOrder(null);
        }}>
          <div className="order-modal" role="dialog" aria-modal="true" aria-labelledby="order-modal-title">
            <button className="modal-close" type="button" onClick={() => !saving && setSelectedOrder(null)} aria-label="Close order">×</button>

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

            <div className="modal-section">
              <span className="eyebrow">CUSTOMER FEEDBACK</span>
              <div className="modal-feedback-box">
                <div className="modal-rating">
                  <strong>{selectedOrder.rating ? `${"★".repeat(Number(selectedOrder.rating))}${"☆".repeat(5 - Number(selectedOrder.rating))}` : "Not rated yet"}</strong>
                </div>
                <p>{selectedOrder.complaint || "No written feedback was submitted."}</p>
              </div>
            </div>

            <div className="modal-section">
              <span className="eyebrow">PAYMENT</span>
              <div className="modal-payment-row">
                <div>
                  <strong>₦{Number(selectedOrder.total_amount).toLocaleString()}</strong>
                  <p>{selectedOrder.payment_status === "paid" ? "Payment has been recorded." : "Payment is still outstanding."}</p>
                </div>
                <span className={`payment-badge ${selectedOrder.payment_status === "paid" ? "paid" : "unpaid"}`}>
                  {selectedOrder.payment_status === "paid" ? "Paid" : "Unpaid"}
                </span>
              </div>
              {selectedOrder.payment_status !== "paid" && selectedOrder.status === "served" && (
                <button className="secondary-button full" type="button" onClick={recordPayment} disabled={saving}>
                  {saving ? "Recording..." : "Record Payment"}
                </button>
              )}
            </div>

            <label htmlFor="chef-select">Chef</label>
            <select id="chef-select" value={chefId} onChange={(event) => setChefId(event.target.value)}>
              <option value="">No chef assigned</option>
              {chefs.map((chef) => <option key={chef.id} value={chef.id}>{chef.name}</option>)}
            </select>

            <label htmlFor="bartender-select">Bartender</label>
            <select id="bartender-select" value={bartenderId} onChange={(event) => setBartenderId(event.target.value)}>
              <option value="">No bartender assigned</option>
              {bartenders.map((bartender) => <option key={bartender.id} value={bartender.id}>{bartender.name}</option>)}
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
                <button className="primary-button" type="button" onClick={() => updateOrderStatus("preparing")} disabled={saving}>Start Preparing</button>
              )}
              {selectedOrder.status === "preparing" && (
                <button className="primary-button" type="button" onClick={() => updateOrderStatus("served")} disabled={saving}>Mark as Served</button>
              )}
              {selectedOrder.status === "served" && (
                <button className="secondary-button" type="button" onClick={() => setSelectedOrder(null)} disabled={saving}>Close</button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default App;