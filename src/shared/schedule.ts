export const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Shabbos"];
export const meridiems = ["AM", "PM"];

export function formatSchedule(day: string, time: string, meridiem: string) {
  return [day, time.trim(), meridiem].filter(Boolean).join(" ");
}

export function parseSchedule(schedule: string) {
  const [day = "Sunday", time = "", meridiem = "PM"] = schedule.split(" ");
  return {
    day: weekDays.includes(day) ? day : "Sunday",
    time,
    meridiem: meridiems.includes(meridiem) ? meridiem : "PM"
  };
}
