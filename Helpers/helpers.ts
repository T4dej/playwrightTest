export const randomTimeout = (min = 2000, max = 3000) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
