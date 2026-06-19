type ValidationIssue = {
  msg?: string;
  loc?: Array<string | number>;
};

type ErrorPayload = {
  detail?: unknown;
  message?: unknown;
};

type HttpLikeError = {
  response?: {
    data?: ErrorPayload;
  };
  message?: string;
};

function stringifyDetail(detail: unknown): string | null {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const issues = detail as ValidationIssue[];
    const lines = issues
      .map((issue) => {
        const path = Array.isArray(issue.loc) ? issue.loc.join(".") : "";
        const msg = issue.msg || "Invalid value";
        return path ? `${path}: ${msg}` : msg;
      })
      .filter(Boolean);
    return lines.length > 0 ? lines.join(" | ") : null;
  }

  if (detail && typeof detail === "object") {
    const maybeMsg = (detail as { msg?: unknown }).msg;
    if (typeof maybeMsg === "string") {
      return maybeMsg;
    }
  }

  return null;
}

export function getApiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  const e = err as HttpLikeError;
  const data = e?.response?.data;

  const detailText = stringifyDetail(data?.detail);
  if (detailText) {
    return detailText;
  }

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (typeof e?.message === "string" && e.message.trim().length > 0) {
    return e.message;
  }

  return fallback;
}
