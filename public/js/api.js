const API = (() => {
  const BASE = "/api";
  let token = localStorage.getItem("medevidence_token");
  let currentUser = JSON.parse(localStorage.getItem("medevidence_user") || "null");

  async function request(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${BASE}${path}`, opts);
    const data = await res.json();

    if (res.status === 401) {
      logout();
      window.location.hash = "#/login";
      throw new Error("Session expired");
    }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  return {
    get(path) { return request("GET", path); },
    post(path, body) { return request("POST", path, body); },
    put(path, body) { return request("PUT", path, body); },
    patch(path, body) { return request("PATCH", path, body); },
    del(path) { return request("DELETE", path); },

    async login(username, password) {
      const data = await request("POST", "/auth/login", { username, password });
      token = data.token;
      currentUser = data.user;
      localStorage.setItem("medevidence_token", token);
      localStorage.setItem("medevidence_user", JSON.stringify(currentUser));
      return data;
    },

    logout() { logout(); },
    getToken() { return token; },
    getUser() { return currentUser; },
    isLoggedIn() { return !!token && !!currentUser; },
  };

  function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem("medevidence_token");
    localStorage.removeItem("medevidence_user");
  }
})();
