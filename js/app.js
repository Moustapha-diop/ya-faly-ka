/**
 * YA FALY KA - Advanced Interactive Engine
 * Grand Mbao, Cité Baye Niasse (+221 78 564 57 67)
 */

class YaFalyKaApp {
  constructor() {
    this.products = PRODUCTS || [];
    this.categories = CATEGORIES || [];
    this.gallery = STORE_GALLERY || [];
    this.activeCategory = "all";
    this.searchQuery = "";
    this.sortBy = "featured";
    this.viewMode = "grid"; // 'grid' or 'list'

    // Cart state from localStorage
    this.cart = this.loadCart();

    // Modal state
    this.currentModalProduct = null;
    this.modalQty = 1;

    // Theme state
    this.currentTheme = localStorage.getItem("yfk_theme") || "dark";

    // Comparison slider state
    this.baSliderPos = 50; // percentage
    this.isDraggingBa = false;

    // Simulator state
    this.simSelectedProductId = this.products[0] ? this.products[0].id : null;
    this.simQty = 10;
    this.simIncludeDelivery = true;

    // Delivery state
    this.activeDeliveryZone = "mbao";

    // Bind methods
    this.init = this.init.bind(this);
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.renderCategoryPills();
    this.renderProducts();
    this.renderGallery();
    this.initDeliveryCalculator();
    this.initCommandPalette();
    this.initZoomLens();
    this.checkStoreOpenStatus();
    this.initScrollSpy();
    this.setupEventListeners();
    this.initLucide();
  }

  initLucide() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  // ==========================================
  // STORE STATUS CHECK (08h30 - 22h30)
  // ==========================================
  checkStoreOpenStatus() {
    const statusLabel = document.getElementById("storeStatusLabel");
    if (!statusLabel) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeVal = currentHour + currentMinutes / 60;

    const isOpen = currentTimeVal >= 8.5 && currentTimeVal < 22.5;

    if (isOpen) {
      statusLabel.textContent = "Magasin Ouvert en ce moment • Grand Mbao (Ferme à 22h30)";
    } else {
      statusLabel.textContent = "Magasin Fermé • Réouverture demain à 08h30 à Grand Mbao";
    }
  }

  // ==========================================
  // THEME MANAGEMENT
  // ==========================================
  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("yfk_theme", theme);

