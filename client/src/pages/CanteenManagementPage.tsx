import {
  CheckCircle2,
  Coffee,
  IndianRupee,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  listCanteenOrders,
  listManagedCanteenItems,
  saveCanteenItem,
  updateCanteenOrder,
} from "../canteen/api";
import type { CanteenItem, CanteenOrder } from "../canteen/types";
import "../canteen/canteen.css";
import "../canteen/canteen-management.css";

const money = (paise: number) => `₹${paise / 100}`;
const nextStatus: Record<string, string | undefined> = {
  PENDING: "ACCEPTED",
  ACCEPTED: "PREPARING",
  PREPARING: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
};

export default function CanteenManagementPage() {
  const [orders, setOrders] = useState<CanteenOrder[]>([]);
  const [items, setItems] = useState<CanteenItem[]>([]);
  const [tab, setTab] = useState<"orders" | "menu">("orders");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Partial<CanteenItem> | null>(null);
  const load = () =>
    void Promise.all([listCanteenOrders(), listManagedCanteenItems()])
      .then(([allOrders, menu]) => {
        setOrders(allOrders);
        setItems(menu);
      })
      .catch((failure: Error) => setError(failure.message));
  useEffect(load, []);
  const patchOrder = async (id: string, body: object) => {
    try {
      const updated = await updateCanteenOrder(id, body);
      setOrders((current) =>
        current.map((order) => (order.id === id ? updated : order)),
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Update failed.");
    }
  };
  const toggleItem = async (item: CanteenItem) => {
    try {
      const updated = await saveCanteenItem({
        ...item,
        status: item.status === "AVAILABLE" ? "SOLD_OUT" : "AVAILABLE",
        imageUrl: item.imageUrl ?? "",
      });
      setItems((current) =>
        current.map((value) => (value.id === item.id ? updated : value)),
      );
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Menu update failed.",
      );
    }
  };
  const saveDraft = async () => {
    if (!draft) return;
    try {
      const saved = await saveCanteenItem({
        ...draft,
        name: draft.name ?? "",
        description: draft.description ?? "",
        category: draft.category ?? "",
        pricePaise: draft.pricePaise ?? 0,
        options: draft.options ?? [],
        status: draft.status ?? "AVAILABLE",
        sortOrder: draft.sortOrder ?? 0,
        imageUrl: draft.imageUrl ?? "",
      });
      setItems((current) =>
        draft.id
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved],
      );
      setDraft(null);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Menu item could not be saved.",
      );
    }
  };
  const active = orders.filter(
    (order) => !["DELIVERED", "REJECTED", "CANCELLED"].includes(order.status),
  );
  return (
    <section className="cr-page cr-canteen">
      <header className="cr-page-heading">
        <div>
          <p className="cr-eyebrow">Canteen console</p>
          <h1>Orders without the queue.</h1>
          <p>Accept, prepare and deliver from one focused workspace.</p>
        </div>
        <button className="cr-button" onClick={load}>
          <RefreshCw />
          Refresh
        </button>
      </header>
      {error && <p className="cr-alert cr-alert-error">{error}</p>}
      <div className="cr-management-tabs">
        <button
          className={tab === "orders" ? "active" : ""}
          onClick={() => setTab("orders")}
        >
          Live orders <span>{active.length}</span>
        </button>
        <button
          className={tab === "menu" ? "active" : ""}
          onClick={() => setTab("menu")}
        >
          Menu availability
        </button>
      </div>
      {tab === "orders" ? (
        <div className="cr-kitchen-board">
          {active.length === 0 ? (
            <div className="cr-panel cr-empty">
              <CheckCircle2 />
              <h2>Kitchen queue is clear</h2>
            </div>
          ) : (
            active.map((order) => (
              <article className="cr-panel cr-kitchen-ticket" key={order.id}>
                <header>
                  <span
                    className={`cr-status cr-status-${order.status.toLowerCase()}`}
                  >
                    {order.status.replaceAll("_", " ")}
                  </span>
                  <strong>{order.referenceCode}</strong>
                  <time>
                    {new Date(order.deliveryAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </header>
                <h2>{order.requester.name}</h2>
                <p>{order.deliveryLocation}</p>
                <ul>
                  {order.items.map((item) => (
                    <li key={item.id}>
                      <strong>{item.quantity}×</strong>
                      <span>
                        {item.itemName}
                        <small>{item.customization}</small>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="cr-ticket-payment">
                  <IndianRupee />
                  {order.paymentMethod === "UPI" ? (
                    <>
                      <span>
                        UPI · {order.upiReference}
                        {order.paymentScreenshotUrl && (
                          <>
                            {" "}
                            ·{" "}
                            <a
                              href={order.paymentScreenshotUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Screenshot
                            </a>
                          </>
                        )}
                      </span>
                      {order.paymentStatus === "PENDING_VERIFICATION" && (
                        <button
                          onClick={() =>
                            void patchOrder(order.id, { paymentStatus: "PAID" })
                          }
                        >
                          Verify payment
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <span>Cash on delivery</span>
                      {order.paymentStatus !== "PAID" && (
                        <button
                          onClick={() =>
                            void patchOrder(order.id, { paymentStatus: "PAID" })
                          }
                        >
                          Mark paid
                        </button>
                      )}
                    </>
                  )}
                </div>
                <footer>
                  {order.status === "PENDING" && (
                    <button
                      className="cr-button"
                      onClick={() =>
                        void patchOrder(order.id, {
                          status: "REJECTED",
                          rejectionReason: "Unavailable at the requested time.",
                        })
                      }
                    >
                      Reject
                    </button>
                  )}
                  {nextStatus[order.status] && (
                    <button
                      className="cr-button cr-button-primary"
                      onClick={() =>
                        void patchOrder(order.id, {
                          status: nextStatus[order.status],
                        })
                      }
                    >
                      {order.status === "PENDING"
                        ? "Accept order"
                        : order.status === "ACCEPTED"
                          ? "Start preparing"
                          : order.status === "PREPARING"
                            ? "Send for delivery"
                            : "Mark delivered"}{" "}
                      <PackageCheck />
                    </button>
                  )}
                </footer>
              </article>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="cr-menu-editor-bar">
            <button
              className="cr-button cr-button-primary"
              onClick={() =>
                setDraft({
                  status: "AVAILABLE",
                  options: [],
                  sortOrder: items.length * 10,
                })
              }
            >
              Add menu item
            </button>
          </div>
          {draft && (
            <div className="cr-panel cr-menu-editor">
              <h2>{draft.id ? "Edit menu item" : "New menu item"}</h2>
              <div>
                <label className="cr-field">
                  <span>Name</span>
                  <input
                    value={draft.name ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, name: event.target.value })
                    }
                  />
                </label>
                <label className="cr-field">
                  <span>Category</span>
                  <input
                    value={draft.category ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, category: event.target.value })
                    }
                  />
                </label>
                <label className="cr-field">
                  <span>Price (₹)</span>
                  <input
                    min="1"
                    type="number"
                    value={(draft.pricePaise ?? 0) / 100}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        pricePaise: Math.round(
                          Number(event.target.value) * 100,
                        ),
                      })
                    }
                  />
                </label>
                <label className="cr-field">
                  <span>Description</span>
                  <input
                    value={draft.description ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, description: event.target.value })
                    }
                  />
                </label>
                <label className="cr-field">
                  <span>Options (comma-separated)</span>
                  <input
                    value={(draft.options ?? []).join(", ")}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        options: event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </label>
              </div>
              <footer>
                <button className="cr-button" onClick={() => setDraft(null)}>
                  Cancel
                </button>
                <button
                  className="cr-button cr-button-primary"
                  onClick={() => void saveDraft()}
                >
                  Save item
                </button>
              </footer>
            </div>
          )}
          <div className="cr-managed-menu">
            {items.map((item) => (
              <article className="cr-panel" key={item.id}>
                <span>
                  <Coffee />
                </span>
                <div>
                  <h2>{item.name}</h2>
                  <p>
                    {item.category} · {money(item.pricePaise)}
                  </p>
                </div>
                <button
                  className="cr-button cr-button-small"
                  onClick={() => setDraft(item)}
                >
                  Edit
                </button>
                <button
                  className={`cr-availability-toggle ${item.status === "AVAILABLE" ? "active" : ""}`}
                  onClick={() => void toggleItem(item)}
                >
                  {item.status === "AVAILABLE" ? "Available" : "Sold out"}
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
