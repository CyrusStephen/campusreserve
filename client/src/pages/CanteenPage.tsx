import {
  Check,
  ChevronLeft,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import {
  createCanteenOrder,
  listCanteenItems,
  listMyCanteenOrders,
} from "../canteen/api";
import type { CanteenItem, CanteenOrder } from "../canteen/types";
import "../canteen/canteen.css";
import { playInterfaceSound } from "../utils/interface-sounds";

type CartLine = { item: CanteenItem; quantity: number; customization?: string };
const upiId = import.meta.env.VITE_CANTEEN_UPI_ID || "campusreserve.demo@upi";
const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);

export default function CanteenPage() {
  const [items, setItems] = useState<CanteenItem[]>([]);
  const [orders, setOrders] = useState<CanteenOrder[]>([]);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [view, setView] = useState<"menu" | "checkout" | "orders">("menu");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState(
    () => localStorage.getItem("cr-canteen-location") ?? "",
  );
  const [deliveryAt, setDeliveryAt] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "UPI" | "CASH_ON_DELIVERY"
  >("CASH_ON_DELIVERY");
  const [upiReference, setUpiReference] = useState("");
  const [screenshot, setScreenshot] = useState<string | undefined>();
  const [notes, setNotes] = useState("");
  useEffect(() => {
    void Promise.all([listCanteenItems(), listMyCanteenOrders()])
      .then(([menu, mine]) => {
        setItems(menu);
        setOrders(mine);
      })
      .catch((failure: Error) => setError(failure.message));
  }, []);
  const lines = Object.values(cart);
  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + line.item.pricePaise * line.quantity,
        0,
      ),
    [lines],
  );
  const change = (item: CanteenItem, delta: number) =>
    setCart((current) => {
      const next = { ...current };
      const quantity = (next[item.id]?.quantity ?? 0) + delta;
      if (quantity <= 0) delete next[item.id];
      else
        next[item.id] = {
          item,
          quantity,
          customization: next[item.id]?.customization ?? item.options[0],
        };
      return next;
    });
  const readScreenshot = (file?: File) => {
    if (!file) return;
    if (file.size > 700_000) {
      setError("Use a payment screenshot smaller than 700 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setScreenshot(String(reader.result));
    reader.readAsDataURL(file);
  };
  const placeOrder = async () => {
    setBusy(true);
    setError("");
    try {
      const order = await createCanteenOrder({
        items: lines.map((line) => ({
          itemId: line.item.id,
          quantity: line.quantity,
          customization: line.customization,
        })),
        deliveryLocation: location,
        deliveryAt,
        paymentMethod,
        upiReference: paymentMethod === "UPI" ? upiReference : undefined,
        paymentScreenshotDataUrl: screenshot,
        notes,
      });
      localStorage.setItem("cr-canteen-location", location);
      setOrders((current) => [order, ...current]);
      setCart({});
      setView("orders");
      playInterfaceSound("success");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Order could not be placed.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="cr-page cr-canteen">
      <header className="cr-page-heading cr-canteen-heading">
        <div>
          <p className="cr-eyebrow">Canteen orders</p>
          <h1>
            {view === "menu"
              ? "What would you like?"
              : view === "checkout"
                ? "One quick checkout"
                : "My canteen orders"}
          </h1>
          <p>Fresh campus refreshments, delivered to your office.</p>
        </div>
        <div className="cr-inline">
          <button
            className="cr-button"
            onClick={() => setView("menu")}
            type="button"
          >
            Menu
          </button>
          <button
            className="cr-button"
            onClick={() => setView("orders")}
            type="button"
          >
            My orders
          </button>
        </div>
      </header>
      {error && (
        <p className="cr-alert cr-alert-error" role="alert">
          {error}
        </p>
      )}
      {view === "menu" && (
        <>
          <div className="cr-menu-categories">
            {[...new Set(items.map((item) => item.category))].map(
              (category) => (
                <section key={category}>
                  <h2>{category}</h2>
                  <div className="cr-menu-grid">
                    {items
                      .filter((item) => item.category === category)
                      .map((item) => {
                        const line = cart[item.id];
                        return (
                          <article
                            className={`cr-menu-card${item.status !== "AVAILABLE" ? " cr-menu-sold" : ""}`}
                            key={item.id}
                          >
                            <div className="cr-food-art">
                              <UtensilsCrossed />
                            </div>
                            <div>
                              <h3>{item.name}</h3>
                              <p>{item.description}</p>
                              {item.options.length > 0 && line && (
                                <select
                                  value={line.customization}
                                  onChange={(event) =>
                                    setCart((current) => ({
                                      ...current,
                                      [item.id]: {
                                        ...current[item.id],
                                        customization: event.target.value,
                                      },
                                    }))
                                  }
                                >
                                  {item.options.map((option) => (
                                    <option key={option}>{option}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <strong>{money(item.pricePaise)}</strong>
                            {item.status === "AVAILABLE" ? (
                              <div className="cr-quantity">
                                {line && (
                                  <button
                                    aria-label={`Remove one ${item.name}`}
                                    onClick={() => change(item, -1)}
                                  >
                                    <Minus />
                                  </button>
                                )}
                                <span>{line?.quantity ?? 0}</span>
                                <button
                                  aria-label={`Add one ${item.name}`}
                                  onClick={() => change(item, 1)}
                                >
                                  <Plus />
                                </button>
                              </div>
                            ) : (
                              <span className="cr-status">Sold out</span>
                            )}
                          </article>
                        );
                      })}
                  </div>
                </section>
              ),
            )}
          </div>
          {lines.length > 0 && (
            <div className="cr-cart-dock">
              <span>
                <ShoppingBag />
                {lines.reduce((sum, line) => sum + line.quantity, 0)} items
              </span>
              <strong>{money(total)}</strong>
              <button onClick={() => setView("checkout")}>
                Review order <Check />
              </button>
            </div>
          )}
        </>
      )}
      {view === "checkout" && (
        <div className="cr-checkout-grid">
          <div className="cr-panel">
            <button
              className="cr-button cr-button-quiet"
              onClick={() => setView("menu")}
            >
              <ChevronLeft />
              Back to menu
            </button>
            <h2>Delivery details</h2>
            <label className="cr-field">
              <span>Office / drop location</span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Department and room number"
              />
            </label>
            <label className="cr-field">
              <span>Delivery time</span>
              <input
                type="datetime-local"
                value={deliveryAt}
                onChange={(event) => setDeliveryAt(event.target.value)}
              />
            </label>
            <label className="cr-field">
              <span>Optional instructions</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Less spicy, call on arrival…"
              />
            </label>
            <h2>Payment</h2>
            <div className="cr-payment-choice">
              <button
                className={paymentMethod === "UPI" ? "active" : ""}
                onClick={() => setPaymentMethod("UPI")}
              >
                Prepay with UPI
              </button>
              <button
                className={paymentMethod === "CASH_ON_DELIVERY" ? "active" : ""}
                onClick={() => setPaymentMethod("CASH_ON_DELIVERY")}
              >
                Cash on delivery
              </button>
            </div>
            {paymentMethod === "UPI" && (
              <div className="cr-upi-box">
                <QRCodeSVG
                  value={`upi://pay?pa=${encodeURIComponent(upiId)}&pn=CampusReserve%20Demo&am=${(total / 100).toFixed(2)}&cu=INR`}
                  size={154}
                />
                <div>
                  <p className="cr-demo-label">SHOWCASE UPI</p>
                  <strong>{upiId}</strong>
                  <p>Scan using any UPI app, then enter the reference.</p>
                  <label className="cr-field">
                    <span>Transaction reference</span>
                    <input
                      value={upiReference}
                      onChange={(event) => setUpiReference(event.target.value)}
                    />
                  </label>
                  <label className="cr-field">
                    <span>Screenshot (optional)</span>
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      type="file"
                      onChange={(event) =>
                        readScreenshot(event.target.files?.[0])
                      }
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
          <aside className="cr-panel cr-order-summary">
            <h2>Your order</h2>
            {lines.map((line) => (
              <div key={line.item.id}>
                <span>
                  {line.quantity} × {line.item.name}
                  <small>{line.customization}</small>
                </span>
                <strong>{money(line.item.pricePaise * line.quantity)}</strong>
                <button
                  aria-label={`Remove ${line.item.name}`}
                  onClick={() => change(line.item, -line.quantity)}
                >
                  <Trash2 />
                </button>
              </div>
            ))}
            <footer>
              <span>Total</span>
              <strong>{money(total)}</strong>
            </footer>
            <button
              className="cr-button cr-button-primary"
              disabled={
                busy ||
                lines.length === 0 ||
                !location ||
                !deliveryAt ||
                (paymentMethod === "UPI" && !upiReference)
              }
              onClick={() => void placeOrder()}
            >
              {busy ? "Placing order…" : `Place order · ${money(total)}`}
            </button>
          </aside>
        </div>
      )}
      {view === "orders" && (
        <div className="cr-order-list">
          {orders.length === 0 ? (
            <div className="cr-panel cr-empty">
              <ShoppingBag />
              <h2>No canteen orders yet</h2>
              <button className="cr-button" onClick={() => setView("menu")}>
                Browse menu
              </button>
            </div>
          ) : (
            orders.map((order) => (
              <article className="cr-panel cr-order-card" key={order.id}>
                <header>
                  <div>
                    <p className="cr-eyebrow">{order.referenceCode}</p>
                    <h2>
                      {order.items
                        .map((item) => `${item.quantity}× ${item.itemName}`)
                        .join(", ")}
                    </h2>
                  </div>
                  <span
                    className={`cr-status cr-status-${order.status.toLowerCase()}`}
                  >
                    {order.status.toLowerCase().replaceAll("_", " ")}
                  </span>
                </header>
                <p>
                  Deliver to <strong>{order.deliveryLocation}</strong> ·{" "}
                  {new Date(order.deliveryAt).toLocaleString()}
                </p>
                <footer>
                  <span>
                    {order.paymentMethod === "UPI"
                      ? `UPI · ${order.paymentStatus.toLowerCase().replaceAll("_", " ")}`
                      : "Cash on delivery"}
                  </span>
                  <strong>{money(order.totalPaise)}</strong>
                </footer>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
