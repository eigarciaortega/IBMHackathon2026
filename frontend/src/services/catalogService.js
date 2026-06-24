import { API_URLS, apiRequest } from "./apiClient";

export function getSpaces() {
  return apiRequest(API_URLS.catalog, "/spaces");
}

export function getAvailableSpaces(filters) {
  const params = new URLSearchParams();

  params.append("date", filters.date);
  params.append("startTime", filters.startTime);
  params.append("endTime", filters.endTime);

  if (filters.type) {
    params.append("type", filters.type);
  }

  if (filters.minCapacity) {
    params.append("minCapacity", filters.minCapacity);
  }

  return apiRequest(API_URLS.catalog, `/spaces/available?${params.toString()}`);
}

export function createSpace(space) {
  return apiRequest(API_URLS.catalog, "/spaces", {
    method: "POST",
    body: JSON.stringify(space),
  });
}

export function updateSpace(id, space) {
  return apiRequest(API_URLS.catalog, `/spaces/${id}`, {
    method: "PUT",
    body: JSON.stringify(space),
  });
}

export function deactivateSpace(id) {
  return apiRequest(API_URLS.catalog, `/spaces/${id}`, {
    method: "DELETE",
  });
}