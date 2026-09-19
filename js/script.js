(function () {
  "use strict";

  var STORAGE_KEY = "stockflow_products_v1";
  var products = [];
  var currentEditId = null;   // product being edited (add/edit modal)
  var currentStockId = null;  // product being stock-adjusted
  var currentStockMode = "in"; // "in" or "out"

  // ---------- persistence ----------
  function loadProducts() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        products = JSON.parse(raw);
        if (!Array.isArray(products)) products = [];
      } else {
        products = seedData();
        saveProducts();
      }
    } catch (e) {
      products = seedData();
    }
  }

  function saveProducts() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      showToast("Could not save data in this browser.", true);
    }
  }

  function seedData() {
    return [
      { id: uid(), name: "Wireless Mouse", sku: "WM-001", category: "Electronics", quantity: 42, price: 19.99, threshold: 10 },
      { id: uid(), name: "USB-C Cable 1m", sku: "UC-102", category: "Electronics", quantity: 6, price: 7.5, threshold: 15 },
      { id: uid(), name: "Notebook A5", sku: "NB-A5", category: "Stationery", quantity: 0, price: 3.25, threshold: 20 }
    ];
  }

  function uid() {
    return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  // ---------- helpers ----------
  function fmtMoney(n) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n);
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function statusOf(p) {
    if (p.quantity <= 0) return "out";
    if (p.quantity <= p.threshold) return "low";
    return "ok";
  }

  function showToast(msg, isErr) {
    var wrap = document.getElementById("toastWrap");
    var t = document.createElement("div");
    t.className = "toast" + (isErr ? " err" : "");
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(function () {
      t.style.opacity = "0";
      t.style.transition = "opacity .25s ease";
      setTimeout(function () { t.remove(); }, 250);
    }, 2600);
  }

  // ---------- rendering ----------
  function render() {
    renderStats();
    renderTable();
  }

  function renderStats() {
    var totalProducts = products.length;
    var totalUnits = products.reduce(function (a, p) { return a + p.quantity; }, 0);
    var totalValue = products.reduce(function (a, p) { return a + p.quantity * p.price; }, 0);
    var low = products.filter(function (p) { return statusOf(p) === "low"; }).length;
    var out = products.filter(function (p) { return statusOf(p) === "out"; }).length;

    document.getElementById("statTotalProducts").textContent = totalProducts;
    document.getElementById("statTotalUnits").textContent = totalUnits;
    document.getElementById("statTotalValue").textContent = fmtMoney(totalValue);
    document.getElementById("statLowStock").textContent = low + out;
    document.getElementById("statLowStockSub").textContent = low + " low · " + out + " out of stock";
  }

  function getFiltered() {
    var q = document.getElementById("searchInput").value.trim().toLowerCase();
    var statusFilter = document.getElementById("statusFilter").value;
    return products.filter(function (p) {
      var matchesQ = !q ||
        p.name.toLowerCase().indexOf(q) !== -1 ||
        p.sku.toLowerCase().indexOf(q) !== -1 ||
        p.category.toLowerCase().indexOf(q) !== -1;
      var matchesStatus = statusFilter === "all" || statusOf(p) === statusFilter;
      return matchesQ && matchesStatus;
    });
  }

  function renderTable() {
    var tbody = document.getElementById("tableBody");
    var empty = document.getElementById("emptyState");
    var list = getFiltered();

    if (products.length === 0) {
      tbody.innerHTML = "";
      empty.style.display = "block";
      document.getElementById("emptyTitle").textContent = "No products yet";
      document.getElementById("emptyHint").textContent = "Add your first product to start tracking stock.";
      return;
    }
    if (list.length === 0) {
      tbody.innerHTML = "";
      empty.style.display = "block";
      document.getElementById("emptyTitle").textContent = "No matches";
      document.getElementById("emptyHint").textContent = "Try a different search term or filter.";
      return;
    }
    empty.style.display = "none";

    tbody.innerHTML = list.map(function (p) {
      var st = statusOf(p);
      var badge = st === "ok"
        ? '<span class="badge ok"><span class="dot"></span>In stock</span>'
        : st === "low"
          ? '<span class="badge warn"><span class="dot"></span>Low stock</span>'
          : '<span class="badge danger"><span class="dot"></span>Out of stock</span>';

      return (
        '<tr data-id="' + p.id + '">' +
          '<td><div class="prod-name">' + escapeHtml(p.name) + '</div><div class="prod-sku">' + escapeHtml(p.sku) + '</div></td>' +
          '<td>' + escapeHtml(p.category || "—") + '</td>' +
          '<td class="qty-value">' + p.quantity + '</td>' +
          '<td>' + fmtMoney(p.price) + '</td>' +
          '<td>' + fmtMoney(p.quantity * p.price) + '</td>' +
          '<td>' + badge + '</td>' +
          '<td>' +
            '<div class="row-actions">' +
              '<button class="icon-btn in" title="Stock in" data-action="in"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>' +
              '<button class="icon-btn out" title="Stock out" data-action="out" ' + (p.quantity <= 0 ? "disabled" : "") + '><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg></button>' +
              '<button class="icon-btn" title="Edit" data-action="edit"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg></button>' +
              '<button class="icon-btn del" title="Delete" data-action="delete"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg></button>' +
            '</div>' +
          '</td>' +
        '</tr>'
      );
    }).join("");
  }

  // ---------- product modal ----------
  function openProductModal(editId) {
    currentEditId = editId || null;
    var errBox = document.getElementById("productError");
    errBox.classList.remove("show");
    errBox.textContent = "";

    if (currentEditId) {
      var p = products.find(function (x) { return x.id === currentEditId; });
      document.getElementById("productModalTitle").textContent = "Edit Product";
      document.getElementById("fName").value = p.name;
      document.getElementById("fSku").value = p.sku;
      document.getElementById("fCategory").value = p.category;
      document.getElementById("fQuantity").value = p.quantity;
      document.getElementById("fPrice").value = p.price;
      document.getElementById("fThreshold").value = p.threshold;
      document.getElementById("fQuantity").disabled = true;
    } else {
      document.getElementById("productModalTitle").textContent = "Add Product";
      ["fName", "fSku", "fCategory", "fQuantity", "fPrice", "fThreshold"].forEach(function (id) {
        document.getElementById(id).value = "";
      });
      document.getElementById("fQuantity").disabled = false;
    }
    document.getElementById("productOverlay").classList.add("show");
  }

  function closeProductModal() {
    document.getElementById("productOverlay").classList.remove("show");
    currentEditId = null;
  }

  function saveProduct() {
    var name = document.getElementById("fName").value.trim();
    var sku = document.getElementById("fSku").value.trim();
    var category = document.getElementById("fCategory").value.trim() || "Uncategorized";
    var quantity = parseInt(document.getElementById("fQuantity").value, 10);
    var price = parseFloat(document.getElementById("fPrice").value);
    var threshold = parseInt(document.getElementById("fThreshold").value, 10);

    var errBox = document.getElementById("productError");

    if (!name) return showFieldError(errBox, "Product name is required.");
    if (!sku) return showFieldError(errBox, "SKU is required.");
    if (isNaN(price) || price < 0) return showFieldError(errBox, "Unit price must be a number ≥ 0.");
    if (isNaN(threshold) || threshold < 0) threshold = 0;

    if (currentEditId) {
      var p = products.find(function (x) { return x.id === currentEditId; });
      var dupe = products.some(function (x) { return x.sku.toLowerCase() === sku.toLowerCase() && x.id !== p.id; });
      if (dupe) return showFieldError(errBox, "Another product already uses this SKU.");
      p.name = name; p.sku = sku; p.category = category; p.price = price; p.threshold = threshold;
    } else {
      if (isNaN(quantity) || quantity < 0) return showFieldError(errBox, "Starting quantity must be a number ≥ 0.");
      var dupe2 = products.some(function (x) { return x.sku.toLowerCase() === sku.toLowerCase(); });
      if (dupe2) return showFieldError(errBox, "A product with this SKU already exists.");
      products.push({ id: uid(), name: name, sku: sku, category: category, quantity: quantity, price: price, threshold: threshold });
    }

    saveProducts();
    render();
    closeProductModal();
    showToast(currentEditId ? "Product updated." : "Product added.");
  }

  function showFieldError(box, msg) {
    box.textContent = msg;
    box.classList.add("show");
  }

  // ---------- stock modal ----------
  function openStockModal(id, mode) {
    currentStockId = id;
    currentStockMode = mode;
    var p = products.find(function (x) { return x.id === id; });
    var errBox = document.getElementById("stockError");
    errBox.classList.remove("show");
    errBox.textContent = "";

    document.getElementById("stockModalTitle").textContent = mode === "in" ? "Stock In" : "Stock Out";
    document.getElementById("stockProductName").textContent = p.name;
    document.getElementById("stockCurrentQty").textContent = p.quantity;
    document.getElementById("stockAmountLabel").textContent = mode === "in" ? "Quantity to add" : "Quantity to remove";
    document.getElementById("stockAmount").value = "";
    document.getElementById("stockAmount").max = mode === "out" ? p.quantity : "";
    document.getElementById("confirmStockBtn").textContent = mode === "in" ? "Add stock" : "Remove stock";
    document.getElementById("stockOverlay").classList.add("show");
    document.getElementById("stockAmount").focus();
  }

  function closeStockModal() {
    document.getElementById("stockOverlay").classList.remove("show");
    currentStockId = null;
  }

  function confirmStock() {
    var p = products.find(function (x) { return x.id === currentStockId; });
    var amt = parseInt(document.getElementById("stockAmount").value, 10);
    var errBox = document.getElementById("stockError");

    if (isNaN(amt) || amt <= 0) return showFieldError(errBox, "Enter a quantity greater than 0.");

    if (currentStockMode === "in") {
      p.quantity += amt;
      saveProducts();
      render();
      closeStockModal();
      showToast("Added " + amt + " unit(s) to " + p.name + ".");
    } else {
      if (amt > p.quantity) {
        return showFieldError(errBox, "Cannot remove more than the current stock (" + p.quantity + " available). Stock can never go negative.");
      }
      p.quantity -= amt;
      saveProducts();
      render();
      closeStockModal();
      showToast("Removed " + amt + " unit(s) from " + p.name + ".");
    }
  }

  // ---------- delete ----------
  function deleteProduct(id) {
    var p = products.find(function (x) { return x.id === id; });
    if (!p) return;
    if (!confirm('Delete "' + p.name + '"? This cannot be undone.')) return;
    products = products.filter(function (x) { return x.id !== id; });
    saveProducts();
    render();
    showToast("Product deleted.");
  }

  // ---------- events ----------
  document.getElementById("openAddBtn").addEventListener("click", function () { openProductModal(null); });
  document.getElementById("closeProductModal").addEventListener("click", closeProductModal);
  document.getElementById("cancelProductBtn").addEventListener("click", closeProductModal);
  document.getElementById("saveProductBtn").addEventListener("click", saveProduct);
  document.getElementById("productOverlay").addEventListener("click", function (e) {
    if (e.target === this) closeProductModal();
  });

  document.getElementById("closeStockModal").addEventListener("click", closeStockModal);
  document.getElementById("cancelStockBtn").addEventListener("click", closeStockModal);
  document.getElementById("confirmStockBtn").addEventListener("click", confirmStock);
  document.getElementById("stockOverlay").addEventListener("click", function (e) {
    if (e.target === this) closeStockModal();
  });
  document.getElementById("stockAmount").addEventListener("keydown", function (e) {
    if (e.key === "Enter") confirmStock();
  });

  document.getElementById("searchInput").addEventListener("input", renderTable);
  document.getElementById("statusFilter").addEventListener("change", renderTable);

  document.getElementById("tableBody").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn) return;
    var row = e.target.closest("tr");
    var id = row.getAttribute("data-id");
    var action = btn.getAttribute("data-action");
    if (action === "in") openStockModal(id, "in");
    else if (action === "out") openStockModal(id, "out");
    else if (action === "edit") openProductModal(id);
    else if (action === "delete") deleteProduct(id);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeProductModal(); closeStockModal(); }
  });

  // ---------- init ----------
  loadProducts();
  render();
})();