import ApiError from '../utils/ApiError.js';

const uploadMessages = {
  LIMIT_FILE_SIZE: 'প্রতিটা ছবি ৮ MB এর মধ্যে হতে হবে',
  LIMIT_FILE_COUNT: 'একবারে সর্বোচ্চ ৫টা ছবি দেওয়া যাবে',
  LIMIT_UNEXPECTED_FILE: 'একবারে সর্বোচ্চ ৫টা ছবি দেওয়া যাবে',
};

export const notFound = (req, res, next) => {
  next(new ApiError(404, `রুট পাওয়া যায়নি: ${req.originalUrl}`));
};

// সব error এখানে এসে একই চেহারায় ক্লায়েন্টের কাছে যায়: { message, details? }
export const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message;

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'ভুল আইডি দেওয়া হয়েছে';
  } else if (err.code === 11000) {
    status = 409;
    message = 'এই তথ্য আগে থেকেই আছে';
  } else if (err.name === 'MulterError') {
    status = 400;
    message = uploadMessages[err.code] || 'ছবি আপলোডে সমস্যা হয়েছে';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'পাঠানো JSON ভুল';
  }

  // আমাদের নিজের লেখা ApiError এর মেসেজ ঠিক রেখে দিই, অজানা সমস্যার মেসেজ লুকাই
  if (status >= 500 && !(err instanceof ApiError)) {
    console.error(err);
    message = 'সার্ভারে সমস্যা হয়েছে';
  }

  res.status(status).json({ message, ...(err.details && { details: err.details }) });
};
