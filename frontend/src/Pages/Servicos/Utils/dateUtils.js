// src/utils/dateUtils.js

export const getWeek = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

export const getWeeksInMonth = (month, year) => {
  const weeks = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  let currentDate = new Date(firstDay);

  while (currentDate.getDay() !== 0) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  while (currentDate <= lastDay) {
    const weekNumber = getWeek(currentDate);
    if (!weeks.includes(weekNumber)) {
      weeks.push(weekNumber);
    }
    currentDate.setDate(currentDate.getDate() + 7);
  }

  return weeks;
};

export const getDaysInWeek = (weekNumber, year) => {
  const days = [];
  const firstDayOfYear = new Date(year, 0, 1);

  const firstDayOfWeek = new Date(firstDayOfYear);
  firstDayOfWeek.setDate(
    firstDayOfYear.getDate() + (weekNumber - 1) * 7 - firstDayOfYear.getDay()
  );

  for (let i = 0; i < 7; i++) {
    const day = new Date(firstDayOfWeek);
    day.setDate(firstDayOfWeek.getDate() + i);
    days.push(day);
  }

  return days;
};
