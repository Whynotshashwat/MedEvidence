(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const h = (tag, attrs = {}, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v);
    }
    for (const c of children) {
      if (typeof c === "string") el.appendChild(document.createTextNode(c));
      else if (c) el.appendChild(c);
    }
    return el;
  };

  function toast(msg, type = "success") {
    const t = h("div", { class: `toast toast-${type}` }, msg);
    $("#toast-container").appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  function formatDate(d) {
    if (!d) return "\u2014";
    return new Date(d + (d.endsWith("Z") ? "" : "Z")).toLocaleString();
  }

  function badge(text, cls) {
    return h("span", { class: `badge badge-${cls}` }, text);
  }

  function esc(s) {
    if (s == null) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function renderError(container, message) {
    container.innerHTML = "";
    container.appendChild(h("div", { class: "empty" }, h("i", { class: "fa-solid fa-triangle-exclamation" }), h("h3", {}, "Something went wrong"), h("p", {}, message)));
  }

  // ── Router ──────────────────────────────────────────────────────────────
  const routes = {};
  function route(name, fn) { routes[name] = fn; }

  function navigate(hash) {
    const path = hash.replace("#/", "").split("/");
    const name = path[0] || "dashboard";
    const param = path[1];
    $$(".nav-link").forEach((a) => a.classList.toggle("active", a.dataset.route === name));
    $$(".view").forEach((v) => (v.style.display = "none"));
    if (routes[name]) {
      const viewEl = $(`#view-${name}`);
      if (viewEl) { viewEl.style.display = "block"; routes[name](viewEl, param); }
    } else {
      const main = $("#main-content");
      if (main) {
        main.style.display = "block";
        main.innerHTML = '<div class="empty"><i class="fa-solid fa-compass"></i><h3>Page Not Found</h3><p>The page you\'re looking for doesn\'t exist.</p></div>';
      }
    }
  }

  window.addEventListener("hashchange", () => navigate(location.hash));

  // ── Login / App shell ───────────────────────────────────────────────────
  function showLogin() { $("#view-login").style.display = "flex"; $("#app-shell").style.display = "none"; }

  function showApp() {
    $("#view-login").style.display = "none";
    $("#app-shell").style.display = "flex";
    const user = API.getUser();
    if (user) {
      const initials = user.full_name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
      $("#nav-user").textContent = user.full_name;
      $("#nav-role").textContent = user.role;
      $("#nav-avatar").textContent = initials;
      $$("[data-roles]").forEach((el) => {
        const roles = el.dataset.roles.split(",");
        el.style.display = roles.includes(user.role) ? "flex" : "none";
      });
    }
    if (!location.hash || location.hash === "#/") location.hash = "#/dashboard";
    else navigate(location.hash);
  }

  // Sidebar toggle for mobile
  document.addEventListener("click", (e) => {
    if (e.target.closest("#sidebar-toggle")) { $("#sidebar").classList.toggle("open"); return; }
    if (!e.target.closest("#sidebar") && $("#sidebar")?.classList.contains("open")) { $("#sidebar").classList.remove("open"); }
  });

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $("#login-error"); errEl.style.display = "none";
    try { await API.login($("#login-user").value, $("#login-pass").value); showApp(); toast("Signed in successfully"); }
    catch (err) { errEl.textContent = err.message; errEl.style.display = "block"; }
  });

  $("#btn-logout").addEventListener("click", () => { API.logout(); showLogin(); toast("Signed out"); });
  API.onUnauthorized(() => { showLogin(); toast("Session expired", "error"); });

  // ── Dashboard ──────────────────────────────────────────────────────────
  route("dashboard", async (el) => {
    el.innerHTML = '<div class="spinner"></div> Loading dashboard...';
    try {
      const data = await API.get("/dashboard");
      const s = data.stats;
      const user = API.getUser();
      el.innerHTML = "";

      // Welcome banner
      const hour = new Date().getHours();
      const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      el.appendChild(h("div", { class: "dash-welcome" },
        h("h2", {}, `${greeting}, ${user?.full_name?.split(" ")[0] || "User"}`),
        h("p", {}, "Here's an overview of your clinical evidence system.")
      ));

      // Stats
      const grid = h("div", { class: "stat-grid" });
      const stats = [
        ["fa-user-injured", "Patients", s.totalPatients, "teal"],
        ["fa-folder-open", "Total Cases", s.totalCases, "blue"],
        ["fa-circle-exclamation", "Open", s.openCases, "yellow"],
        ["fa-arrow-up", "Escalated", s.escalatedCases, "red"],
        ["fa-circle-check", "Resolved", s.resolvedCases, "green"],
        ["fa-shield-halved", "Evidence", s.totalEvidence, "purple"],
      ];
      for (const [icon, label, value, color] of stats) {
        grid.appendChild(h("div", { class: "stat-card" },
          h("div", { class: `stat-icon ${color}` }, h("i", { class: `fa-solid ${icon}` })),
          h("div", { class: "stat-value" }, String(value)),
          h("div", { class: "stat-label" }, label)
        ));
      }
      el.appendChild(grid);

      // Recent cases
      const casesCard = h("div", { class: "card section" });
      casesCard.appendChild(h("div", { class: "card-header" },
        h("h2", {}, h("i", { class: "fa-solid fa-clock-rotate-left" }), " Recent Cases"),
        h("a", { href: "#/cases", class: "btn btn-sm btn-outline" }, "View All")
      ));
      if (data.recentCases.length === 0) {
        casesCard.appendChild(h("div", { class: "empty" }, h("i", { class: "fa-solid fa-folder-open" }), h("h3", {}, "No cases yet"), h("p", {}, "Create a patient and run triage to get started.")));
      } else {
        const wrap = h("div", { class: "table-wrap" });
        const table = h("table");
        table.appendChild(h("thead", {}, h("tr", {}, h("th", {}, "Case #"), h("th", {}, "Patient"), h("th", {}, "Score"), h("th", {}, "Recommendation"), h("th", {}, "Status"), h("th", {}))));
        const tbody = h("tbody");
        for (const c of data.recentCases) {
          tbody.appendChild(h("tr", {},
            h("td", {}, h("strong", {}, c.case_number)),
            h("td", {}, `${c.first_name || "?"} ${c.last_name || "?"}`),
            h("td", {}, String(c.score ?? "\u2014")),
            h("td", {}, c.recommend || "\u2014"),
            h("td", {}, badge(c.status, c.status)),
            h("td", {}, h("a", { href: `#/cases/${c.id}`, class: "btn btn-sm btn-primary" }, "View"))
          ));
        }
        table.appendChild(tbody); wrap.appendChild(table); casesCard.appendChild(wrap);
      }
      el.appendChild(casesCard);

      // Recent activity
      if (data.recentAudit.length > 0) {
        const auditCard = h("div", { class: "card" });
        auditCard.appendChild(h("div", { class: "card-header" },
          h("h2", {}, h("i", { class: "fa-solid fa-shield-halved" }), " Recent Activity")
        ));
        const list = h("div");
        for (const a of data.recentAudit) {
          list.appendChild(h("div", { style: "display:flex;align-items:center;gap:.75rem;padding:.55rem 0;border-bottom:1px solid var(--border);font-size:.82rem" },
            h("span", { style: "color:var(--fg3);white-space:nowrap;font-size:.75rem;min-width:140px" }, formatDate(a.created_at)),
            badge(a.action, a.action.includes("tamper") ? "escalated" : a.action.includes("fail") ? "fail" : "pass"),
            h("span", { style: "color:var(--fg)" }, a.username || "system"),
            a.entity_id ? h("span", { style: "color:var(--fg3);font-size:.75rem" }, a.entity_type) : null
          ));
        }
        auditCard.appendChild(list); el.appendChild(auditCard);
      }
    } catch (err) { renderError(el, err.message); }
  });

  // ── Patients ───────────────────────────────────────────────────────────
  route("patients", async (el, id) => {
    if (id) return renderPatientDetail(el, id);
    el.innerHTML = '<div class="spinner"></div> Loading patients...';
    try {
      const data = await API.get("/patients");
      el.innerHTML = "";
      el.appendChild(h("div", { class: "page-header" },
        h("div", {}, h("h1", {}, "Patients"), h("div", { class: "page-subtitle" }, `${data.total} total patients`)),
        h("div", { class: "btn-group" },
          h("input", { type: "text", id: "patient-search", placeholder: "Search by name or MRN...", style: "padding:.55rem .9rem;background:var(--bg);border:1.5px solid var(--border);border-radius:var(--radius);color:var(--fg);font-size:.82rem;font-family:inherit;width:220px" }),
          h("button", { class: "btn btn-primary", id: "btn-new-patient" }, h("i", { class: "fa-solid fa-plus" }), " New Patient")
        )
      ));
      const tableWrap = h("div", { class: "card table-wrap" });
      const table = h("table");
      table.appendChild(h("thead", {}, h("tr", {}, h("th", {}, "MRN"), h("th", {}, "Name"), h("th", {}, "DOB"), h("th", {}, "Sex"), h("th", {}, "Created"), h("th", {}))));
      const tbody = h("tbody");
      function renderRows(patients) {
        tbody.innerHTML = "";
        if (patients.length === 0) { tbody.appendChild(h("tr", {}, h("td", { colspan: "6", style: "text-align:center;color:var(--fg3);padding:2.5rem" }, "No patients found"))); return; }
        for (const p of patients) {
          const initials = ((p.first_name || "?")[0] + (p.last_name || "?")[0]).toUpperCase();
          tbody.appendChild(h("tr", {},
            h("td", {}, h("code", { style: "font-size:.75rem;background:var(--bg3);padding:.15rem .4rem;border-radius:4px" }, p.mrn)),
            h("td", {}, h("div", { style: "display:flex;align-items:center;gap:.5rem" }, h("div", { class: "avatar", style: "width:28px;height:28px;font-size:.6rem;border-radius:7px" }, initials), `${p.first_name} ${p.last_name}`)),
            h("td", {}, p.dob),
            h("td", {}, p.sex || "\u2014"),
            h("td", { style: "color:var(--fg3);font-size:.78rem" }, formatDate(p.created_at)),
            h("td", {}, h("div", { class: "btn-group" }, h("a", { href: `#/patients/${p.id}`, class: "btn btn-sm btn-primary" }, "View"), h("button", { class: "btn btn-sm btn-danger", onclick: () => deletePatient(p.id, p.mrn) }, "Del")))
          ));
        }
      }
      renderRows(data.patients); table.appendChild(tbody); tableWrap.appendChild(table); el.appendChild(tableWrap);
      let searchTimeout;
      $("#patient-search").addEventListener("input", (e) => { clearTimeout(searchTimeout); searchTimeout = setTimeout(async () => { const q = e.target.value.trim(); const d = q ? await API.get(`/patients?search=${encodeURIComponent(q)}`) : await API.get("/patients"); renderRows(d.patients); }, 300); });
      $("#btn-new-patient").addEventListener("click", () => {
        showModal(`
          <h2>New Patient</h2>
          <form id="new-patient-form">
            <div class="field-row">
              <div class="field"><label>MRN</label><input name="mrn" required placeholder="MRN-00123"></div>
              <div class="field"><label>Sex</label><select name="sex"><option value="">\u2014</option><option value="M">Male</option><option value="F">Female</option><option value="Other">Other</option></select></div>
            </div>
            <div class="field-row">
              <div class="field"><label>First Name</label><input name="first_name" required placeholder="John"></div>
              <div class="field"><label>Last Name</label><input name="last_name" required placeholder="Doe"></div>
            </div>
            <div class="field"><label>Date of Birth</label><input name="dob" type="date" required></div>
            <div style="margin-top:1.25rem" class="btn-group"><button type="submit" class="btn btn-primary btn-lg">Create Patient</button><button type="button" class="btn" onclick="hideModal()">Cancel</button></div>
          </form>
        `);
        document.getElementById("new-patient-form").addEventListener("submit", async (e) => { e.preventDefault(); const fd = new FormData(e.target); try { await API.post("/patients", Object.fromEntries(fd)); hideModal(); toast("Patient created"); navigate("#/patients"); } catch (err) { toast(err.message, "error"); } });
      });
    } catch (err) { renderError(el, err.message); }
  });

  async function deletePatient(id, mrn) {
    if (!confirm(`Delete patient ${mrn}?`)) return;
    try { await API.del(`/patients/${id}`); toast("Patient deleted"); navigate("#/patients"); } catch (err) { toast(err.message, "error"); }
  }

  async function renderPatientDetail(el, id) {
    el.innerHTML = '<div class="spinner"></div> Loading patient...';
    try {
      const p = await API.get(`/patients/${id}`);
      el.innerHTML = "";
      const initials = ((p.first_name || "?")[0] + (p.last_name || "?")[0]).toUpperCase();
      el.appendChild(h("div", { class: "page-header" },
        h("div", {},
          h("a", { href: "#/patients", style: "font-size:.78rem;color:var(--fg3);display:flex;align-items:center;gap:.3rem;margin-bottom:.5rem" }, h("i", { class: "fa-solid fa-arrow-left" }), " Back to Patients"),
          h("div", { style: "display:flex;align-items:center;gap:1rem" },
            h("div", { class: "avatar", style: "width:48px;height:48px;font-size:1rem;border-radius:14px" }, initials),
            h("div", {}, h("h1", {}, `${p.first_name} ${p.last_name}`), h("p", { style: "color:var(--fg3);font-size:.85rem" }, `MRN: ${p.mrn} \u00B7 DOB: ${p.dob} \u00B7 ${p.sex || "N/A"}`))
          )
        ),
        h("div", { class: "btn-group" },
          h("button", { class: "btn", id: "btn-edit-patient" }, h("i", { class: "fa-solid fa-pen" }), " Edit"),
          h("button", { class: "btn btn-primary", id: "btn-new-case" }, h("i", { class: "fa-solid fa-plus" }), " New Case")
        )
      ));
      const casesCard = h("div", { class: "card" });
      casesCard.appendChild(h("div", { class: "card-header" }, h("h2", {}, h("i", { class: "fa-solid fa-folder-open" }), ` Cases (${p.case_count})`)));
      if (p.cases.length === 0) {
        casesCard.appendChild(h("div", { class: "empty" }, h("i", { class: "fa-solid fa-clipboard-list" }), h("h3", {}, "No cases"), h("p", {}, "Click 'New Case' to run AI triage.")));
      } else {
        const wrap = h("div", { class: "table-wrap" }); const table = h("table");
        table.appendChild(h("thead", {}, h("tr", {}, h("th", {}, "Case #"), h("th", {}, "Status"), h("th", {}, "Created"), h("th", {}))));
        const tbody = h("tbody");
        for (const c of p.cases) { tbody.appendChild(h("tr", {}, h("td", {}, h("strong", {}, c.case_number)), h("td", {}, badge(c.status, c.status)), h("td", { style: "color:var(--fg3);font-size:.78rem" }, formatDate(c.created_at)), h("td", {}, h("a", { href: `#/cases/${c.id}`, class: "btn btn-sm btn-primary" }, "View")))); }
        table.appendChild(tbody); wrap.appendChild(table); casesCard.appendChild(wrap);
      }
      el.appendChild(casesCard);

      $("#btn-edit-patient")?.addEventListener("click", () => {
        showModal(`
          <h2>Edit Patient</h2>
          <form id="edit-patient-form">
            <div class="field-row">
              <div class="field"><label>First Name</label><input name="first_name" value="${esc(p.first_name || "")}" required></div>
              <div class="field"><label>Last Name</label><input name="last_name" value="${esc(p.last_name || "")}" required></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Date of Birth</label><input name="dob" type="date" value="${p.dob || ""}" required></div>
              <div class="field"><label>Sex</label>
                <select name="sex">
                  <option value="">Select...</option>
                  <option value="M" ${p.sex === "M" ? "selected" : ""}>Male</option>
                  <option value="F" ${p.sex === "F" ? "selected" : ""}>Female</option>
                  <option value="O" ${p.sex === "O" ? "selected" : ""}>Other</option>
                </select>
              </div>
            </div>
            <div class="btn-group" style="margin-top:1.25rem">
              <button type="submit" class="btn btn-primary btn-lg">Save Changes</button>
              <button type="button" class="btn" onclick="hideModal()">Cancel</button>
            </div>
          </form>
        `);
        document.getElementById("edit-patient-form").addEventListener("submit", async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          try {
            await API.put(`/patients/${id}`, Object.fromEntries(fd));
            hideModal();
            toast("Patient updated");
            navigate(`#/patients/${id}`);
          } catch (err) { toast(err.message, "error"); }
        });
      });

      $("#btn-new-case")?.addEventListener("click", () => {
        showModal(`
          <h2>New Triage Case</h2>
          <p style="color:var(--fg3);margin-bottom:1.25rem;font-size:.85rem">Patient: ${esc(p.first_name)} ${esc(p.last_name)} (${esc(p.mrn)})</p>
          <form id="new-case-form">
            <div class="field-row">
              <div class="field"><label>Heart Rate (bpm)</label><input name="heartRate" type="number" min="0" max="400" value="130" required></div>
              <div class="field"><label>Resp Rate (brpm)</label><input name="respRate" type="number" min="0" max="100" value="26" required></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Temperature (\u00B0C)</label><input name="temp" type="number" step="0.1" min="30" max="45" value="39.1" required></div>
              <div class="field"><label>Systolic BP (mmHg)</label><input name="systolicBP" type="number" min="0" max="300" value="85" required></div>
            </div>
            <div style="margin-top:1.25rem" class="btn-group">
              <button type="submit" class="btn btn-primary btn-lg">Run Triage</button>
              <button type="button" class="btn" onclick="hideModal()">Cancel</button>
            </div>
          </form>
        `);
        document.getElementById("new-case-form").addEventListener("submit", async (e) => { e.preventDefault(); const fd = new FormData(e.target); const vitals = { heartRate: Number(fd.get("heartRate")), respRate: Number(fd.get("respRate")), temp: Number(fd.get("temp")), systolicBP: Number(fd.get("systolicBP")) }; try { const result = await API.post("/cases", { patient_id: id, vitals }); hideModal(); toast(`Case ${result.case.case_number} created \u2014 Score: ${result.recommendation.score}`); navigate(`#/cases/${result.case.id}`); } catch (err) { toast(err.message, "error"); } });
      });
    } catch (err) { renderError(el, err.message); }
  }

  // ── Cases ──────────────────────────────────────────────────────────────
  route("cases", async (el, id) => {
    if (id) return renderCaseDetail(el, id);
    el.innerHTML = '<div class="spinner"></div> Loading cases...';
    try {
      const data = await API.get("/cases");
      el.innerHTML = "";
      el.appendChild(h("div", { class: "page-header" },
        h("div", {}, h("h1", {}, "All Cases"), h("div", { class: "page-subtitle" }, `${data.total} total cases`)),
        h("a", { href: "#/patients", class: "btn btn-primary" }, h("i", { class: "fa-solid fa-plus" }), " New Case")
      ));
      const card = h("div", { class: "card table-wrap" });
      if (data.cases.length === 0) {
        card.appendChild(h("div", { class: "empty" }, h("i", { class: "fa-solid fa-folder-open" }), h("h3", {}, "No cases"), h("p", {}, "Create a patient and run triage first.")));
      } else {
        const table = h("table");
        table.appendChild(h("thead", {}, h("tr", {}, h("th", {}, "Case #"), h("th", {}, "Patient"), h("th", {}, "MRN"), h("th", {}, "Score"), h("th", {}, "Recommendation"), h("th", {}, "Status"), h("th", {}))));
        const tbody = h("tbody");
        for (const c of data.cases) { tbody.appendChild(h("tr", {}, h("td", {}, h("strong", {}, c.case_number)), h("td", {}, `${c.first_name || "?"} ${c.last_name || "?"}`), h("td", {}, h("code", { style: "font-size:.75rem;background:var(--bg3);padding:.15rem .4rem;border-radius:4px" }, c.mrn || "\u2014")), h("td", {}, String(c.score ?? "\u2014")), h("td", {}, c.recommend || "\u2014"), h("td", {}, badge(c.status, c.status)), h("td", {}, h("a", { href: `#/cases/${c.id}`, class: "btn btn-sm btn-primary" }, "View")))); }
        table.appendChild(tbody); card.appendChild(table);
      }
      el.appendChild(card);
    } catch (err) { renderError(el, err.message); }
  });

  async function renderCaseDetail(el, id) {
    el.innerHTML = '<div class="spinner"></div> Loading case...';
    try {
      const c = await API.get(`/cases/${id}`);
      el.innerHTML = "";
      el.appendChild(h("div", { class: "page-header" },
        h("div", {},
          h("a", { href: "#/cases", style: "font-size:.78rem;color:var(--fg3);display:flex;align-items:center;gap:.3rem;margin-bottom:.5rem" }, h("i", { class: "fa-solid fa-arrow-left" }), " Back to Cases"),
          h("h1", {}, c.case_number),
          h("p", { style: "color:var(--fg3);font-size:.85rem" },
            `${c.first_name || "?"} ${c.last_name || "?"} (${c.mrn || "?"}) \u00B7 `, badge(c.status, c.status)
          )
        ),
        h("div", { class: "btn-group" },
          h("button", { class: "btn btn-success", id: "btn-verify" }, h("i", { class: "fa-solid fa-shield-check" }), " Verify"),
          h("button", { class: "btn btn-danger", id: "btn-tamper" }, h("i", { class: "fa-solid fa-bolt" }), " Tamper"),
          h("select", { id: "status-select", class: "btn btn-outline" }, ...["open", "escalated", "resolved", "closed"].map(s => Object.assign(h("option", { value: s }, s), { selected: s === c.status })))
        )
      ));
      el.appendChild(h("div", { id: "verify-result" }));

      const latestVitals = c.vitals[0];
      const latestRec = c.recommendations[0];

      // Vitals + Recommendation grid
      const grid = h("div", { class: "vitals-grid" });

      // Recommendation card (left)
      if (latestRec) {
        const recCard = h("div", { style: "background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.5rem" });
        const scoreColor = latestRec.score > 50 ? "var(--red)" : "var(--green)";
        const scoreBg = latestRec.score > 50 ? "var(--red-bg)" : "var(--green-bg)";
        recCard.appendChild(h("div", { style: "font-size:.7rem;color:var(--fg3);text-transform:uppercase;font-weight:600;letter-spacing:.05em;margin-bottom:.75rem" }, "AI Recommendation"));
        recCard.appendChild(h("div", { style: "display:flex;align-items:center;gap:1rem;margin-bottom:1rem" },
          h("div", { style: `font-size:2.5rem;font-weight:800;color:${scoreColor};line-height:1` }, String(latestRec.score)),
          h("div", { style: `padding:.4rem .75rem;border-radius:var(--radius);font-weight:600;font-size:.82rem;background:${scoreBg};color:${scoreColor}` }, latestRec.recommend)
        ));
        recCard.appendChild(h("div", { style: "font-size:.75rem;color:var(--fg3)" }, `Model: ${latestRec.model_version} \u00B7 ${formatDate(latestRec.created_at)}`));
        grid.appendChild(recCard);
      }

      // Vitals card (right)
      if (latestVitals) {
        const vitCard = h("div", { style: "background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.5rem" });
        vitCard.appendChild(h("div", { style: "font-size:.7rem;color:var(--fg3);text-transform:uppercase;font-weight:600;letter-spacing:.05em;margin-bottom:.75rem" }, "Current Vitals"));
        const vitGrid = h("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:.75rem" });
        vitGrid.appendChild(h("div", { class: "vital-item" }, h("div", { class: "vital-icon heart" }, h("i", { class: "fa-solid fa-heart-pulse" })), h("div", { class: "vital-info" }, h("span", { class: "vital-label" }, "Heart Rate"), h("span", { class: "vital-value" }, `${latestVitals.heart_rate} bpm`))));
        vitGrid.appendChild(h("div", { class: "vital-item" }, h("div", { class: "vital-icon lung" }, h("i", { class: "fa-solid fa-lungs" })), h("div", { class: "vital-info" }, h("span", { class: "vital-label" }, "Resp Rate"), h("span", { class: "vital-value" }, `${latestVitals.resp_rate} brpm`))));
        vitGrid.appendChild(h("div", { class: "vital-item" }, h("div", { class: "vital-icon temp" }, h("i", { class: "fa-solid fa-temperature-half" })), h("div", { class: "vital-info" }, h("span", { class: "vital-label" }, "Temperature"), h("span", { class: "vital-value" }, `${latestVitals.temp} \u00B0C`))));
        vitGrid.appendChild(h("div", { class: "vital-item" }, h("div", { class: "vital-icon bp" }, h("i", { class: "fa-solid fa-droplet" })), h("div", { class: "vital-info" }, h("span", { class: "vital-label" }, "Systolic BP"), h("span", { class: "vital-value" }, `${latestVitals.systolic_bp} mmHg`))));
        vitCard.appendChild(vitGrid);
        grid.appendChild(vitCard);
      }
      el.appendChild(grid);

      // Evidence records
      const evCard = h("div", { class: "card section" });
      evCard.appendChild(h("div", { class: "card-header" }, h("h2", {}, h("i", { class: "fa-solid fa-shield-halved" }), ` Evidence Records (${c.evidence.length})`)));
      if (c.evidence.length === 0) {
        evCard.appendChild(h("div", { class: "empty" }, h("i", { class: "fa-solid fa-file-circle-xmark" }), h("h3", {}, "No evidence records")));
      } else {
        for (const ev of c.evidence) {
          evCard.appendChild(h("div", { class: "evidence-item" },
            h("div", { style: "display:flex;align-items:center;gap:.5rem" }, h("i", { class: "fa-solid fa-file-shield", style: "color:var(--primary)" }), h("strong", { style: "font-size:.85rem" }, "CooL Evidence Receipt")),
            h("div", { class: "evidence-meta" },
              h("span", {}, "Record: ", h("code", {}, ev.record_id.substring(0, 12) + "...")),
              h("span", {}, "Execution: ", h("code", {}, ev.execution_id.substring(0, 12) + "...")),
              h("span", {}, "Hash: ", h("code", {}, ev.binding_hash.substring(0, 16) + "...")),
              h("span", {}, formatDate(ev.created_at))
            )
          ));
        }
      }
      el.appendChild(evCard);

      // Vitals history
      if (c.vitals.length > 1) {
        const histCard = h("div", { class: "card" });
        histCard.appendChild(h("div", { class: "card-header" }, h("h2", {}, h("i", { class: "fa-solid fa-clock-rotate-left" }), " Vitals History")));
        const ht = h("table");
        ht.appendChild(h("thead", {}, h("tr", {}, h("th", {}, "Time"), h("th", {}, "HR"), h("th", {}, "RR"), h("th", {}, "Temp"), h("th", {}, "BP"))));
        const htb = h("tbody");
        for (const v of c.vitals) { htb.appendChild(h("tr", {}, h("td", {}, formatDate(v.recorded_at)), h("td", {}, `${v.heart_rate}`), h("td", {}, `${v.resp_rate}`), h("td", {}, `${v.temp}`), h("td", {}, `${v.systolic_bp}`))); }
        ht.appendChild(htb); histCard.appendChild(ht); el.appendChild(histCard);
      }

      // Verify
      $("#btn-verify").addEventListener("click", async () => {
        const banner = $("#verify-result"); banner.innerHTML = '<div class="spinner"></div> Verifying...';
        try {
          const verdict = await API.post(`/cases/${id}/verify`); banner.innerHTML = "";
          if (verdict.ok) { banner.appendChild(h("div", { class: "verify-banner pass" }, h("i", { class: "fa-solid fa-circle-check" }), " VERIFIED \u2014 Evidence is intact and untampered")); }
          else {
            const failedChecks = Object.entries(verdict.checks || {}).filter(([, v]) => v.status === "fail").map(([name, v]) => `${name}: ${v.detail}`).join("; ");
            banner.appendChild(h("div", { class: "verify-banner fail" }, h("i", { class: "fa-solid fa-triangle-exclamation" }), " TAMPERED \u2014 Verification failed", h("div", { class: "detail" }, failedChecks || (verdict.reasons || []).join("; "))));
          }
          // Render checks as a clean card
          if (verdict.checks) {
            const card = h("div", { class: "card", style: "margin-top:.75rem" });
            card.appendChild(h("div", { class: "card-header" }, h("h3", {}, h("i", { class: "fa-solid fa-clipboard-check" }), " Verification Details")));
            const tbl = h("table"); const tb = h("tbody");
            for (const [name, check] of Object.entries(verdict.checks)) {
              const icon = check.status === "pass"
                ? h("i", { class: "fa-solid fa-circle-check", style: "color:var(--green)" })
                : h("i", { class: "fa-solid fa-circle-xmark", style: "color:var(--red)" });
              tb.appendChild(h("tr", {},
                h("td", { style: "font-weight:600;text-transform:capitalize" }, name),
                h("td", {}, h("span", { class: `badge badge-${check.status === "pass" ? "pass" : "escalated"}` }, check.status)),
                h("td", { style: "color:var(--fg3);font-size:.82rem" }, check.detail || "\u2014")
              ));
            }
            tbl.appendChild(tb); card.appendChild(tbl); banner.appendChild(card);
          }
          // Subject info
          if (verdict.subject) {
            const sub = h("div", { style: "margin-top:.5rem;font-size:.78rem;color:var(--fg3);display:flex;gap:1.5rem;flex-wrap:wrap" });
            sub.appendChild(h("span", {}, h("i", { class: "fa-solid fa-fingerprint" }), ` Record: ${verdict.subject.record_id || "\u2014"}`));
            sub.appendChild(h("span", {}, h("i", { class: "fa-solid fa-microchip" }), ` Key: ${verdict.subject.key_id || "\u2014"}`));
            sub.appendChild(h("span", {}, h("i", { class: "fa-solid fa-clock" }), ` Issued: ${formatDate(verdict.subject.issued_at)}`));
            banner.appendChild(sub);
          }
          // Coded Receipt
          if (verdict.receipt) {
            const rc = verdict.receipt;
            const rec = rc.record || {};
            const sig = rec.signature || {};
            const att = rc.attestation || {};
            const runtime = rec.runtime || {};
            const incl = rc.inclusion || {};
            const sth = rc.sth || {};
            const keyDir = rc.key_directory || {};

            const receiptCard = h("div", { class: "card", style: "margin-top:.75rem" });
            receiptCard.appendChild(h("div", { class: "card-header" },
              h("h3", {}, h("i", { class: "fa-solid fa-code" }), " Coded Receipt")
            ));
            const body = h("div", { style: "padding:.75rem 1rem" });

            function fieldRow(label, value, mono) {
              const val = typeof value === "string" && value.length > 80 ? value.slice(0, 80) + "..." : (value || "\u2014");
              return h("tr", {},
                h("td", { style: "font-weight:600;white-space:nowrap;padding:.3rem .75rem .3rem 0;color:var(--fg2)" }, label),
                h("td", { style: `padding:.3rem 0;font-size:.82rem;${mono ? "font-family:monospace;word-break:break-all;color:var(--fg3)" : "color:var(--fg3)"}` }, String(val))
              );
            }

            function section(title) {
              return h("tr", {},
                h("td", { colspan: "2", style: "font-weight:700;padding:.6rem 0 .3rem;border-top:1px solid var(--border);color:var(--green);font-size:.8rem;text-transform:uppercase;letter-spacing:.5px" },
                  h("i", { class: "fa-solid fa-caret-right" }), " " + title
                )
              );
            }

            const tbl = h("table", { style: "width:100%" });
            const tb = h("tbody");
            tb.appendChild(section("Schema"));
            tb.appendChild(fieldRow("Schema", rc.schema, true));
            tb.appendChild(fieldRow("Record ID", rec.record_id, true));

            tb.appendChild(section("Record"));
            tb.appendChild(fieldRow("Event Type", rec.event?.type));
            tb.appendChild(fieldRow("App ID", rec.event?.application_id));
            tb.appendChild(fieldRow("Execution ID", rec.event?.execution_id, true));
            tb.appendChild(fieldRow("Issued At", rec.time?.issued_at));
            tb.appendChild(fieldRow("Model", rec.event?.software?.name));
            tb.appendChild(fieldRow("Version", rec.event?.software?.version));

            tb.appendChild(section("Commitments"));
            const commits = rec.event?.commitments || {};
            if (commits.input) tb.appendChild(fieldRow("Input Hash", commits.input, true));
            if (commits.output) tb.appendChild(fieldRow("Output Hash", commits.output, true));

            tb.appendChild(section("Signature"));
            tb.appendChild(fieldRow("Algorithm", sig.alg));
            tb.appendChild(fieldRow("Key ID", sig.key_id, true));
            tb.appendChild(fieldRow("ML-DSA (truncated)", sig.ml_dsa?.slice(0, 60) + "...", true));

            tb.appendChild(section("Runtime"));
            tb.appendChild(fieldRow("TEE Vendor", runtime.tee_vendor));
            tb.appendChild(fieldRow("Mode", runtime.mode));
            tb.appendChild(fieldRow("MRTD", runtime.enclave_measurement?.mrtd?.slice(0, 50) + "...", true));

            tb.appendChild(section("Inclusion"));
            tb.appendChild(fieldRow("Leaf Index", incl.leaf_index));
            tb.appendChild(fieldRow("Tree Size", incl.tree_size));

            tb.appendChild(section("Signed Tree Head"));
            tb.appendChild(fieldRow("Log ID", sth.log_id));
            tb.appendChild(fieldRow("Root Hash", sth.root_hash?.slice(0, 50) + "...", true));
            tb.appendChild(fieldRow("Timestamp", sth.timestamp));

            tb.appendChild(section("Attestation"));
            tb.appendChild(fieldRow("Mode", att.mode));
            tb.appendChild(fieldRow("Note", att.note));

            tb.appendChild(section("Key Directory"));
            for (const [kid, kv] of Object.entries(keyDir)) {
              tb.appendChild(fieldRow(kid, kv.ml_dsa_pub?.slice(0, 50) + "...", true));
            }

            tb.appendChild(section("Binding Hash"));
            tb.appendChild(fieldRow("Hash", rc.binding_hash, true));

            tbl.appendChild(tb);
            body.appendChild(tbl);
            receiptCard.appendChild(body);
            banner.appendChild(receiptCard);
          }
        } catch (err) { banner.innerHTML = ""; banner.appendChild(h("div", { class: "verify-banner fail" }, h("i", { class: "fa-solid fa-circle-xmark" }), " Error: " + err.message)); }
      });

      // Tamper
      $("#btn-tamper").addEventListener("click", async () => {
        if (!confirm("Simulate tampering? This will mutate stored vitals and recommendation.")) return;
        try { await API.post(`/cases/${id}/tamper`); toast("Record tampered \u2014 run Verify to detect", "error"); renderCaseDetail(el, id); } catch (err) { toast(err.message, "error"); }
      });

      // Status change
      $("#status-select").addEventListener("change", async (e) => {
        try { await API.patch(`/cases/${id}/status`, { status: e.target.value }); toast(`Status updated to ${e.target.value}`); } catch (err) { toast(err.message, "error"); }
      });
    } catch (err) { renderError(el, err.message); }
  }

  // ── Audit Log ──────────────────────────────────────────────────────────
  route("audit", async (el) => {
    el.innerHTML = '<div class="spinner"></div> Loading audit log...';
    try {
      const data = await API.get("/audit");
      el.innerHTML = "";
      el.appendChild(h("div", { class: "page-header" },
        h("div", {}, h("h1", {}, "Audit Trail"), h("div", { class: "page-subtitle" }, `${data.total} total entries`))
      ));
      const card = h("div", { class: "card table-wrap" });
      const table = h("table");
      table.appendChild(h("thead", {}, h("tr", {}, h("th", { style: "width:160px" }, "Timestamp"), h("th", { style: "width:100px" }, "User"), h("th", { style: "width:140px" }, "Action"), h("th", { style: "width:120px" }, "Entity"), h("th", {}, "Details"), h("th", { style: "width:90px" }, "IP"))));
      const tbody = h("tbody");
      function actionBadge(action) {
        if (action.includes("tamper")) return badge(action, "escalated");
        if (action.includes("fail")) return badge(action, "fail");
        if (action.includes("create")) return badge(action, "pass");
        if (action.includes("delete")) return badge(action, "fail");
        if (action.includes("update") || action.includes("status")) return badge(action, "open");
        if (action.includes("login")) return badge(action, action.includes("success") ? "pass" : "fail");
        return badge(action, "open");
      }
      function formatDetails(details) {
        if (!details || details === "null") return h("span", { style: "color:var(--fg4)" }, "\u2014");
        try {
          const obj = typeof details === "string" ? JSON.parse(details) : details;
          const wrapper = h("div");
          for (const [k, v] of Object.entries(obj)) { const val = typeof v === "object" ? JSON.stringify(v) : String(v); wrapper.appendChild(h("div", { style: "font-size:.78rem;line-height:1.4" }, h("span", { style: "color:var(--fg3)" }, k + ": "), h("span", {}, val))); }
          return wrapper;
        } catch { return h("span", { style: "font-size:.78rem" }, details); }
      }
      function formatTime(ts) {
        if (!ts) return "\u2014";
        const d = new Date(ts + (ts.endsWith("Z") ? "" : "Z"));
        return h("div", {}, h("div", { style: "font-weight:500;font-size:.82rem" }, d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })), h("div", { style: "font-size:.7rem;color:var(--fg3)" }, d.toLocaleDateString("en-US", { month: "short", day: "numeric" })));
      }
      for (const a of data.logs) {
        const entityText = a.entity_id ? h("span", {}, h("span", { style: "color:var(--fg3)" }, a.entity_type + " "), h("code", { style: "font-size:.72rem;background:var(--bg3);padding:.1rem .35rem;border-radius:4px" }, a.entity_id.substring(0, 8))) : h("span", { style: "color:var(--fg4)" }, a.entity_type || "\u2014");
        tbody.appendChild(h("tr", {}, h("td", {}, formatTime(a.created_at)), h("td", {}, h("strong", {}, a.username || "system")), h("td", {}, actionBadge(a.action)), h("td", {}, entityText), h("td", {}, formatDetails(a.details)), h("td", { style: "color:var(--fg3);font-family:monospace;font-size:.72rem" }, a.ip_address || "\u2014")));
      }
      table.appendChild(tbody); card.appendChild(table); el.appendChild(card);
    } catch (err) { renderError(el, err.message); }
  });

  // ── Users (Admin) ─────────────────────────────────────────────────────
  route("users", async (el) => {
    el.innerHTML = '<div class="spinner"></div> Loading users...';
    try {
      const users = await API.get("/auth/users");
      el.innerHTML = "";
      el.appendChild(h("div", { class: "page-header" },
        h("div", {}, h("h1", {}, "User Management"), h("div", { class: "page-subtitle" }, `${users.length} registered users`)),
        h("button", { class: "btn btn-primary", id: "btn-new-user" }, h("i", { class: "fa-solid fa-user-plus" }), " New User")
      ));
      const card = h("div", { class: "card table-wrap" });
      const table = h("table");
      table.appendChild(h("thead", {}, h("tr", {}, h("th", {}, "Username"), h("th", {}, "Full Name"), h("th", {}, "Role"), h("th", {}, "Created"), h("th", {}))));
      const tbody = h("tbody");
      const roleColors = { admin: "red", doctor: "blue", nurse: "green", auditor: "purple" };
      for (const u of users) {
        const initials = ((u.full_name || "?")[0] + (u.full_name || "?").split(" ").pop()[0]).toUpperCase();
        tbody.appendChild(h("tr", {},
          h("td", {}, h("strong", {}, u.username)),
          h("td", {}, h("div", { style: "display:flex;align-items:center;gap:.5rem" }, h("div", { class: "avatar", style: `width:28px;height:28px;font-size:.6rem;border-radius:7px;background:var(--${roleColors[u.role] || "primary"})` }, initials), u.full_name)),
          h("td", {}, badge(u.role, u.role === "admin" ? "escalated" : u.role === "doctor" ? "open" : u.role === "nurse" ? "pass" : "simulated")),
          h("td", { style: "color:var(--fg3);font-size:.78rem" }, formatDate(u.created_at)),
          h("td", {}, h("button", { class: "btn btn-sm btn-danger", onclick: () => deleteUser(u.id, u.username) }, "Delete"))
        ));
      }
      table.appendChild(tbody); card.appendChild(table); el.appendChild(card);

      $("#btn-new-user").addEventListener("click", () => {
        const pw = generateTempPassword();
        showModal(`
          <h2>New User</h2>
          <form id="new-user-form">
            <div class="field-row">
              <div class="field"><label>Username</label><input name="username" required placeholder="jane.doe"></div>
              <div class="field"><label>Full Name</label><input name="full_name" required placeholder="Jane Doe"></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Role</label>
                <select name="role" required>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="auditor">Auditor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div class="field"><label>Password</label><input name="password" id="new-user-pw" value="${esc(pw)}" required></div>
            </div>
            <div style="margin-bottom:1rem;font-size:.78rem;color:var(--fg3)">
              Auto-generated password shown above. Copy it before saving — it won't be shown again.
              <button type="button" class="btn btn-sm btn-ghost" id="btn-regen-pw" style="margin-left:.25rem"><i class="fa-solid fa-rotate"></i> Regenerate</button>
            </div>
            <div class="btn-group">
              <button type="submit" class="btn btn-primary btn-lg">Create User</button>
              <button type="button" class="btn" onclick="hideModal()">Cancel</button>
            </div>
          </form>
        `);
        document.getElementById("btn-regen-pw").addEventListener("click", () => {
          document.getElementById("new-user-pw").value = generateTempPassword();
        });
        document.getElementById("new-user-form").addEventListener("submit", async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          try {
            const res = await API.post("/auth/users", Object.fromEntries(fd));
            hideModal();
            showModal(`
              <h2>User Created</h2>
              <div style="padding:1.25rem;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);margin:1rem 0">
                <div style="display:flex;justify-content:space-between;margin-bottom:.5rem"><span style="color:var(--fg3);font-size:.82rem">Username</span><strong>${esc(res.user.username)}</strong></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:.5rem"><span style="color:var(--fg3);font-size:.82rem">Full Name</span><strong>${esc(res.user.full_name)}</strong></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:.5rem"><span style="color:var(--fg3);font-size:.82rem">Role</span><strong>${esc(res.user.role)}</strong></div>
                <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:.5rem;margin-top:.5rem"><span style="color:var(--fg3);font-size:.82rem">Password</span><code style="background:var(--bg3);padding:.2rem .5rem;border-radius:5px;font-weight:700;color:var(--primary)">${esc(res.password)}</code></div>
              </div>
              <p style="font-size:.78rem;color:var(--red);margin-bottom:1rem"><i class="fa-solid fa-triangle-exclamation"></i> Copy this password now. It will NOT be shown again.</p>
              <button type="button" class="btn btn-primary" onclick="hideModal()">Done</button>
            `);
            navigate("#/users");
          } catch (err) { toast(err.message, "error"); }
        });
      });
    } catch (err) { renderError(el, err.message); }
  });

  function generateTempPassword() {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pw = "";
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    return pw;
  }

  async function deleteUser(id, username) {
    if (!confirm(`Delete user "${username}"?`)) return;
    try { await API.del(`/auth/users/${id}`); toast("User deleted"); navigate("#/users"); } catch (err) { toast(err.message, "error"); }
  }

  // ── Modal ──────────────────────────────────────────────────────────────
  window.showModal = function (html) { $("#modal-content").innerHTML = html; $("#modal-overlay").style.display = "flex"; };
  window.hideModal = function () { $("#modal-overlay").style.display = "none"; };
  $("#modal-overlay").addEventListener("click", (e) => { if (e.target === e.currentTarget) hideModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#modal-overlay").style.display === "flex") hideModal(); });

  // ── Global Search ───────────────────────────────────────────────────────
  let globalSearchTimeout;
  $("#global-search")?.addEventListener("input", (e) => {
    clearTimeout(globalSearchTimeout);
    const q = e.target.value.trim();
    if (!q) return;
    globalSearchTimeout = setTimeout(() => { window.location.hash = `#/patients?search=${encodeURIComponent(q)}`; }, 400);
  });

  // ── Theme Toggle ───────────────────────────────────────────────────────
  function getTheme() {
    return localStorage.getItem("medev-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const iconClass = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    const icon = $("#theme-toggle i");
    if (icon) icon.className = iconClass;
    const loginIcon = $("#login-theme-toggle i");
    if (loginIcon) loginIcon.className = iconClass;
    localStorage.setItem("medev-theme", theme);
  }
  applyTheme(getTheme());
  $("#theme-toggle").addEventListener("click", () => {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });
  $("#login-theme-toggle")?.addEventListener("click", () => {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem("medev-theme")) applyTheme(e.matches ? "dark" : "light");
  });

  // ── Init ──────────────────────────────────────────────────────────────
  if (API.isLoggedIn()) showApp(); else showLogin();
})();
