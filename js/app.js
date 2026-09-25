/**
 * YA FALY KA - Advanced Interactive Engine
 * Grand Mbao, Cité Baye Niasse (+221 78 564 57 67)
 */

class YaFalyKaApp {
  constructor() {
    this.products = PRODUCTS || [];
    this.categories = CATEGORIES || [];
    this.gallery = STORE_GALLERY || [];
    this.videos = (typeof STORE_VIDEOS !== "undefined") ? STORE_VIDEOS : [];
    this.activeCategory = "all";
    this.searchQuery = "";
    this.sortBy = "featured";
    this.viewMode = "grid"; // 'grid' or 'list'
    this.displayLimit = 16; // Fast progressive rendering on mobile devices

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
    this.initHeroShowcase();
    this.renderCategoryPills();
    this.renderProducts();
    this.renderVideoShowroom();
    this.renderGallery();
    this.initDeliveryCalculator();
    this.initCommandPalette();
    this.initZoomLens();
    this.checkStoreOpenStatus();
    this.initScrollSpy();
    this.setupEventListeners();
    this.initLucide();
  }

  // ==========================================
  // HERO INTERACTIVE SHOWCASE
  // ==========================================
  initHeroShowcase() {
    const viewport = document.getElementById("heroShowcaseViewport");
    if (!viewport) return;

    const slides = viewport.querySelectorAll(".showcase-slide");
    const thumbBtns = document.querySelectorAll(".showcase-thumb-btn");
    const counter = document.getElementById("showcaseCounter");
    const progressBar = document.getElementById("showcaseProgressBar");
    const waBtn = document.getElementById("showcaseWaBtn");
    const prevBtn = document.getElementById("showcasePrevBtn");
    const nextBtn = document.getElementById("showcaseNextBtn");

    if (!slides.length) return;

    let currentIndex = 0;
    const totalSlides = slides.length;
    const slideDuration = 4500; // 4.5 seconds per slide
    let timer = null;
    let progressInterval = null;
    let progressPercent = 0;

    const showSlide = (index) => {
      if (index < 0) index = totalSlides - 1;
      if (index >= totalSlides) index = 0;
      currentIndex = index;

      slides.forEach((s, idx) => {
        if (idx === currentIndex) {
          s.classList.add("active");
        } else {
          s.classList.remove("active");
        }
      });

      thumbBtns.forEach((btn, idx) => {
        if (idx === currentIndex) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });

      if (counter) {
        counter.textContent = `${currentIndex + 1} / ${totalSlides}`;
      }

      // Update WhatsApp message on the slide button
      if (waBtn) {
        const activeSlide = slides[currentIndex];
        const waMsg = activeSlide ? activeSlide.getAttribute("data-wa") : "Bonjour YA FALY KA, je souhaite des informations sur vos articles.";
        waBtn.href = `https://wa.me/221785645767?text=${encodeURIComponent(waMsg || "")}`;
      }

      resetProgress();
    };

    const resetProgress = () => {
      progressPercent = 0;
      if (progressBar) progressBar.style.width = "0%";
    };

    const startAutoPlay = () => {
      clearInterval(timer);
      clearInterval(progressInterval);
      progressPercent = 0;

      const stepMs = 50;
      const increment = (stepMs / slideDuration) * 100;

      progressInterval = setInterval(() => {
        progressPercent += increment;
        if (progressBar) progressBar.style.width = `${Math.min(progressPercent, 100)}%`;
      }, stepMs);

      timer = setInterval(() => {
        showSlide(currentIndex + 1);
      }, slideDuration);
    };

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        showSlide(currentIndex - 1);
        startAutoPlay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        showSlide(currentIndex + 1);
        startAutoPlay();
      });
    }

    thumbBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetIndex = parseInt(btn.getAttribute("data-index"), 10);
        if (!isNaN(targetIndex)) {
          showSlide(targetIndex);
          startAutoPlay();
        }
      });
    });

    // Quick category pills in hero text
    const heroQuickPills = document.querySelectorAll(".quick-cat-pill");
    heroQuickPills.forEach(pill => {
      pill.addEventListener("click", (e) => {
        e.preventDefault();
        const cat = pill.getAttribute("data-category");
        if (cat) {
          this.setCategory(cat);
          const catSection = document.getElementById("catalogue");
          if (catSection) {
            catSection.scrollIntoView({ behavior: "smooth" });
          }
        }
      });
    });

    // Touch swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;

    viewport.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
      clearInterval(timer);
      clearInterval(progressInterval);
    }, { passive: true });

    viewport.addEventListener("touchend", (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diffX = touchStartX - touchEndX;
      if (Math.abs(diffX) > 40) {
        if (diffX > 0) {
          showSlide(currentIndex + 1);
        } else {
          showSlide(currentIndex - 1);
        }
      }
      startAutoPlay();
    }, { passive: true });

    // Pause on hover, resume on mouse leave
    viewport.addEventListener("mouseenter", () => {
      clearInterval(timer);
      clearInterval(progressInterval);
    });

    viewport.addEventListener("mouseleave", () => {
      startAutoPlay();
    });

    // Start with slide 0
    showSlide(0);
    startAutoPlay();
  }

  initLucide(rootElement = null) {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      if (rootElement) {
        window.lucide.createIcons({ root: rootElement });
      } else {
        window.lucide.createIcons();
      }
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
      if (theme === "light") {
        themeIcon.innerHTML = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
      } else {
        themeIcon.innerHTML = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
      }
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
    this.displayLimit = 16;
    const container = document.getElementById("categoryPillsContainer");
    if (container) {
      container.querySelectorAll(".cat-pill").forEach(pill => {
        pill.classList.toggle("active", pill.dataset.category === catId);
      });
    }
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

    // Performance pagination: initial batch of 16 cards for instant mobile load
    const displayCount = this.displayLimit || 16;
    const isAll = this.activeCategory === "all" && !this.searchQuery.trim();
    const visibleList = isAll ? list.slice(0, displayCount) : list;
    const hasMore = isAll && list.length > displayCount;

    // Inline SVGs to avoid 260+ synchronous Lucide DOM queries on the main thread
    const eyeSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const checkSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;
    const starSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const waSvg = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>`;

    const cardsHtml = visibleList.map(p => {
      const badgeClass = `badge-${p.badgeType || "hot"}`;
      const waUrl = this.generateWhatsAppUrl(p.name, p.id, p.image);
      return `
        <article class="product-card" data-id="${p.id}">
          <div class="card-media-wrap" onclick="app.openQuickView('${p.id}')">
            <img src="${p.image}" alt="${p.name} - Magasin YA FALY KA Grand Mbao Dakar" class="card-img" loading="lazy" decoding="async">
            <span class="card-badge ${badgeClass}">${p.badge}</span>
            <div class="card-quick-actions">
              <button class="btn-quick-view" onclick="event.stopPropagation(); app.openQuickView('${p.id}')">
                ${eyeSvg}
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
                ${checkSvg}
                <span>En stock magasin</span>
              </span>
              <div class="card-rating">
                ${starSvg}
                <span>${p.rating}</span>
                <span style="color:var(--text-muted);font-weight:normal;">(${p.reviewsCount})</span>
              </div>
            </div>

            <div class="card-cta-row card-cta-single">
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-discuss-whatsapp" title="Discuter immédiatement de cet article sur WhatsApp">
                ${waSvg}
                <span>Discuter sur WhatsApp</span>
              </a>
            </div>
          </div>
        </article>
      `;
    }).join("");

    let moreBtnHtml = "";
    if (hasMore) {
      const remaining = list.length - displayCount;
      moreBtnHtml = `
        <div class="load-more-container" style="grid-column: 1 / -1; text-align: center; margin: 2.5rem 0 1rem;">
          <button class="btn-primary load-more-btn" onclick="app.loadMoreProducts()" style="padding: 0.95rem 2.4rem; font-size: 0.98rem; box-shadow: var(--shadow-gold);">
            <span>Afficher plus d'articles (+${remaining} articles)</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-left:6px;"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      `;
    }

    grid.innerHTML = cardsHtml + moreBtnHtml;
    this.attach3DTilt();
  }

  loadMoreProducts() {
    this.displayLimit = (this.displayLimit || 16) + 20;
    this.renderProducts();
  }

  attach3DTilt() {
    if (this.viewMode === "list") return;
    // Skip 3D mouse tilt on mobile devices or touch screens
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;
    if (window.innerWidth < 992) return;

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

    const waMiniSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>`;

    resultsContainer.innerHTML = list.slice(0, 6).map(p => `
      <div class="palette-item" onclick="app.openQuickView('${p.id}'); app.closePaletteModal();">
        <img src="${p.image}" alt="${p.name}" class="palette-item-img">
        <div class="palette-item-info">
          <div class="palette-item-title">${p.name}</div>
          <small style="color:var(--text-secondary);">${p.categoryLabel}</small>
        </div>
        <span class="palette-item-action">
          ${waMiniSvg}
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
  // QUICK VIEW MODAL (INSTANT 0MS RESPONSE)
  // ==========================================
  openQuickView(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    this.currentModalProduct = product;
    this.modalQty = 1;

    // 1. Instantly open modal for zero perceptible tap latency
    const modal = document.getElementById("quickViewModal");
    if (modal) {
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    const titleEl = document.getElementById("modalTitle");
    if (titleEl) titleEl.textContent = product.name;
    const catEl = document.getElementById("modalCategory");
    if (catEl) catEl.textContent = product.categoryLabel;

    const priceEl = document.getElementById("modalPrice");
    if (priceEl) priceEl.style.display = "none";
    const oldPriceEl = document.getElementById("modalOldPrice");
    if (oldPriceEl) oldPriceEl.style.display = "none";

    const descEl = document.getElementById("modalDesc");
    if (descEl) descEl.textContent = product.description;
    const stockEl = document.getElementById("modalStockText");
    if (stockEl) stockEl.textContent = product.stockStatus || "En stock à Grand Mbao (Livraison immédiate)";

    const dimEl = document.getElementById("modalDimensions");
    if (dimEl && dimEl.querySelector("span")) {
      dimEl.querySelector("span").textContent = product.dimensions || "Standard";
    }

    const checkSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    const featuresList = document.getElementById("modalFeaturesList");
    if (featuresList) {
      featuresList.innerHTML = (product.features || []).map(f => `
        <li class="modal-feature-item">
          ${checkSvg}
          <span>${f}</span>
        </li>
      `).join("");
    }

    const mainImg = document.getElementById("modalMainImg");
    if (mainImg) mainImg.src = product.image;

    const thumbStudioImg = document.getElementById("modalThumbStudioImg");
    if (thumbStudioImg) thumbStudioImg.src = product.image;

    const thumbStoreImg = document.getElementById("modalThumbStoreImg");
    if (thumbStoreImg) thumbStoreImg.src = product.storePhoto || product.image;

    const btnStudio = document.getElementById("modalThumbStudio");
    const btnStore = document.getElementById("modalThumbStore");
    if (btnStudio && btnStore) {
      btnStudio.style.display = "flex";
      btnStore.style.display = "flex";
      btnStudio.classList.add("active");
      btnStore.classList.remove("active");

      btnStudio.onclick = () => {
        if (mainImg) mainImg.src = product.image;
        btnStudio.classList.add("active");
        btnStore.classList.remove("active");
      };

      btnStore.onclick = () => {
        if (mainImg) mainImg.src = product.storePhoto || product.image;
        btnStore.classList.add("active");
        btnStudio.classList.remove("active");
      };
    }

    this.updateModalWhatsAppBtn();
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
    const modal = document.getElementById("quickViewModal");
    if (modal) {
      modal.classList.add("open");
      document.body.style.overflow = "hidden";
    }

    const mainImg = document.getElementById("modalMainImg");
    if (mainImg) mainImg.src = imgSrc;
    const titleEl = document.getElementById("modalTitle");
    if (titleEl) titleEl.textContent = title;
    const catEl = document.getElementById("modalCategory");
    if (catEl) catEl.textContent = "Visite Magasin Grand Mbao";

    const priceEl = document.getElementById("modalPrice");
    if (priceEl) priceEl.style.display = "none";
    const oldPriceEl = document.getElementById("modalOldPrice");
    if (oldPriceEl) oldPriceEl.style.display = "none";

    const descEl = document.getElementById("modalDesc");
    if (descEl) descEl.textContent = caption;
    const stockEl = document.getElementById("modalStockText");
    if (stockEl) stockEl.textContent = "En stock à Grand Mbao, Cité Baye Niasse";

    const checkSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    const featuresList = document.getElementById("modalFeaturesList");
    if (featuresList) {
      featuresList.innerHTML = `
        <li class="modal-feature-item">${checkSvg}<span>Conseils personnalisés par notre équipe sur place</span></li>
        <li class="modal-feature-item">${checkSvg}<span>Possibilité de tester et d'essayer les articles en rayon</span></li>
      `;
    }

    const btnStudio = document.getElementById("modalThumbStudio");
    const btnStore = document.getElementById("modalThumbStore");
    if (btnStudio) btnStudio.style.display = "none";
    if (btnStore) btnStore.style.display = "none";
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
      btn.onclick = null;
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
  // SHOWROOM VIDEO RENDERING & MODAL
  // ==========================================
  renderVideoShowroom() {
    const grid = document.getElementById("videoShowroomGrid");
    if (!grid) return;

    grid.innerHTML = (this.videos || []).map((v) => `
      <div class="video-card" onclick="app.openVideoModal('${v.id}')">
        <div class="video-card-thumb">
          <img src="${v.poster}" alt="${v.title}" class="video-poster-img" loading="lazy">
          <div class="video-tag-pill">${v.badge}</div>
          <div class="video-live-indicator">
            <span class="live-dot"></span>
            <span>DIRECT</span>
          </div>
          <div class="video-card-overlay">
            <div class="video-play-btn-circle" title="Lire la vidéo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
          </div>
        </div>
        <div class="video-card-meta">
          <h4 class="video-card-title">${v.title}</h4>
          <p class="video-card-sub">${v.subtitle}</p>
          <div class="video-watch-now">
            <span>Regarder la vidéo</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>
      </div>
    `).join("");
  }

  openVideoModal(videoId) {
    const video = (this.videos || []).find(v => v.id === videoId);
    if (!video) return;

    const backdrop = document.getElementById("videoModalBackdrop");
    const player = document.getElementById("showroomVideoPlayer");
    const titleEl = document.getElementById("videoModalTitle");
    const subEl = document.getElementById("videoModalSubtitle");
    const tagEl = document.getElementById("videoModalTag");
    const waBtn = document.getElementById("videoModalWhatsAppBtn");
    const spinner = document.getElementById("videoPlayerSpinner");

    if (!backdrop || !player) return;

    if (titleEl) titleEl.textContent = video.title;
    if (subEl) subEl.textContent = video.subtitle;
    if (tagEl) tagEl.textContent = video.badge + " • Grand Mbao";

    if (waBtn) {
      const msg = encodeURIComponent(`Bonjour YA FALY KA, j'ai vu la vidéo "${video.title}" sur votre site et j'aimerais avoir plus d'informations et le prix.`);
      waBtn.href = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${msg}`;
    }

    if (spinner) spinner.style.display = "flex";

    player.pause();
    player.src = video.src;
    player.poster = video.poster || "";
    player.load();

    const hideSpinner = () => {
      if (spinner) spinner.style.display = "none";
    };

    player.oncanplay = hideSpinner;
    player.onplaying = hideSpinner;
    player.onwaiting = () => {
      if (spinner) spinner.style.display = "flex";
    };

    backdrop.classList.add("active");
    document.body.style.overflow = "hidden";

    // Play video smoothly; if unmuted autoplay is blocked by browser, try muted autoplay
    const playPromise = player.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        hideSpinner();
      }).catch(() => {
        hideSpinner();
        player.muted = true;
        player.play().catch(() => {
          player.muted = false;
        });
      });
    }
  }

  closeVideoModal() {
    const backdrop = document.getElementById("videoModalBackdrop");
    const player = document.getElementById("showroomVideoPlayer");
    const spinner = document.getElementById("videoPlayerSpinner");

    if (player) {
      player.pause();
      player.oncanplay = null;
      player.onplaying = null;
      player.onwaiting = null;
      player.removeAttribute("src");
      player.load();
    }

    if (spinner) spinner.style.display = "none";
    if (backdrop) backdrop.classList.remove("active");
    document.body.style.overflow = "";
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
    const backdrop = document.getElementById("mobileNavBackdrop");
    const drawer = document.getElementById("mobileNavDrawer");
    if (backdrop) {
      backdrop.classList.add("open");
      backdrop.setAttribute("aria-hidden", "false");
    }
    if (drawer) {
      drawer.classList.add("open");
    }
    document.body.style.overflow = "hidden";
  }

  closeMobileMenu() {
    const backdrop = document.getElementById("mobileNavBackdrop");
    const drawer = document.getElementById("mobileNavDrawer");
    if (backdrop) {
      backdrop.classList.remove("open");
      backdrop.setAttribute("aria-hidden", "true");
    }
    if (drawer) {
      drawer.classList.remove("open");
    }
    document.body.style.overflow = "";
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
      photoLine = `\n▪ *Photo :* ${fullUrl}\n`;
    }

    const rawMsg = `Bonjour YA FALY KA (Grand Mbao), je suis intéressé(e) par l'article suivant vu sur votre site :\n\n` +
      `▪ *Article :* ${productName}${refStr}${photoLine}\n` +
      `▪ *Disponibilité :* Magasin Grand Mbao, Cité Baye Niasse\n\n` +
      `Pourriez-vous m'indiquer le meilleur tarif actuel et les modalités de livraison ? Merci.`;

    return `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(rawMsg)}`;
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
    
    let iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;
    if (type === "warning") {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else if (type === "info") {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <span>${message}</span>
    `;

    container.appendChild(toast);

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

    // Video Modal Close events
    const closeVideoModalBtn = document.getElementById("closeVideoModalBtn");
    const videoModalBackdrop = document.getElementById("videoModalBackdrop");
    if (closeVideoModalBtn) closeVideoModalBtn.addEventListener("click", () => this.closeVideoModal());
    if (videoModalBackdrop) {
      videoModalBackdrop.addEventListener("click", (e) => {
        if (e.target === videoModalBackdrop) this.closeVideoModal();
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
        this.closeVideoModal();
      }
    });
  }
}

// Instantiate and attach globally
const app = new YaFalyKaApp();
window.app = app;
document.addEventListener("DOMContentLoaded", () => app.init());