    const themeIcon = document.getElementById("themeIcon");
    if (themeIcon) {
      themeIcon.setAttribute("data-lucide", theme === "light" ? "moon" : "sun");
      this.initLucide();
    }
  }

  toggleTheme() {
    const nextTheme = this.currentTheme === "dark" ? "light" : "dark";
    this.applyTheme(nextTheme);
    this.showToast(`Mode ${nextTheme === "dark" ? "Sombre Prestige" : "Clair Lumineux"} activé`, "info");
  }

  // ==========================================
  // FORMATTING HELPERS
  // ==========================================
  formatPrice(amount) {
    if (!amount && amount !== 0) return "0 FCFA";
    return new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FCFA";
  }

  // ==========================================
  // CATEGORIES & FILTERING
  // ==========================================
  renderCategoryPills() {
    const container = document.getElementById("categoryPillsContainer");
    if (!container) return;

    container.innerHTML = this.categories.map(cat => {
      const isActive = cat.id === this.activeCategory ? "active" : "";
      return `
        <button class="cat-pill ${isActive}" data-category="${cat.id}">
          <span>${cat.label}</span>
          <span class="pill-count">${cat.count}</span>
        </button>
      `;
    }).join("");

    container.querySelectorAll(".cat-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        this.setCategory(pill.dataset.category);
      });
    });
  }

  setCategory(catId) {
    this.activeCategory = catId;
    this.renderCategoryPills();
    this.renderProducts();
  }

  // ==========================================
  // PRODUCTS RENDERING & 3D HOVER
  // ==========================================
  getFilteredProducts() {
    let list = [...this.products];

    if (this.activeCategory !== "all") {
      list = list.filter(p => p.category === this.activeCategory);
    }

    if (this.searchQuery.trim() !== "") {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.shortDesc.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q)
      );
    }

    switch (this.sortBy) {
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      case "featured":
      default:
        break;
    }

    return list;
  }

  renderProducts() {
    const grid = document.getElementById("productsGrid");
    if (!grid) return;

    if (this.viewMode === "list") {
      grid.classList.add("list-view");
    } else {
      grid.classList.remove("list-view");
    }

    const list = this.getFilteredProducts();

    if (list.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-secondary);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <h3>Aucun article trouvé pour « ${this.searchQuery} »</h3>
          <p style="margin-top:0.5rem;">Vérifiez l'orthographe ou parcourez nos différents rayons.</p>
          <button class="btn-secondary" style="margin-top:1.5rem;" onclick="app.resetFilters()">Réinitialiser les filtres</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(p => {
      const badgeClass = `badge-${p.badgeType || "hot"}`;
      const waUrl = this.generateWhatsAppUrl(p.name, p.id, p.image);
      return `
        <article class="product-card" data-id="${p.id}">
          <div class="card-media-wrap" onclick="app.openQuickView('${p.id}')">
            <img src="${p.image}" alt="${p.name}" class="card-img" loading="lazy">
            <span class="card-badge ${badgeClass}">${p.badge}</span>
            <div class="card-quick-actions">
              <button class="btn-quick-view" onclick="event.stopPropagation(); app.openQuickView('${p.id}')">
                <i data-lucide="eye" style="width:16px;height:16px;"></i>
                <span>Aperçu Rapide</span>
              </button>
            </div>
          </div>

          <div class="card-body">
            <span class="card-category">${p.categoryLabel}</span>
            <h3 class="card-title" title="${p.name}" onclick="app.openQuickView('${p.id}')" style="cursor:pointer;">${p.name}</h3>
            <p class="card-desc">${p.shortDesc}</p>

            <div class="card-meta-row">
              <span class="card-stock-pill">
                <i data-lucide="check-circle-2" style="width:14px;height:14px;"></i>
                <span>En stock magasin</span>
              </span>
              <div class="card-rating">
                <i data-lucide="star" style="width:14px;height:14px;fill:#fbbf24;"></i>
                <span>${p.rating}</span>
                <span style="color:var(--text-muted);font-weight:normal;">(${p.reviewsCount})</span>
              </div>
            </div>

            <div class="card-cta-row card-cta-single">
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-discuss-whatsapp" onclick="app.shareProductToWhatsApp(event, '${p.id}')" title="Discuter immédiatement de cet article sur WhatsApp avec photo">
                <i data-lucide="message-circle" style="width:19px;height:19px;"></i>
                <span>Discuter sur WhatsApp</span>
              </a>
            </div>
          </div>
        </article>
      `;
    }).join("");

    this.initLucide();
    this.attach3DTilt();
  }

  attach3DTilt() {
    if (this.viewMode === "list") return;
    const cards = document.querySelectorAll(".product-card");
    cards.forEach(card => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)`;
      });
    });
  }

  resetFilters() {
    this.searchQuery = "";
    this.activeCategory = "all";
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.value = "";
    const clearBtn = document.getElementById("searchClearBtn");
    if (clearBtn) clearBtn.style.display = "none";
    this.renderCategoryPills();
    this.renderProducts();
  }

  // ==========================================
  // SIMULATOR & VOLUME DISCOUNT CALCULATOR
  // ==========================================
  initSimulator() {
    const productSelect = document.getElementById("simProductSelect");
    const qtyRange = document.getElementById("simQtyRange");
    const qtyDisplay = document.getElementById("simQtyDisplay");
    const deliveryCheckbox = document.getElementById("simIncludeDelivery");

    if (!productSelect || !qtyRange) return;

    productSelect.innerHTML = this.products.map(p => `
      <option value="${p.id}" ${p.id === this.simSelectedProductId ? "selected" : ""}>
        ${p.name} (${p.categoryLabel})
      </option>
    `).join("");

    productSelect.addEventListener("change", (e) => {
      this.simSelectedProductId = e.target.value;
      this.calculateSimulator();
    });

    qtyRange.addEventListener("input", (e) => {
      this.simQty = parseInt(e.target.value, 10);
      qtyDisplay.textContent = `${this.simQty} unité${this.simQty > 1 ? "s" : ""}`;
      this.calculateSimulator();
    });

    if (deliveryCheckbox) {
      deliveryCheckbox.addEventListener("change", (e) => {
        this.simIncludeDelivery = e.target.checked;
        this.calculateSimulator();
      });
    }

    const orderBtn = document.getElementById("simOrderWhatsAppBtn");
    if (orderBtn) {
      orderBtn.addEventListener("click", () => this.orderSimulatorWhatsApp());
    }

    this.calculateSimulator();
  }

  calculateSimulator() {
    const product = this.products.find(p => p.id === this.simSelectedProductId) || this.products[0];
    if (!product) return;

    const nameEl = document.getElementById("simSelectedName");
    if (nameEl) nameEl.textContent = product.name;

    const qtyDisplayEl = document.getElementById("simUnitDiscounted");
    if (qtyDisplayEl) qtyDisplayEl.textContent = `${this.simQty} unité${this.simQty > 1 ? "s" : ""}`;

    const savingsEl = document.getElementById("simSavingsTotal");
    if (savingsEl) {
      if (this.simQty >= 25) {
        savingsEl.textContent = "Tarif Grossiste VIP Dégressif";
      } else if (this.simQty >= 10) {
        savingsEl.textContent = "Tarif Préférentiel Volume (10+)";
      } else if (this.simQty >= 5) {
        savingsEl.textContent = "Tarif Dégressif (5+)";
      } else {
        savingsEl.textContent = "Tarif Unitaire Magasin";
      }
    }

    const badgeDiscount = document.getElementById("simDiscountBadge");
    if (badgeDiscount) {
      badgeDiscount.textContent = this.simQty >= 10 
        ? `Remise Volume Accordée (${this.simQty} unités)` 
        : `Demande de Devis Personnalisé (${this.simQty} unité${this.simQty > 1 ? "s" : ""})`;
      badgeDiscount.style.background = this.simQty >= 10 ? "var(--accent-emerald)" : "var(--bg-card-hover)";
    }

    const deliveryEl = document.getElementById("simDeliveryCost");
    if (deliveryEl) {
      if (!this.simIncludeDelivery) {
        deliveryEl.textContent = "Non incluse (Retrait au magasin à Grand Mbao)";
      } else {
        deliveryEl.textContent = this.simQty >= 10 ? "Offerte à Dakar (Dès 10 unités)" : "Disponible à Dakar & Banlieue";
      }
    }
  }

  orderSimulatorWhatsApp() {
    const product = this.products.find(p => p.id === this.simSelectedProductId) || this.products[0];
    if (!product) return;

    const msg = `Bonjour YA FALY KA (Grand Mbao), je souhaite obtenir un devis personnalisé pour une commande :%0A%0A` +
      `▪ *Article :* ${encodeURIComponent(product.name)} (Réf: ${product.id})%0A` +
      `▪ *Quantité désirée :* ${this.simQty} unités%0A` +
      `▪ *Livraison :* ${this.simIncludeDelivery ? "Oui (Livraison express Dakar / Banlieue)" : "Retrait direct au magasin à Grand Mbao"}%0A%0A` +
      `Pourriez-vous me communiquer votre meilleure offre de prix ? Merci.`;

    window.open(`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${msg}`, "_blank");
  }

  // ==========================================
  // DELIVERY ZONE CALCULATOR
  // ==========================================
  initDeliveryCalculator() {
    const buttons = document.querySelectorAll(".zone-btn");
    const zoneTitle = document.getElementById("deliveryZoneTitle");
    const costDisplay = document.getElementById("deliveryCostDisplay");
    const timeDisplay = document.getElementById("deliveryTimeDisplay");

    if (!buttons.length || !zoneTitle || !costDisplay) return;

    const zoneData = {
      mbao: {
        title: "Grand Mbao & Cité Baye Niasse (Zone Locale)",
        cost: "Livraison Gratuite / 1 000 FCFA",
        time: "Délai express : 30 à 60 minutes dès commande"
      },
      banlieue: {
        title: "Keur Massar • Rufisque • Pikine • Guédiawaye",
        cost: "2 000 FCFA à 3 000 FCFA",
        time: "Délai estimé : 2h à 4h dans la journée"
      },
      dakar: {
        title: "Dakar Centre • Almadies • Plateau • Maristes • Yoff",
        cost: "3 500 FCFA à 4 500 FCFA",
        time: "Livraison sous 24h ou jour même selon disponibilité"
      },
      regions: {
        title: "Régions : Thiès, Mbour, Saint-Louis, Kaolack, etc.",
        cost: "Sur devis transporteur (5 000 - 10 000 FCFA)",
        time: "Délai d'acheminement sécurisé 24h - 48h"
      }
    };

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const zoneKey = btn.dataset.zone;
        if (zoneData[zoneKey]) {
          zoneTitle.textContent = zoneData[zoneKey].title;
          costDisplay.textContent = zoneData[zoneKey].cost;
          timeDisplay.textContent = zoneData[zoneKey].time;
        }
      });
    });
  }

  // ==========================================
  // COMMAND PALETTE (CTRL + K SEARCH)
  // ==========================================
  initCommandPalette() {
    const modal = document.getElementById("searchPaletteModal");
    const input = document.getElementById("paletteSearchInput");
    const results = document.getElementById("paletteResults");
    const openBtn = document.getElementById("openSearchPaletteBtn");
    const closeBtn = document.getElementById("closePaletteBtn");

    if (!modal || !input || !results) return;

    const openPalette = () => {
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      input.value = "";
      this.renderPaletteResults("");
      setTimeout(() => input.focus(), 100);
      document.body.style.overflow = "hidden";
    };

    const closePalette = () => {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    };

    if (openBtn) openBtn.addEventListener("click", openPalette);
    if (closeBtn) closeBtn.addEventListener("click", closePalette);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closePalette();
    });

    input.addEventListener("input", (e) => {
      this.renderPaletteResults(e.target.value.trim().toLowerCase());
    });

    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        openPalette();
      }
      if (e.key === "Escape" && modal.classList.contains("open")) {
        closePalette();
      }
    });
  }

  renderPaletteResults(query) {
    const resultsContainer = document.getElementById("paletteResults");
    if (!resultsContainer) return;

    let list = this.products;
    if (query) {
      list = list.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.categoryLabel.toLowerCase().includes(query) ||
        p.shortDesc.toLowerCase().includes(query)
      );
    }

    if (list.length === 0) {
      resultsContainer.innerHTML = `
        <div style="text-align:center;padding:2rem;color:var(--text-muted);">
          Aucun résultat pour « ${query} »
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = list.slice(0, 6).map(p => `
      <div class="palette-item" onclick="app.openQuickView('${p.id}'); app.closePaletteModal();">
        <img src="${p.image}" alt="${p.name}" class="palette-item-img">
        <div class="palette-item-info">
          <div class="palette-item-title">${p.name}</div>
          <small style="color:var(--text-secondary);">${p.categoryLabel}</small>
        </div>
        <span class="palette-item-action">
          <i data-lucide="message-circle" style="width:14px;height:14px;"></i>
          <span>Discuter</span>
        </span>
      </div>
    `).join("");
  }

  closePaletteModal() {
    const modal = document.getElementById("searchPaletteModal");
    if (modal) {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  }

  // ==========================================
  // ZOOM LENS ON QUICK VIEW
  // ==========================================
  initZoomLens() {
    const wrap = document.getElementById("modalZoomWrapper");
    const img = document.getElementById("modalMainImg");
    const lens = document.getElementById("zoomLens");

    if (!wrap || !img || !lens) return;

    wrap.addEventListener("mouseenter", () => {
      lens.style.display = "block";
    });

    wrap.addEventListener("mouseleave", () => {
      lens.style.display = "none";
      img.style.transform = "scale(1)";
    });

    wrap.addEventListener("mousemove", (e) => {
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      lens.style.left = `${x - 50}px`;
      lens.style.top = `${y - 50}px`;

      const xPercent = (x / rect.width) * 100;
      const yPercent = (y / rect.height) * 100;

      img.style.transformOrigin = `${xPercent}% ${yPercent}%`;
      img.style.transform = "scale(1.7)";
    });
  }

  // ==========================================
  // QUICK VIEW MODAL
  // ==========================================
  openQuickView(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    this.currentModalProduct = product;
    this.modalQty = 1;

    document.getElementById("modalTitle").textContent = product.name;
    document.getElementById("modalCategory").textContent = product.categoryLabel;

    const priceEl = document.getElementById("modalPrice");
    if (priceEl) priceEl.style.display = "none";
    const oldPriceEl = document.getElementById("modalOldPrice");
    if (oldPriceEl) oldPriceEl.style.display = "none";

    document.getElementById("modalDesc").textContent = product.description;
    document.getElementById("modalStockText").textContent = product.stockStatus || "En stock à Grand Mbao (Livraison immédiate)";
    const dimEl = document.getElementById("modalDimensions");
    if (dimEl && dimEl.querySelector("span")) {
      dimEl.querySelector("span").textContent = product.dimensions || "Standard";
    }

    const featuresList = document.getElementById("modalFeaturesList");
    featuresList.innerHTML = product.features.map(f => `
      <li class="modal-feature-item">
        <i data-lucide="check" style="width:16px;height:16px;"></i>
        <span>${f}</span>
      </li>
    `).join("");

    const mainImg = document.getElementById("modalMainImg");
    mainImg.src = product.image;

    const thumbStudioImg = document.getElementById("modalThumbStudioImg");
    thumbStudioImg.src = product.image;

    const thumbStoreImg = document.getElementById("modalThumbStoreImg");
    thumbStoreImg.src = product.storePhoto || product.image;

    const btnStudio = document.getElementById("modalThumbStudio");
    const btnStore = document.getElementById("modalThumbStore");
    btnStudio.style.display = "flex";
    btnStore.style.display = "flex";
    btnStudio.classList.add("active");
    btnStore.classList.remove("active");

    btnStudio.onclick = () => {
      mainImg.src = product.image;
      btnStudio.classList.add("active");
      btnStore.classList.remove("active");
    };

    btnStore.onclick = () => {
      mainImg.src = product.storePhoto;
      btnStore.classList.add("active");
      btnStudio.classList.remove("active");
    };

    this.updateModalWhatsAppBtn();

    const modal = document.getElementById("quickViewModal");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    this.initLucide();
  }

  closeQuickView() {
    const modal = document.getElementById("quickViewModal");
    if (modal) {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  }

  openQuickViewModalImageOnly(imgSrc, title, caption) {
    const mainImg = document.getElementById("modalMainImg");
    mainImg.src = imgSrc;
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalCategory").textContent = "Visite Magasin Grand Mbao";
    const priceEl = document.getElementById("modalPrice");
    if (priceEl) priceEl.style.display = "none";
    const oldPriceEl = document.getElementById("modalOldPrice");
    if (oldPriceEl) oldPriceEl.style.display = "none";
    document.getElementById("modalDesc").textContent = caption;
    document.getElementById("modalStockText").textContent = "En stock à Grand Mbao, Cité Baye Niasse";
    document.getElementById("modalFeaturesList").innerHTML = `
      <li class="modal-feature-item"><i data-lucide="check" style="width:16px;height:16px;"></i><span>Conseils personnalisés par notre équipe sur place</span></li>
      <li class="modal-feature-item"><i data-lucide="check" style="width:16px;height:16px;"></i><span>Possibilité de tester et d'essayer les articles en rayon</span></li>
    `;
    document.getElementById("modalThumbStudio").style.display = "none";
    document.getElementById("modalThumbStore").style.display = "none";

    const modal = document.getElementById("quickViewModal");
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    this.initLucide();
  }

  changeModalQty(delta) {
    this.modalQty = Math.max(1, this.modalQty + delta);
    const qtyValEl = document.getElementById("modalQtyVal");
    if (qtyValEl) qtyValEl.textContent = this.modalQty;
    this.updateModalWhatsAppBtn();
  }

  updateModalWhatsAppBtn() {
    if (!this.currentModalProduct) return;
    const btn = document.getElementById("modalWhatsappDirectBtn");
    if (btn) {
      btn.href = this.generateWhatsAppUrl(
        this.currentModalProduct.name,
        this.currentModalProduct.id,
        this.currentModalProduct.image
      );
      btn.onclick = (e) => this.shareProductToWhatsApp(e, this.currentModalProduct.id);
    }
  }

  // ==========================================
  // GALLERY RENDERING
  // ==========================================
  renderGallery() {
    const grid = document.getElementById("galleryGrid");
    if (!grid) return;

    grid.innerHTML = this.gallery.map((item, idx) => {
      let layoutClass = "gallery-item-small";
      if (idx === 0) layoutClass = "gallery-item-featured";
      else if (idx === 1) layoutClass = "gallery-item-medium";

      const tagText = item.type === "showroom" ? "Showroom Prestige" : "Photo Réelle du Magasin";

      return `
        <div class="gallery-item ${layoutClass}" onclick="app.openGalleryModal('${item.image}', '${item.title}', '${item.caption}')">
          <img src="${item.image}" alt="${item.title}" class="gallery-img" loading="lazy">
          <div class="gallery-overlay">
            <span class="gallery-tag">${tagText}</span>
            <h4 class="gallery-title">${item.title}</h4>
            <p class="gallery-caption">${item.caption}</p>
          </div>
        </div>
      `;
    }).join("");
  }

  openGalleryModal(imgSrc, title, caption) {
    this.openQuickViewModalImageOnly(imgSrc, title, caption);
  }

  // ==========================================
  // CART & LOCALSTORAGE
  // ==========================================
  loadCart() {
    try {
      const data = localStorage.getItem("yfk_cart");
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveCart() {
    localStorage.setItem("yfk_cart", JSON.stringify(this.cart));
    this.updateCartBadge();
  }

  addToCart(productId, quantity = 1) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const existing = this.cart.find(item => item.id === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        categoryLabel: product.categoryLabel,
        quantity: quantity
      });
    }

    this.saveCart();
    this.showToast(`« ${product.name} » ajouté au panier !`, "success");
    this.animateBadge();
  }

  removeFromCart(productId) {
    this.cart = this.cart.filter(item => item.id !== productId);
    this.saveCart();
    this.renderCartDrawer();
  }

  updateCartItemQty(productId, delta) {
    const item = this.cart.find(i => i.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      this.removeFromCart(productId);
    } else {
      this.saveCart();
      this.renderCartDrawer();
    }
  }

  animateBadge() {
    const badge = document.getElementById("cartBadge");
    if (badge) {
      badge.classList.add("badge-bounce");
      setTimeout(() => badge.classList.remove("badge-bounce"), 400);
    }
  }

  updateCartBadge() {
    const totalItems = this.cart.reduce((sum, i) => sum + i.quantity, 0);
    const badge = document.getElementById("cartBadge");
    const bbarBadge = document.getElementById("bbarCartBadge");
    const titleCount = document.getElementById("cartCountTitle");
    if (badge) badge.textContent = totalItems;
    if (bbarBadge) bbarBadge.textContent = totalItems;
    if (titleCount) titleCount.textContent = totalItems;
  }

  openMobileMenu() {
    const drawer = document.getElementById("mobileNavBackdrop");
    if (drawer) {
      drawer.classList.add("open");
      drawer.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
  }

  closeMobileMenu() {
    const drawer = document.getElementById("mobileNavBackdrop");
    if (drawer) {
      drawer.classList.remove("open");
      drawer.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  }

  openCart() {
    this.renderCartDrawer();
    const backdrop = document.getElementById("cartDrawerBackdrop");
    if (backdrop) {
      backdrop.classList.add("open");
      backdrop.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
  }

  closeCart() {
    const backdrop = document.getElementById("cartDrawerBackdrop");
    if (backdrop) {
      backdrop.classList.remove("open");
      backdrop.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  }

  renderCartDrawer() {
    const listContainer = document.getElementById("cartItemsList");
    const subtotalEl = document.getElementById("cartSubtotalAmount");
    if (!listContainer) return;

    if (this.cart.length === 0) {
      listContainer.innerHTML = `
        <div class="cart-empty-state">
          <div class="cart-empty-icon">
            <i data-lucide="shopping-bag" style="width:34px;height:34px;"></i>
          </div>
          <h4>Votre panier est vide</h4>
          <p style="font-size:0.85rem;">Parcourez notre catalogue et sélectionnez des articles d'exception.</p>
          <button class="btn-primary" style="margin-top:0.8rem;padding:0.7rem 1.4rem;" onclick="app.closeCart(); location.href='#catalogue';">Découvrir les articles</button>
        </div>
      `;
      if (subtotalEl) subtotalEl.textContent = "0 FCFA";
      this.initLucide();
      return;
    }

    let subtotal = 0;
    listContainer.innerHTML = this.cart.map(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      return `
        <div class="cart-item-row" data-id="${item.id}">
          <img src="${item.image}" alt="${item.name}" class="cart-item-img">
          <div class="cart-item-info">
            <h4 class="cart-item-name">${item.name}</h4>
            <span class="cart-item-price">${this.formatPrice(item.price)}</span>
            <div class="cart-item-controls">
              <button class="cart-btn-mini" onclick="app.updateCartItemQty('${item.id}', -1)">-</button>
              <span style="font-weight:700;font-size:0.85rem;padding:0 0.3rem;">${item.quantity}</span>
              <button class="cart-btn-mini" onclick="app.updateCartItemQty('${item.id}', 1)">+</button>
            </div>
          </div>
          <button class="cart-item-remove" onclick="app.removeFromCart('${item.id}')" title="Supprimer">
            <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
          </button>
        </div>
      `;
    }).join("");

    if (subtotalEl) subtotalEl.textContent = this.formatPrice(subtotal);
    this.initLucide();
  }

  // ==========================================
  // WHATSAPP INTEGRATION ENGINE (PHOTO & CHAT)
  // ==========================================
  async shareProductToWhatsApp(event, productId) {
    if (event) event.preventDefault();
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const waUrl = this.generateWhatsAppUrl(product.name, product.id, product.image);

    // 1. Mobile Native Share API: attaches real image directly into WhatsApp
    if (typeof navigator !== "undefined" && navigator.canShare) {
      try {
        const response = await fetch(product.image);
        const blob = await response.blob();
        const ext = product.image.endsWith(".png") ? "png" : "jpg";
        const file = new File([blob], `${product.id || "produit"}.${ext}`, { type: blob.type || "image/jpeg" });

        if (navigator.canShare({ files: [file] })) {
          const shareText = `Bonjour YA FALY KA (Grand Mbao), je souhaite des informations sur cet article vu sur votre site :\n\n▪ Article : ${product.name} (Réf: ${product.id})\n▪ Magasin : YA FALY KA, Grand Mbao Cité Baye Niasse\n\nQuel est votre meilleur tarif ? Merci.`;
          await navigator.share({
            files: [file],
            title: product.name,
            text: shareText
          });
          return;
        }
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    // 2. Desktop: copy image to clipboard and open WhatsApp
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
              if (blob) {
                navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(() => {
                  this.showToast("📷 Photo de l'article copiée ! Faites Ctrl + V dans WhatsApp pour l'envoyer.", "info");
                }).catch(() => {});
              }
            }, "image/png");
          } catch (e) {}
        };
        img.src = product.image;
      }
    } catch (e) {}

    // Fallback: Open WhatsApp with the prefilled message & link
    window.open(waUrl, "_blank");
  }

  generateWhatsAppUrl(productName, productId = "", imagePath = "") {
    const refStr = productId ? ` (Réf: ${productId})` : "";
    let photoLine = "";
    if (imagePath) {
      let fullUrl = imagePath;
      if (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin !== "null") {
        const origin = window.location.origin;
        const cleanPath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
        fullUrl = `${origin}/${cleanPath.split("/").map(seg => encodeURIComponent(seg)).join("/")}`;
      }
      photoLine = `%0A▪ *Photo de l'article :* ${encodeURIComponent(fullUrl)}%0A`;
    }

    const msg = `Bonjour YA FALY KA (Grand Mbao), je suis intéressé(e) par l'article suivant vu sur votre site :%0A%0A` +
      `▪ *Article :* ${encodeURIComponent(productName)}${refStr}${photoLine}%0A` +
      `▪ *Disponibilité :* Magasin Grand Mbao, Cité Baye Niasse%0A%0A` +
      `Pourriez-vous m'indiquer le meilleur tarif actuel et les modalités de livraison ? Merci.`;

    return `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${msg}`;
  }

  checkoutCartOnWhatsApp() {
    if (this.cart.length === 0) {
      this.showToast("Votre panier est vide !", "warning");
      return;
    }

    let itemsText = "";
    let total = 0;

    this.cart.forEach((item, index) => {
      const lineTotal = item.price * item.quantity;
      total += lineTotal;
      itemsText += `${index + 1}. *${item.name}*%0A   Qté: ${item.quantity} × ${this.formatPrice(item.price)} = ${this.formatPrice(lineTotal)}%0A`;
    });

    const msg = `Bonjour YA FALY KA (Grand Mbao), je souhaite valider la commande de mon panier :%0A%0A` +
      `*DÉTAILS DE MA COMMANDE :*%0A` +
      `${itemsText}%0A` +
      `*MONTANT TOTAL :* ${this.formatPrice(total)}%0A%0A` +
      `Je souhaite être livré(e) à domicile. Merci de me contacter pour convenir de l'adresse et de l'heure.`;

    this.fireConfetti();
    window.open(`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${msg}`, "_blank");
  }

  fireConfetti() {
    if (window.confetti) {
      window.confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }

  // ==========================================
  // PROFORMA INVOICE GENERATOR
  // ==========================================
  openProformaModal() {
    if (this.cart.length === 0) {
      this.showToast("Ajoutez d'abord des articles au panier pour générer un devis proforma.", "warning");
      return;
    }

    const modal = document.getElementById("proformaModal");
    const tbody = document.getElementById("proformaTableBody");
    const totalEl = document.getElementById("proformaTotalAmount");
    const numberEl = document.getElementById("proformaNumber");
    const dateEl = document.getElementById("proformaDate");

    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const randNum = Math.floor(1000 + Math.random() * 9000);

    numberEl.textContent = `YFK-2026-${randNum}`;
    dateEl.textContent = formattedDate;

    let total = 0;
    tbody.innerHTML = this.cart.map(item => {
      const lineTotal = item.price * item.quantity;
      total += lineTotal;
      return `
        <tr>
          <td>
            <strong>${item.name}</strong><br>
            <small style="color:#64748b;">Réf: ${item.id} | Catégorie: ${item.categoryLabel}</small>
          </td>
          <td style="text-align:center;">${item.quantity}</td>
          <td style="text-align:right;">${this.formatPrice(item.price)}</td>
          <td style="text-align:right;font-weight:700;">${this.formatPrice(lineTotal)}</td>
        </tr>
      `;
    }).join("");

    totalEl.textContent = this.formatPrice(total);

    const sendBtn = document.getElementById("sendProformaWhatsappBtn");
    sendBtn.onclick = () => {
      const clientName = document.getElementById("proformaClientName").value.trim() || "Client Proforma";
      let msg = `Bonjour YA FALY KA, voici la demande de devis proforma N° ${numberEl.textContent} au nom de *${encodeURIComponent(clientName)}* :%0A%0A`;
      this.cart.forEach(item => {
        msg += `- ${item.quantity}x ${encodeURIComponent(item.name)} : ${this.formatPrice(item.price * item.quantity)}%0A`;
      });
      msg += `%0A*TOTAL HT / NET :* ${this.formatPrice(total)}%0A%0AMerci de m'envoyer la confirmation officielle.`;
      this.fireConfetti();
      window.open(`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${msg}`, "_blank");
    };

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    this.closeCart();
  }

  closeProformaModal() {
    const modal = document.getElementById("proformaModal");
    if (modal) {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  }

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================
  showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let iconName = "check-circle";
    if (type === "warning") iconName = "alert-triangle";
    if (type === "info") iconName = "info";

    toast.innerHTML = `
      <i data-lucide="${iconName}" style="width:18px;height:18px;color:var(--accent-gold);"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    this.initLucide();

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  // ==========================================
  // COUNTDOWN TIMER
  // ==========================================
  startCountdown() {
    const daysEl = document.getElementById("cdDays");
    const hoursEl = document.getElementById("cdHours");
    const minsEl = document.getElementById("cdMins");
    const secsEl = document.getElementById("cdSecs");

    if (!daysEl) return;

    let totalSeconds = 2 * 86400 + 14 * 3600 + 45 * 60 + 30;

    setInterval(() => {
      if (totalSeconds <= 0) {
        totalSeconds = 3 * 86400;
      } else {
        totalSeconds--;
      }

      const d = Math.floor(totalSeconds / 86400);
      const h = Math.floor((totalSeconds % 86400) / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;

      daysEl.textContent = String(d).padStart(2, '0');
      hoursEl.textContent = String(h).padStart(2, '0');
      minsEl.textContent = String(m).padStart(2, '0');
      secsEl.textContent = String(s).padStart(2, '0');
    }, 1000);
  }

  // ==========================================
  // SCROLL SPY & ACTIVE NAVBAR ENGINE
  // ==========================================
  initScrollSpy() {
    const navLinks = document.querySelectorAll(".nav-link");
    const sections = ["hero", "catalogue", "simulator", "delivery", "contact"];
    const sectionElements = sections.map(id => document.getElementById(id)).filter(Boolean);

    // Click handler on nav links for instant active class & smooth scroll offset
    navLinks.forEach(link => {
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href");
        if (href && href.startsWith("#")) {
          const targetEl = document.querySelector(href);
          if (targetEl) {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");

            const offset = 85; // Header height offset
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = targetEl.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
              top: offsetPosition,
              behavior: "smooth"
            });
          }
        }
      });
    });

    // Scroll listener to update active menu item based on user scroll position
    let isTicking = false;
    window.addEventListener("scroll", () => {
      if (!isTicking) {
        window.requestAnimationFrame(() => {
          const scrollPosition = window.scrollY + 130;

          let currentSectionId = "hero";
          sectionElements.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            if (scrollPosition >= top && scrollPosition < top + height) {
              currentSectionId = section.getAttribute("id");
            }
          });

          // Update desktop links
          navLinks.forEach(link => {
            if (link.getAttribute("href") === `#${currentSectionId}`) {
              link.classList.add("active");
            } else {
              link.classList.remove("active");
            }
          });

          // Update mobile bottom bar
          const bbarHome = document.getElementById("bbarHome");
          const bbarShop = document.getElementById("bbarShop");
          if (bbarHome && bbarShop) {
            if (currentSectionId === "hero") {
              bbarHome.classList.add("active");
              bbarShop.classList.remove("active");
            } else if (currentSectionId === "catalogue") {
              bbarShop.classList.add("active");
              bbarHome.classList.remove("active");
            } else {
              bbarHome.classList.remove("active");
              bbarShop.classList.remove("active");
            }
          }

          isTicking = false;
        });
        isTicking = true;
      }
    });
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================
  setupEventListeners() {
    // Theme toggle
    const themeBtn = document.getElementById("themeToggleBtn");
    if (themeBtn) themeBtn.addEventListener("click", () => this.toggleTheme());

    // Cart trigger & close
    const cartTrigger = document.getElementById("cartTriggerBtn");
    if (cartTrigger) cartTrigger.addEventListener("click", () => this.openCart());

    const closeCartBtn = document.getElementById("closeCartBtn");
    if (closeCartBtn) closeCartBtn.addEventListener("click", () => this.closeCart());

    const cartBackdrop = document.getElementById("cartDrawerBackdrop");
    if (cartBackdrop) {
      cartBackdrop.addEventListener("click", (e) => {
        if (e.target === cartBackdrop) this.closeCart();
      });
    }

    // Modal close
    const modalCloseBtn = document.getElementById("modalCloseBtn");
    if (modalCloseBtn) modalCloseBtn.addEventListener("click", () => this.closeQuickView());

    const quickViewModal = document.getElementById("quickViewModal");
    if (quickViewModal) {
      quickViewModal.addEventListener("click", (e) => {
        if (e.target === quickViewModal) this.closeQuickView();
      });
    }

    // Proforma close
    const closeProformaBtn = document.getElementById("closeProformaBtn");
    if (closeProformaBtn) closeProformaBtn.addEventListener("click", () => this.closeProformaModal());

    const proformaModal = document.getElementById("proformaModal");
    if (proformaModal) {
      proformaModal.addEventListener("click", (e) => {
        if (e.target === proformaModal) this.closeProformaModal();
      });
    }

    // Modal Qty buttons
    const minusBtn = document.getElementById("modalQtyMinus");
    const plusBtn = document.getElementById("modalQtyPlus");
    if (minusBtn) minusBtn.addEventListener("click", () => this.changeModalQty(-1));
    if (plusBtn) plusBtn.addEventListener("click", () => this.changeModalQty(1));

    // Modal Add To Cart
    const modalAddToCartBtn = document.getElementById("modalAddToCartBtn");
    if (modalAddToCartBtn) {
      modalAddToCartBtn.addEventListener("click", () => {
        if (this.currentModalProduct) {
          this.addToCart(this.currentModalProduct.id, this.modalQty);
          this.closeQuickView();
        }
      });
    }

    // Checkout WhatsApp button in cart
    const checkoutWhatsappBtn = document.getElementById("checkoutWhatsappBtn");
    if (checkoutWhatsappBtn) checkoutWhatsappBtn.addEventListener("click", () => this.checkoutCartOnWhatsApp());

    // Open Proforma button in cart
    const openProformaBtn = document.getElementById("openProformaBtn");
    if (openProformaBtn) openProformaBtn.addEventListener("click", () => this.openProformaModal());

    // Search input
    const searchInput = document.getElementById("searchInput");
    const clearBtn = document.getElementById("searchClearBtn");
    if (searchInput) {
      let timeout = null;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(timeout);
        if (clearBtn) clearBtn.style.display = e.target.value ? "block" : "none";
        timeout = setTimeout(() => {
          this.searchQuery = e.target.value;
          this.renderProducts();
        }, 200);
      });

      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          searchInput.value = "";
          clearBtn.style.display = "none";
          this.searchQuery = "";
          this.renderProducts();
        });
      }
    }

    // View Mode buttons (Grid vs List)
    const viewGridBtn = document.getElementById("viewGridBtn");
    const viewListBtn = document.getElementById("viewListBtn");
    if (viewGridBtn && viewListBtn) {
      viewGridBtn.addEventListener("click", () => {
        this.viewMode = "grid";
        viewGridBtn.classList.add("active");
        viewListBtn.classList.remove("active");
        this.renderProducts();
      });

      viewListBtn.addEventListener("click", () => {
        this.viewMode = "list";
        viewListBtn.classList.add("active");
        viewGridBtn.classList.remove("active");
        this.renderProducts();
      });
    }

    // Sort select
    const sortSelect = document.getElementById("sortSelect");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        this.sortBy = e.target.value;
        this.renderProducts();
      });
    }

    // Hotspot click in hero
    document.querySelectorAll(".hotspot").forEach(hotspot => {
      hotspot.addEventListener("click", () => {
        const targetId = hotspot.dataset.target;
        if (targetId) this.openQuickView(targetId);
      });
    });

    // Navbar scroll effect
    window.addEventListener("scroll", () => {
      const navbar = document.getElementById("navbar");
      if (navbar) {
        if (window.scrollY > 40) {
          navbar.classList.add("scrolled");
        } else {
          navbar.classList.remove("scrolled");
        }
      }
    });

    // Contact Form
    const contactForm = document.getElementById("contactForm");
    if (contactForm) {
      contactForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("clientName").value.trim();
        const phone = document.getElementById("clientPhone").value.trim();
        const msg = document.getElementById("clientMsg").value.trim();

        const fullMsg = `Bonjour YA FALY KA (Grand Mbao), je m'appelle *${encodeURIComponent(name)}* (Tél: ${encodeURIComponent(phone)}).%0A%0A${encodeURIComponent(msg)}`;
        window.open(`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${fullMsg}`, "_blank");
        this.showToast("Message transmis sur WhatsApp !", "success");
        contactForm.reset();
      });
    }

    // Mobile Navigation Drawer
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const closeMobileNavBtn = document.getElementById("closeMobileNavBtn");
    const mobileNavBackdrop = document.getElementById("mobileNavBackdrop");

    if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", () => this.openMobileMenu());
    if (closeMobileNavBtn) closeMobileNavBtn.addEventListener("click", () => this.closeMobileMenu());
    if (mobileNavBackdrop) {
      mobileNavBackdrop.addEventListener("click", (e) => {
        if (e.target === mobileNavBackdrop) this.closeMobileMenu();
      });
    }

    // Keyboard ESC to close any open modal or drawer
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeQuickView();
        this.closeCart();
        this.closeProformaModal();
        this.closePaletteModal();
        this.closeMobileMenu();
      }
    });
  }
}

// Instantiate and attach globally
const app = new YaFalyKaApp();
window.app = app;
document.addEventListener("DOMContentLoaded", () => app.init());
