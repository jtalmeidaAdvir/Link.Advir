// src/utils/dateUtils.js
export const getDaysInWeek = (weekNumber, year) => {
  const days = [];
  const firstDayOfYear = new Date(year, 0, 1);

  const firstDayOfWeek = new Date(firstDayOfYear);
  firstDayOfWeek.setDate(
    firstDayOfYear.getDate() +
    (weekNumber - 1) * 7 -
    firstDayOfYear.getDay()
  );

  for (let i = 0; i < 7; i++) {
    const day = new Date(firstDayOfWeek);
    day.setDate(firstDayOfWeek.getDate() + i);
    days.push(day);
  }

  return days;
};
