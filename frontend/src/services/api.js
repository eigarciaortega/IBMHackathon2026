import axios from "axios";

export const catalogApi = axios.create({
  baseURL: "http://localhost:8081/api",
});

export const bookingApi = axios.create({
  baseURL: "http://localhost:8082/api",
});

function getToken() {
  return localStorage.getItem("token");
}

function getAuthHeaders() {
  const token = getToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function loginRequest(email, password) {
  const response = await bookingApi.post("/auth/login", {
    email,
    password,
  });

  return response.data;
}

export async function getSpaces() {
  const response = await catalogApi.get("/spaces", {
    headers: getAuthHeaders(),
  });

  return normalizeArray(response.data);
}

export async function createSpace(space) {
  const payload = {
    name: space.name,
    type: space.type,
    capacity: Number(space.capacity),
    floorLocation: space.floorLocation,
    hasProjector: Boolean(space.hasProjector),
    hasAirConditioning: Boolean(space.hasAirConditioning),
    active: true,
  };

  const response = await catalogApi.post("/spaces", payload, {
    headers: getAuthHeaders(),
  });

  return response.data;
}

export async function updateSpace(id, space) {
  const payload = {
    name: space.name,
    type: space.type,
    capacity: Number(space.capacity),
    floorLocation: space.floorLocation,
    hasProjector: Boolean(space.hasProjector),
    hasAirConditioning: Boolean(space.hasAirConditioning),
    active: true,
  };

  const response = await catalogApi.put(`/spaces/${id}`, payload, {
    headers: getAuthHeaders(),
  });

  return response.data;
}

export async function deleteSpace(id) {
  const response = await catalogApi.delete(`/spaces/${id}`, {
    headers: getAuthHeaders(),
  });

  return response.data;
}

export async function createBooking({ user, space, date, startTime, endTime, attendees }) {
  const payload = {
    userEmail: user.email,
    email: user.email,
    spaceId: space.id,
    startTime: `${date}T${startTime}:00`,
    endTime: `${date}T${endTime}:00`,
    attendees: Number(attendees),
  };

  const response = await bookingApi.post("/bookings", payload, {
    headers: getAuthHeaders(),
  });

  return response.data;
}

export async function getMyBookings(email) {
  try {
    const response = await bookingApi.get(
      `/bookings/my?email=${encodeURIComponent(email)}`,
      {
        headers: getAuthHeaders(),
      }
    );

    return normalizeArray(response.data);
  } catch {
    const response = await bookingApi.get("/bookings/my", {
      headers: getAuthHeaders(),
    });

    return normalizeArray(response.data);
  }
}

export async function cancelBooking(id) {
  const response = await bookingApi.delete(`/bookings/${id}`, {
    headers: getAuthHeaders(),
  });

  return response.data;
}