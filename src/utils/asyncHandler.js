// async কন্ট্রোলারের error নিজে থেকে error middleware-এ পাঠায়, try/catch লিখতে হয় না
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
