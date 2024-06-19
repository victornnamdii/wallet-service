export class ResponseDTO {
  public readonly status: string;
  public readonly message: string;
  public readonly data: object | undefined;
  constructor(status: "error" | "success", message?: string, data?: object) {
    this.status = status;
    this.message = message ?? "Successful";
    this.data = data;
  }
}
