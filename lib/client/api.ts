export class ClientApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
  }
}

type Decoder<TResponse> = (value: unknown) => TResponse;

const identity = <TResponse>(value: unknown) => value as TResponse;

async function decodeResponse<TResponse>(response: Response, decode: Decoder<TResponse>): Promise<TResponse> {
  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    if (!response.ok) {
      throw new ClientApiError(`The service returned an unreadable error (${response.status}).`, response.status);
    }
    throw new ClientApiError("The service returned an unreadable response.", response.status);
  }

  if (!response.ok) {
    const candidate = typeof payload === "object" && payload !== null && "error" in payload
      ? (payload as { error?: unknown }).error
      : null;
    const message = typeof candidate === "string"
      ? candidate
      : candidate && typeof candidate === "object" && "code" in candidate && typeof (candidate as { code?: unknown }).code === "string"
        ? `The service could not complete the request (${(candidate as { code: string }).code}).`
        : `The service could not complete the request (${response.status}).`;
    throw new ClientApiError(message, response.status);
  }

  try {
    return decode(payload);
  } catch {
    throw new ClientApiError("The service response did not match the expected shape.", response.status);
  }
}

export async function postJson<TRequest, TResponse = unknown>(
  path: string,
  payload: TRequest,
  decode: Decoder<TResponse> = identity,
): Promise<TResponse> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ClientApiError("The service is unavailable. Your local workspace is still safe to use.");
  }

  return decodeResponse(response, decode);
}

export const postRequirements = <TRequest, TResponse = unknown>(payload: TRequest, decode?: Decoder<TResponse>) =>
  postJson<TRequest, TResponse>("/api/requirements", payload, decode);

export const postRetrieve = <TRequest, TResponse = unknown>(payload: TRequest, decode?: Decoder<TResponse>) =>
  postJson<TRequest, TResponse>("/api/retrieve", payload, decode);

export const postExtract = <TRequest, TResponse = unknown>(payload: TRequest, decode?: Decoder<TResponse>) =>
  postJson<TRequest, TResponse>("/api/extract", payload, decode);

export const postScore = <TRequest, TResponse = unknown>(payload: TRequest, decode?: Decoder<TResponse>) =>
  postJson<TRequest, TResponse>("/api/score", payload, decode);

export const postReviewEvidence = <TRequest, TResponse = unknown>(payload: TRequest, decode?: Decoder<TResponse>) =>
  postJson<TRequest, TResponse>("/api/review-evidence", payload, decode);
