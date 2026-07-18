export class NotFoundError extends Error {
  status = 404;

  constructor(message = "The requested resource was not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}
