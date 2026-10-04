"use client";

import { useEffect, useState } from "react";

function formatNow(date: Date) {
  const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "short" })
    .format(date)
    .replace(".", "");
  const datePart = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit"
  }).format(date);
  const time = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);

  return `${weekday}. ${datePart} · ${time}`;
}

export function LiveClock() {
  const [value, setValue] = useState("");

  useEffect(() => {
    const update = () => setValue(formatNow(new Date()));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return <span suppressHydrationWarning>{value || "–"}</span>;
}
