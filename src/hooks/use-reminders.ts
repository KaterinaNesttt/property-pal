import { useEffect } from "react";
import { Payment, Task } from "@/lib/types";

const STORAGE_KEY = "property-pal-fired-reminders";

function readState() {
  if (typeof window === "undefined") {
    return {} as Record<string, string>;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Record<string, string>) : {};
}

function persistState(value: Record<string, string>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function notify(id: string, title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const fired = readState();
  const today = new Date().toISOString().slice(0, 10);

  if (fired[id] === today) {
    return;
  }

  new Notification(title, { body });
  fired[id] = today;
  persistState(fired);
}

export function useReminders(tasks: Task[], payments: Payment[]) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const run = () => {
      const now = Date.now();

      tasks.forEach((task) => {
        if (task.status === "done" || !task.reminder_at) {
          return;
        }

        if (new Date(task.reminder_at).getTime() <= now) {
          notify(
            `task:${task.id}`,
            "Нагадування по задачі",
            `${task.title} · ${task.property_name ?? "Без об'єкта"}`,
          );
        }
      });

      payments.forEach((payment) => {
        if (payment.status === "paid") {
          return;
        }

        const due = new Date(payment.due_date).getTime();
        if (due <= now) {
          notify(
            `payment:${payment.id}`,
            "Платіж потребує уваги",
            `${payment.property_name ?? "Без об'єкта"} · ${payment.total_amount.toLocaleString("uk-UA")} грн`,
          );
        }
      });
    };

    run();
    const intervalId = window.setInterval(run, 60_000);
    return () => window.clearInterval(intervalId);
  }, [tasks, payments]);
}
