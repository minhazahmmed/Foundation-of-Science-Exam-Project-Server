// যেকোনো জায়গা থেকে throw new ApiError(404, 'মেসেজ') দিলেই ক্লায়েন্ট ওই মেসেজ পাবে
export default class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
