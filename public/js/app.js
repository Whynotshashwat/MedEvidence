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

  // ── Router ────────────────────────────────────────────────────────────────
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
      if (viewEl) {
        viewEl.style.display = "block";
        routes[name](viewEl, param);
      }
    } else {
      const main = $("#main-content");
      if (main) {
        main.style.display = "block";
        main.innerHTML = '<div class="empty"><h3>Page Not Found</h3><p>The page you\'re looking for doesn\'t exist.</p></div>';
      }
    }
  }

  window.addEventListener("hashchange", () => navigate(location.hash));

  // ── Login ─────────────────────────────────────────────────────────────────
  function showLogin() {
    $("#view-login").style.display = "flex";
    $("#app-shell").style.display = "none";
  }

  function showApp() {
    $("#view-login").style.display = "none";
    $("#app-shell").style.display = "flex";
    const user = API.getUser();
    if (user) {
      $("#nav-user").textContent = `${user.full_name} (${user.role})`;
      $$("[data-roles]").forEach((el) => {
        const roles = el.dataset.roles.split(",");
        el.style.display = roles.includes(user.role) ? "block" : "none";
      });
    }
    if (!location.hash || location.hash === "#/") location.hash = "#/dashboard";
    else navigate(location.hash);
  }

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $("#login-error");
    errEl.style.display = "none";
    try {
      await API.login($("#login-user").value, $("#login-pass").value);
      showApp();
      toast("Signed in successfully");
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = "block";
    }
  });

  $("#btn-logout").addEventListener("click", () => {
    API.logout();
    showLogin();
  });

  // ── Dashboard ─────────────────────────────────────────────────────────────
  route("dashboard", async (el) => {
    el.innerHTML = '<div class="spinner"></div> Loading...';
    try {
      const data = await API.get("/dashboard");
      const s = data.stats;
      el.innerHTML = "";

      const grid = h("div", { class: "stat-grid" });
      const stats = [
        ["Patients", s.totalPatients, ""],
        ["Total Cases", s.totalCases, ""],
        ["Open", s.openCases, "open"],
        ["Escalated", s.escalatedCases, "escalated"],
        ["Resolved", s.resolvedCases, "resolved"],
        ["Evidence Records", s.totalEvidence, ""],
      ];
      for (const [label, value, cls] of stats) {
        const card = h("div", { class: "stat-card" },
          h("div", { class: "stat-value" }, String(value)),
          h("div", { class: "stat-label" }, label)
        );
        grid.appendChild(card);
      }
      el.appendChild(grid);

      // Recent cases
      const casesCard = h("div", { class: "card section" });
      casesCard.appendChild(h("div", { class: "card-header" }, h("h2", {}, "Recent Cases")));
      if (data.recentCases.length === 0) {
        casesCard.appendChild(h("div", { class: "empty" }, h("h3", {}, "No cases yet"), h("p", {}, "Create a patient and run triage to get started.")));
      } else {
        const wrap = h("div", { class: "table-wrap" });
        const table = h("table");
        table.appendChild(h("thead", {}, h("tr", {},
          h("th", {}, "Case #"), h("th", {}, "Patient"), h("th", {}, "Score"), h("th", {}, "Recommendation"), h("th", {}, "Status"), h("th", {})
        )));
        const tbody = h("tbody");
        for (const c of data.recentCases) {
          tbody.appendChild(h("tr", {},
            h("td", {}, c.case_number),
            h("td", {}, `${c.first_name || "?"} ${c.last_name || "?"}`),
            h("td", {}, String(c.score ?? "\u2014")),
            h("td", {}, c.recommend || "\u2014"),
            h("td", {}, badge(c.status, c.status)),
            h("td", {}, h("a", { href: `#/cases/${c.id}`, class: "btn btn-sm" }, "View"))
          ));
        }
        table.appendChild(tbody);
        wrap.appendChild(table);
        casesCard.appendChild(wrap);
      }
      el.appendChild(casesCard);

      // Recent audit
      if (data.recentAudit.length > 0) {
        const auditCard = h("div", { class: "card" });
        auditCard.appendChild(h("div", { class: "card-header" }, h("h2", {}, "Recent Activity")));
        const list = h("div");
        for (const a of data.recentAudit) {
          list.appendChild(h("div", { style: "padding:0.4rem 0;border-bottom:1px solid var(--border);font-size:0.82rem" },
            h("span", { style: "color:var(--fg3)" }, formatDate(a.created_at) + " "),
            h("span", { style: "color:var(--accent)" }, a.username + " "),
            h("span", {}, a.action + " "),
            a.entity_id ? h("span", { style: "color:var(--fg3)" }, `(${a.entity_type})`) : null
          ));
        }
        auditCard.appendChild(list);
        el.appendChild(auditCard);
      }
    } catch (err) {
      renderError(el, err.message);
    }
  });

  // ── Patients (list + detail in one handler) ────────────────────────────────
  route("patients", async (el, id) => {
    if (id) return renderPatientDetail(el, id);

    el.innerHTML = '<div class="spinner"></div> Loading patients...';
    try {
      const data = await API.get("/patients");
      el.innerHTML = "";

      const header = h("div", { class: "page-header" },
        h("h1", {}, "Patients"),
        h("div", { class: "btn-group" },
          h("input", { type: "text", id: "patient-search", placeholder: "Search...", style: "padding:0.5rem;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);color:var(--fg);font-size:0.85rem" }),
          h("button", { class: "btn btn-primary", id: "btn-new-patient" }, "+ New Patient")
        )
      );
      el.appendChild(header);

      const tableWrap = h("div", { class: "card table-wrap" });
      const table = h("table");
      table.appendChild(h("thead", {}, h("tr", {},
        h("th", {}, "MRN"), h("th", {}, "Name"), h("th", {}, "DOB"), h("th", {}, "Sex"), h("th", {}, "Created"), h("th", {})
      )));
      const tbody = h("tbody");

      function renderRows(patients) {
        tbody.innerHTML = "";
        if (patients.length === 0) {
          tbody.appendChild(h("tr", {}, h("td", { colspan: "6", style: "text-align:center;color:var(--fg3);padding:2rem" }, "No patients found")));
          return;
        }
        for (const p of patients) {
          tbody.appendChild(h("tr", {},
            h("td", {}, p.mrn),
            h("td", {}, `${p.first_name} ${p.last_name}`),
            h("td", {}, p.dob),
            h("td", {}, p.sex || "\u2014"),
            h("td", {}, formatDate(p.created_at)),
            h("td", {},
              h("a", { href: `#/patients/${p.id}`, class: "btn btn-sm" }, "View"),
              h("button", { class: "btn btn-sm btn-danger", onclick: () => deletePatient(p.id, p.mrn) }, "Del")
            )
          ));
        }
      }

      renderRows(data.patients);
      table.appendChild(tbody);
      tableWrap.appendChild(table);
      el.appendChild(tableWrap);

      let searchTimeout;
      $("#patient-search").addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
          const q = e.target.value.trim();
          const d = q ? await API.get(`/patients?search=${encodeURIComponent(q)}`) : await API.get("/patients");
          renderRows(d.patients);
        }, 300);
      });

      $("#btn-new-patient").addEventListener("click", () => showModal(`
        <h2>New Patient</h2>
        <form id="new-patient-form">
          <div class="field-row">
            <div class="field"><label>MRN</label><input name="mrn" required placeholder="e.g. MRN-00123"></div>
            <div class="field"><label>Sex</label><select name="sex"><option value="">\u2014</option><option value="M">Male</option><option value="F">Female</option><option value="Other">Other</option></select></div>
          </div>
          <div class="field-row">
            <div class="field"><label>First Name</label><input name="first_name" required></div>
            <div class="field"><label>Last Name</label><input name="last_name" required></div>
          </div>
          <div class="field"><label>Date of Birth</label><input name="dob" type="date" required></div>
          <div style="margin-top:1rem" class="btn-group"><button type="submit" class="btn btn-primary">Create</button><button type="button" class="btn" onclick="document.getElementById('modal-overlay').style.display='none'">Cancel</button></div>
        </form>
      `));

      document.getElementById("new-patient-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await API.post("/patients", Object.fromEntries(fd));
          hideModal();
          toast("Patient created");
          navigate("#/patients");
        } catch (err) { toast(err.message, "error"); }
      });
    } catch (err) {
      renderError(el, err.message);
    }
  });

  async function deletePatient(id, mrn) {
    if (!confirm(`Delete patient ${mrn}?`)) return;
    try {
      await API.del(`/patients/${id}`);
      toast("Patient deleted");
      navigate("#/patients");
    } catch (err) { toast(err.message, "error"); }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderError(container, message) {
    container.innerHTML = "";
    container.appendChild(h("div", { class: "empty" },
      h("h3", {}, "Error"),
      h("p", {}, message)
    ));
  }

  async function renderPatientDetail(el, id) {
    el.innerHTML = '<div class="spinner"></div> Loading patient...';
    try {
      const p = await API.get(`/patients/${id}`);
      el.innerHTML = "";

      el.appendChild(h("div", { class: "page-header" },
        h("div", {},
          h("a", { href: "#/patients", style: "font-size:0.82rem;color:var(--fg3)" }, "\u2190 Back to Patients"),
          h("h1", {}, `${p.first_name} ${p.last_name}`),
          h("p", { style: "color:var(--fg2);font-size:0.88rem" }, `MRN: ${p.mrn} | DOB: ${p.dob} | Sex: ${p.sex || "\u2014"}`)
        ),
        h("button", { class: "btn btn-primary", id: "btn-new-case" }, "+ New Case")
      ));

      const casesCard = h("div", { class: "card" });
      casesCard.appendChild(h("div", { class: "card-header" }, h("h2", {}, `Cases (${p.case_count})`)));

      if (p.cases.length === 0) {
        casesCard.appendChild(h("div", { class: "empty" }, h("h3", {}, "No cases"), h("p", {}, "Click 'New Case' to run AI triage.")));
      } else {
        const wrap = h("div", { class: "table-wrap" });
        const table = h("table");
        table.appendChild(h("thead", {}, h("tr", {}, h("th", {}, "Case #"), h("th", {}, "Status"), h("th", {}, "Created"), h("th", {}))));
        const tbody = h("tbody");
        for (const c of p.cases) {
          tbody.appendChild(h("tr", {},
            h("td", {}, c.case_number),
            h("td", {}, badge(c.status, c.status)),
            h("td", {}, formatDate(c.created_at)),
            h("td", {}, h("a", { href: `#/cases/${c.id}`, class: "btn btn-sm" }, "View"))
          ));
        }
        table.appendChild(tbody);
        wrap.appendChild(table);
        casesCard.appendChild(wrap);
      }
      el.appendChild(casesCard);

      $("#btn-new-case")?.addEventListener("click", () => showModal(`
        <h2>New Triage Case</h2>
        <p style="color:var(--fg2);margin-bottom:1rem;font-size:0.85rem">Patient: ${p.first_name} ${p.last_name} (${p.mrn})</p>
        <form id="new-case-form">
          <div class="field-row">
            <div class="field"><label>Heart Rate (bpm)</label><input name="heartRate" type="number" value="130" required></div>
            <div class="field"><label>Resp Rate (brpm)</label><input name="respRate" type="number" value="26" required></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Temperature (\u00B0C)</label><input name="temp" type="number" step="0.1" value="39.1" required></div>
            <div class="field"><label>Systolic BP (mmHg)</label><input name="systolicBP" type="number" value="85" required></div>
          </div>
          <div style="margin-top:1rem" class="btn-group">
            <button type="submit" class="btn btn-primary">Run Triage</button>
            <button type="button" class="btn" onclick="document.getElementById('modal-overlay').style.display='none'">Cancel</button>
          </div>
        </form>
      `));

      document.getElementById("new-case-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const vitals = {
          heartRate: Number(fd.get("heartRate")),
          respRate: Number(fd.get("respRate")),
          temp: Number(fd.get("temp")),
          systolicBP: Number(fd.get("systolicBP")),
        };
        try {
          const result = await API.post("/cases", { patient_id: id, vitals });
          hideModal();
          toast(`Case ${result.case.case_number} created \u2014 Score: ${result.recommendation.score}`);
          navigate(`#/cases/${result.case.id}`);
        } catch (err) { toast(err.message, "error"); }
      });
    } catch (err) {
      renderError(el, err.message);
    }
  }

  // ── Cases (list + detail in one handler) ──────────────────────────────────
  route("cases", async (el, id) => {
    if (id) return renderCaseDetail(el, id);

    el.innerHTML = '<div class="spinner"></div> Loading cases...';
    try {
      const data = await API.get("/cases");
      el.innerHTML = "";

      el.appendChild(h("div", { class: "page-header" }, h("h1", {}, "All Cases")));

      const card = h("div", { class: "card table-wrap" });
      if (data.cases.length === 0) {
        card.appendChild(h("div", { class: "empty" }, h("h3", {}, "No cases"), h("p", {}, "Create a patient and run triage first.")));
      } else {
        const table = h("table");
        table.appendChild(h("thead", {}, h("tr", {},
          h("th", {}, "Case #"), h("th", {}, "Patient"), h("th", {}, "MRN"), h("th", {}, "Score"), h("th", {}, "Recommendation"), h("th", {}, "Status"), h("th", {})
        )));
        const tbody = h("tbody");
        for (const c of data.cases) {
          tbody.appendChild(h("tr", {},
            h("td", {}, c.case_number),
            h("td", {}, `${c.first_name || "?"} ${c.last_name || "?"}`),
            h("td", {}, c.mrn || "\u2014"),
            h("td", {}, String(c.score ?? "\u2014")),
            h("td", {}, c.recommend || "\u2014"),
            h("td", {}, badge(c.status, c.status)),
            h("td", {}, h("a", { href: `#/cases/${c.id}`, class: "btn btn-sm" }, "View"))
          ));
        }
        table.appendChild(tbody);
        card.appendChild(table);
      }
      el.appendChild(card);
    } catch (err) {
      renderError(el, err.message);
    }
  });

  async function renderCaseDetail(el, id) {
    el.innerHTML = '<div class="spinner"></div> Loading case...';
    try {
      const c = await API.get(`/cases/${id}`);
      el.innerHTML = "";

      el.appendChild(h("div", { class: "page-header" },
        h("div", {},
          h("a", { href: "#/cases", style: "font-size:0.82rem;color:var(--fg3)" }, "\u2190 Back to Cases"),
          h("h1", {}, `${c.case_number}`),
          h("p", { style: "color:var(--fg2);font-size:0.88rem" },
            `Patient: ${c.first_name || "?"} ${c.last_name || "?"} (${c.mrn || "?"}) | `,
            badge(c.status, c.status)
          )
        ),
        h("div", { class: "btn-group" },
          h("button", { class: "btn btn-success", id: "btn-verify" }, "Verify Evidence"),
          h("button", { class: "btn btn-danger", id: "btn-tamper" }, "Simulate Tamper"),
          h("select", { id: "status-select", class: "btn" },
            ...["open", "escalated", "resolved", "closed"].map(s =>
              Object.assign(h("option", { value: s }, s), { selected: s === c.status })
            )
          )
        )
      ));

      el.appendChild(h("div", { id: "verify-result" }));

      const latestVitals = c.vitals[0];
      const latestRec = c.recommendations[0];

      const infoGrid = h("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem" });

      // Vitals card
      const vitalsCard = h("div", { class: "card" });
      vitalsCard.appendChild(h("div", { class: "card-header" }, h("h2", {}, "Current Vitals")));
      if (latestVitals) {
        const vt = h("table");
        vt.appendChild(h("tbody", {},
          h("tr", {}, h("td", {}, "Heart Rate"), h("td", { style: "font-weight:600" }, `${latestVitals.heart_rate} bpm`)),
          h("tr", {}, h("td", {}, "Resp Rate"), h("td", { style: "font-weight:600" }, `${latestVitals.resp_rate} brpm`)),
          h("tr", {}, h("td", {}, "Temperature"), h("td", { style: "font-weight:600" }, `${latestVitals.temp} \u00B0C`)),
          h("tr", {}, h("td", {}, "Systolic BP"), h("td", { style: "font-weight:600" }, `${latestVitals.systolic_bp} mmHg`)),
          h("tr", {}, h("td", {}, "Recorded"), h("td", {}, formatDate(latestVitals.recorded_at)))
        ));
        vitalsCard.appendChild(vt);
      }
      infoGrid.appendChild(vitalsCard);

      // Recommendation card
      const recCard = h("div", { class: "card" });
      recCard.appendChild(h("div", { class: "card-header" }, h("h2", {}, "AI Recommendation")));
      if (latestRec) {
        recCard.appendChild(h("div", { style: "margin-bottom:0.5rem" },
          h("div", { style: "font-size:2rem;font-weight:700" }, String(latestRec.score)),
          h("div", { style: "font-size:0.78rem;color:var(--fg3);text-transform:uppercase" }, "Triage Score")
        ));
        recCard.appendChild(h("div", { style: `padding:0.5rem 0.75rem;border-radius:var(--radius);font-weight:600;background:${latestRec.score > 50 ? "var(--red-bg)" : "var(--green-bg)"};color:${latestRec.score > 50 ? "var(--red)" : "var(--green)"}` },
          latestRec.recommend
        ));
        recCard.appendChild(h("div", { style: "margin-top:0.5rem;font-size:0.78rem;color:var(--fg3)" }, `Model: ${latestRec.model_version} | ${formatDate(latestRec.created_at)}`));
      }
      infoGrid.appendChild(recCard);
      el.appendChild(infoGrid);

      // Evidence records
      const evCard = h("div", { class: "card section" });
      evCard.appendChild(h("div", { class: "card-header" }, h("h2", {}, `Evidence Records (${c.evidence.length})`)));
      if (c.evidence.length === 0) {
        evCard.appendChild(h("div", { class: "empty" }, "No evidence records"));
      } else {
        for (const ev of c.evidence) {
          evCard.appendChild(h("div", { style: "padding:0.6rem 0;border-bottom:1px solid var(--border);font-size:0.82rem" },
            h("div", {}, h("strong", {}, "Record ID: "), ev.record_id),
            h("div", { style: "color:var(--fg3)" }, `Execution: ${ev.execution_id}`),
            h("div", { style: "color:var(--fg3)" }, `Binding Hash: ${ev.binding_hash.substring(0, 32)}...`),
            h("div", { style: "color:var(--fg3)" }, `Created: ${formatDate(ev.created_at)}`)
          ));
        }
      }
      el.appendChild(evCard);

      // Vitals history
      if (c.vitals.length > 1) {
        const histCard = h("div", { class: "card" });
        histCard.appendChild(h("div", { class: "card-header" }, h("h2", {}, "Vitals History")));
        const ht = h("table");
        ht.appendChild(h("thead", {}, h("tr", {}, h("th", {}, "Time"), h("th", {}, "HR"), h("th", {}, "RR"), h("th", {}, "Temp"), h("th", {}, "BP"))));
        const htb = h("tbody");
        for (const v of c.vitals) {
          htb.appendChild(h("tr", {},
            h("td", {}, formatDate(v.recorded_at)),
            h("td", {}, `${v.heart_rate}`),
            h("td", {}, `${v.resp_rate}`),
            h("td", {}, `${v.temp}`),
            h("td", {}, `${v.systolic_bp}`)
          ));
        }
        ht.appendChild(htb);
        histCard.appendChild(ht);
        el.appendChild(histCard);
      }

      // Verify button
      $("#btn-verify").addEventListener("click", async () => {
        const banner = $("#verify-result");
        banner.innerHTML = '<div class="spinner"></div> Verifying...';
        try {
          const verdict = await API.post(`/cases/${id}/verify`);
          banner.innerHTML = "";
          if (verdict.ok) {
            banner.appendChild(h("div", { class: "verify-banner pass" }, "VERIFIED \u2014 evidence matches"));
          } else {
            const failedChecks = Object.entries(verdict.checks || {})
              .filter(([, v]) => v.status === "fail")
              .map(([name, v]) => `${name}: ${v.detail}`)
              .join("; ");
            banner.appendChild(h("div", { class: "verify-banner fail" },
              "TAMPERED \u2014 verification failed",
              h("div", { class: "detail" }, failedChecks || (verdict.reasons || []).join("; "))
            ));
          }
          banner.appendChild(h("pre", {}, JSON.stringify(verdict, null, 2)));
        } catch (err) { banner.innerHTML = ""; banner.appendChild(h("div", { class: "verify-banner fail" }, "Error: " + err.message)); }
      });

      // Tamper button
      $("#btn-tamper").addEventListener("click", async () => {
        if (!confirm("Simulate tampering with this case record? This will mutate the stored vitals and recommendation.")) return;
        try {
          await API.post(`/cases/${id}/tamper`);
          toast("Record tampered \u2014 run Verify to detect", "error");
          renderCaseDetail(el, id);
        } catch (err) { toast(err.message, "error"); }
      });

      // Status change
      $("#status-select").addEventListener("change", async (e) => {
        try {
          await API.patch(`/cases/${id}/status`, { status: e.target.value });
          toast(`Status updated to ${e.target.value}`);
        } catch (err) { toast(err.message, "error"); }
      });
    } catch (err) {
      renderError(el, err.message);
    }
  }

  // ── Audit Log ─────────────────────────────────────────────────────────────
  route("audit", async (el) => {
    el.innerHTML = '<div class="spinner"></div> Loading audit log...';
    try {
      const data = await API.get("/audit");
      el.innerHTML = "";

      el.appendChild(h("div", { class: "page-header" },
        h("h1", {}, "Audit Trail"),
        h("span", { style: "color:var(--fg2);font-size:0.85rem" }, `${data.total} total entries`)
      ));

      const card = h("div", { class: "card table-wrap" });
      const table = h("table");
      table.appendChild(h("thead", {}, h("tr", {},
        h("th", { style: "width:180px" }, "Timestamp"),
        h("th", { style: "width:120px" }, "User"),
        h("th", { style: "width:160px" }, "Action"),
        h("th", { style: "width:140px" }, "Entity"),
        h("th", {}, "Details"),
        h("th", { style: "width:100px" }, "IP Address")
      )));
      const tbody = h("tbody");

      function actionBadge(action) {
        if (action.includes("fail")) return badge(action, "fail");
        if (action.includes("tamper")) return badge(action, "escalated");
        if (action.includes("create")) return badge(action, "pass");
        if (action.includes("delete")) return badge(action, "fail");
        if (action.includes("update") || action.includes("status")) return badge(action, "open");
        if (action.includes("login")) return badge(action, action.includes("success") ? "pass" : "fail");
        return badge(action, "open");
      }

      function formatDetails(details) {
        if (!details || details === "null") return h("span", { style: "color:var(--fg3)" }, "\u2014");
        try {
          const obj = typeof details === "string" ? JSON.parse(details) : details;
          const wrapper = h("div");
          for (const [k, v] of Object.entries(obj)) {
            const val = typeof v === "object" ? JSON.stringify(v) : String(v);
            wrapper.appendChild(h("div", { style: "font-size:0.8rem;line-height:1.4" },
              h("span", { style: "color:var(--fg3)" }, k + ": "),
              h("span", {}, val)
            ));
          }
          return wrapper;
        } catch {
          return h("span", { style: "font-size:0.8rem" }, details);
        }
      }

      function formatTime(ts) {
        if (!ts) return "\u2014";
        const d = new Date(ts + (ts.endsWith("Z") ? "" : "Z"));
        const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        return h("div", {},
          h("div", { style: "font-weight:500" }, time),
          h("div", { style: "font-size:0.75rem;color:var(--fg3)" }, date)
        );
      }

      for (const a of data.logs) {
        const entityText = a.entity_id
          ? h("span", {}, h("span", { style: "color:var(--fg3)" }, a.entity_type + " "), h("code", { style: "font-size:0.78rem;background:var(--bg);padding:0.15rem 0.4rem;border-radius:4px" }, a.entity_id.substring(0, 8)))
          : h("span", { style: "color:var(--fg3)" }, a.entity_type || "\u2014");

        tbody.appendChild(h("tr", {},
          h("td", {}, formatTime(a.created_at)),
          h("td", {}, h("strong", {}, a.username || "system")),
          h("td", {}, actionBadge(a.action)),
          h("td", {}, entityText),
          h("td", {}, formatDetails(a.details)),
          h("td", { style: "color:var(--fg3);font-family:monospace;font-size:0.8rem" }, a.ip_address || "\u2014")
        ));
      }
      table.appendChild(tbody);
      card.appendChild(table);
      el.appendChild(card);
    } catch (err) {
      renderError(el, err.message);
    }
  });

  // ── Modal helpers ─────────────────────────────────────────────────────────
  window.showModal = function (html) {
    $("#modal-content").innerHTML = html;
    $("#modal-overlay").style.display = "flex";
  };
  window.hideModal = function () {
    $("#modal-overlay").style.display = "none";
  };
  $("#modal-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) hideModal();
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  if (API.isLoggedIn()) showApp();
  else showLogin();
})();
