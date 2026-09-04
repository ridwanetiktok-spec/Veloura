// ============================================
// Veloura - Storefront JavaScript
// ============================================

// ===== State =====
let products = [];
let categories = [];
let banners = {};
let blogPosts = [];
let settings = {};
let reviews = [];
let cart = JSON.parse(localStorage.getItem('luxbeauty_cart') || '[]');
let wishlist = JSON.parse(localStorage.getItem('luxbeauty_wishlist') || '[]');
let currentSlide = 0;
let slideInterval;
let publicRealtimeChannel;

function mapProduct(row) {
  return { ...row, salePrice: row.sale_price, shortDescription: row.short_description, skinType: row.skin_type, bestSeller: row.best_seller, newArrival: row.new_arrival, createdAt: row.created_at };
}

function mapCategory(row) {
  return { ...row, order: row.sort_order };
}

function mapBlogPost(row) {
  return { ...row, coverImage: row.cover_image, publishDate: row.publish_date };
}

function mapReview(row) {
  return { ...row, productName: row.product_name };
}

async function loadPublicFromSupabase() {
  const client = window.supabaseClient;
  const results = await Promise.all([
    client.from('products').select('*').order('id'),
    client.from('categories').select('*').order('sort_order'),
    client.from('banners').select('type,data'),
    client.from('blog_posts').select('*').order('publish_date', { ascending: false }),
    client.from('settings').select('data').eq('id', 1).maybeSingle(),
    client.from('reviews').select('*').order('date', { ascending: false })
  ]);
  const error = results.find(result => result.error)?.error;
  if (error) throw error;
  products = (results[0].data || []).map(mapProduct);
  categories = (results[1].data || []).map(mapCategory);
  banners = (results[2].data || []).reduce((all, row) => ({ ...all, [row.type]: row.data }), { heroSlides: [] });
  blogPosts = (results[3].data || []).map(mapBlogPost);
  settings = results[4].data?.data || { siteName: 'Veloura' };
  reviews = (results[5].data || []).map(mapReview);
}

function subscribeToPublicRealtime() {
  const client = window.supabaseClient;
  if (!client || publicRealtimeChannel) return;
  publicRealtimeChannel = client.channel('veloura-public-data')
    .on('postgres_changes', { event: '*', schema: 'public' }, () => loadData())
    .subscribe();
}

// Default reviews fallback
const DEFAULT_REVIEWS = [
  {
    id: 1,
    author: "Sarah Mitchell",
    initials: "SM",
    subtitle: "Verified Buyer",
    rating: 5,
    text: "The Radiant Glow Serum completely transformed my skin. I've been using it for 3 weeks and my complexion has never looked better. Absolutely worth every penny!",
    productName: "Radiant Glow Serum",
    date: "2026-02-15"
  },
  {
    id: 2,
    author: "Jessica Chen",
    initials: "JC",
    subtitle: "Verified Buyer",
    rating: 5,
    text: "I'm obsessed with the Velvet Matte Lipstick! The color payoff is incredible and it lasts all day without drying out my lips. This is my new holy grail.",
    productName: "Velvet Matte Lipstick",
    date: "2026-02-18"
  },
  {
    id: 3,
    author: "Amanda Rodriguez",
    initials: "AR",
    subtitle: "Verified Buyer",
    rating: 5,
    text: "The Luxury Gift Set was the perfect birthday present for my sister. The packaging alone is stunning, and the products inside are even better. She hasn't stopped talking about it!",
    productName: "Rose Gold Luxury Gift Set",
    date: "2026-02-22"
  },
  {
    id: 4,
    author: "Elena Rostova",
    initials: "ER",
    subtitle: "Verified Buyer",
    rating: 5,
    text: "The Silk Hydrating Night Cream feels divine on the skin. I wake up every morning with plump, soft skin. Truly high luxury quality.",
    productName: "Silk Hydrating Night Cream",
    date: "2026-02-28"
  }
];

// ===== Data Loading =====
async function loadData() {
  try {
    await loadPublicFromSupabase();
    subscribeToPublicRealtime();
    initSite();
  } catch (e) {
    console.error('Error loading Supabase data:', e);
    products = [];
    categories = [];
    blogPosts = [];
    reviews = DEFAULT_REVIEWS;
    banners = { newsBanner: { enabled: false }, promoBanner: { enabled: false }, heroSlides: [] };
    settings = { siteName: 'Veloura' };
    initSite();
  }
}

// ===== Seamless Carousel Controller =====
const carouselTimers = {};
const carouselStates = {};
let categoryCarouselState = null;

function getCarouselTarget(track, index) {
  const item = track.children[index];
  if (!item) return track.scrollLeft;
  return item.offsetLeft - track.offsetLeft;
}

function normalizeCarousel(state) {
  const { track, count } = state;
  if (!count) return;

  while (state.index < count * 2) state.index += count;
  while (state.index >= count * 3) state.index -= count;

  const target = getCarouselTarget(track, state.index);
  if (state.useTransform) {
    track.style.transition = 'none';
    track.style.transform = `translate3d(${-target}px, 0, 0)`;
    void track.offsetHeight;
    track.style.transition = '';
  } else {
    track.style.scrollBehavior = 'auto';
    track.scrollLeft = target;
    void track.offsetHeight;
    track.style.scrollBehavior = 'smooth';
  }
}

function finishCarouselMove(state) {
  clearTimeout(state.moveTimer);
  state.moveTimer = setTimeout(() => {
    normalizeCarousel(state);
    state.animating = false;
    if (state.queue) {
      const nextDirection = state.queue > 0 ? 1 : -1;
      state.queue -= nextDirection;
      moveCarousel(state, nextDirection);
    }
  }, 650);
}

function moveCarousel(state, direction) {
  if (!state || state.count < 2) return;
  if (state.animating) {
    state.queue += direction > 0 ? 1 : -1;
    return;
  }
  state.animating = true;
  state.index += direction > 0 ? 1 : -1;
  trackToIndex(state, state.index);
  finishCarouselMove(state);
}

function trackToIndex(state, index) {
  const target = getCarouselTarget(state.track, index);
  if (state.useTransform) {
    state.track.style.transform = `translate3d(${-target}px, 0, 0)`;
  } else {
    state.track.scrollTo({ left: target, behavior: 'smooth' });
  }
}

function updateCarouselIndexFromScroll(state) {
  const { track } = state;
  let closestIndex = state.index;
  let closestDistance = Infinity;
  Array.from(track.children).forEach((item, index) => {
    const distance = Math.abs(getCarouselTarget(track, index) - track.scrollLeft);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });
  state.index = closestIndex;
}

function measureCarousel(state) {
  const { track, count } = state;
  const firstItem = track.children[0];
  const cycleStart = track.children[count];
  const middleStart = track.children[count * 2];
  const middleEnd = track.children[count * 3];
  if (!firstItem || !cycleStart || !middleStart || !middleEnd) return false;

  const trackOffset = track.getBoundingClientRect().left;
  state.metrics = {
    cycleWidth: cycleStart.getBoundingClientRect().left - firstItem.getBoundingClientRect().left,
    lowerBoundary: middleStart.getBoundingClientRect().left - trackOffset - (
      cycleStart.getBoundingClientRect().left - firstItem.getBoundingClientRect().left
    ),
    upperBoundary: middleEnd.getBoundingClientRect().left - trackOffset
  };
  return state.metrics.cycleWidth > 0;
}

function settleNativeCarousel(state) {
  if (state.useTransform || state.animating) return;

  const { track } = state;
  if (!state.metrics && !measureCarousel(state)) return;
  const { cycleWidth, lowerBoundary, upperBoundary } = state.metrics;

  let nextScrollLeft = track.scrollLeft;
  while (nextScrollLeft < lowerBoundary) {
    nextScrollLeft += cycleWidth;
  }
  while (nextScrollLeft > upperBoundary) {
    nextScrollLeft -= cycleWidth;
  }

  if (nextScrollLeft !== track.scrollLeft) {
    const previousScrollBehavior = track.style.scrollBehavior;
    track.style.scrollBehavior = 'auto';
    track.scrollLeft = nextScrollLeft;
    void track.offsetHeight;
    track.style.scrollBehavior = previousScrollBehavior;
  }

  updateCarouselIndexFromScroll(state);
}

function initCarouselAutoLoop(trackId, intervalMs = 3000) {
  const track = document.getElementById(trackId);
  if (!track || carouselStates[trackId]) return;

  const originals = Array.from(track.children);
  if (originals.length < 2) return;

  const count = originals.length;
  track.dataset.originalCount = count;
  track.classList.add('infinite-carousel-track');
  track.style.scrollSnapType = 'none';
  const useTransform = trackId === 'testimonialsTrack';

  track.innerHTML = '';

  Array.from({ length: 5 }, () => originals).flat().forEach((original, index) => {
    const item = index >= count * 2 && index < count * 3
      ? original
      : original.cloneNode(true);

    if (index < count * 2 || index >= count * 3) {
      item.setAttribute('aria-hidden', 'true');

      item.querySelectorAll('a, button, input, select, textarea').forEach(control => {
        control.setAttribute('tabindex', '-1');
      });
    }

    track.appendChild(item);
  });

  const state = carouselStates[trackId] = {
    track,
    count,
    index: count * 2,
    useTransform,
    metrics: null,
    animating: false,
    queue: 0,
    moveTimer: null
  };

  requestAnimationFrame(() => {
    measureCarousel(state);
    normalizeCarousel(state);

    setTimeout(() => normalizeCarousel(state), 500);
    setTimeout(() => normalizeCarousel(state), 1000);
    setTimeout(() => normalizeCarousel(state), 3000);
  });

  const wrapper = track.closest('.carousel-wrapper') || track;

  if (useTransform) {
    wrapper.classList.add('infinite-transform-wrapper');
    track.classList.add('infinite-transform-carousel');
  }

  let scrollEndTimer;

  const handleNativeScroll = () => {
    clearTimeout(scrollEndTimer);

    scrollEndTimer = setTimeout(() => {
      settleNativeCarousel(state);
    }, 140);

    if (
      !state.animating &&
      state.metrics &&
      (
        track.scrollLeft < state.metrics.lowerBoundary ||
        track.scrollLeft > state.metrics.upperBoundary
      )
    ) {
      settleNativeCarousel(state);
    }
  };

  track.addEventListener('scroll', handleNativeScroll, { passive: true });

  track.addEventListener('scrollend', () => {
    clearTimeout(scrollEndTimer);
    settleNativeCarousel(state);
  }, { passive: true });

  function startTimer() {
    carouselTimers[trackId] = setInterval(
      () => moveCarousel(state, 1),
      intervalMs
    );
  }

  startTimer();

  wrapper.addEventListener('mouseenter', () => {
    clearInterval(carouselTimers[trackId]);
    carouselTimers[trackId] = null;
  });

  wrapper.addEventListener('mouseleave', () => {
    if (!carouselTimers[trackId]) startTimer();
  });
}

function scrollCarousel(trackId, direction) {
  if (trackId === 'categoriesGrid') {
    categoryCarouselState?.move(direction);
    return;
  }

  if (trackId === 'testimonialsTrack') {
    testimonialsCarouselState?.move(direction);
    return;
  }

  moveCarousel(carouselStates[trackId], direction);
}

// ===== Category Infinite Carousel =====

function measureCategoryCarousel(state) {
  const first = state.track.children[0];
  const second = state.track.children[1];

  if (!first || !second) return 0;

  const firstRect = first.getBoundingClientRect();
  const secondRect = second.getBoundingClientRect();

  state.step = secondRect.left - firstRect.left;
  return state.step;
}

const CATEGORY_TRANSITION =
  'transform 0.6s cubic-bezier(0.45, 0.05, 0.2, 1)';

function applyCategoryTransform(state, offset, animate) {
  state.track.style.transition = animate
    ? CATEGORY_TRANSITION
    : 'none';

  state.track.style.transform =
    `translate3d(${-offset}px, 0, 0)`;
}

// Keeps the logical offset inside [0, step)
// by rotating fully hidden cards around the loop.
function normalizeCategoryLoop(state) {
  const len = state.track.children.length;
  let guard = 0;
  const maxGuard = len + 4;

  if (state.step <= 0) return;

  while (
    state.offset >= state.step &&
    guard++ < maxGuard
  ) {
    const first = state.track.firstElementChild;
    if (!first) break;

    state.track.appendChild(first);
    state.offset -= state.step;
  }

  while (
    state.offset < 0 &&
    guard++ < maxGuard
  ) {
    const last = state.track.lastElementChild;
    if (!last) break;

    state.track.prepend(last);
    state.offset += state.step;
  }
}

function finishCategoryTransition(state) {
  state.animating = false;
  state.track.classList.remove('dragging');

  clearTimeout(state.transitionFallback);
  state.transitionFallback = null;

  const fromOffset = state.offset;

  normalizeCategoryLoop(state);

  applyCategoryTransform(
    state,
    state.offset,
    false
  );

  if (state.offset !== fromOffset) {
    void state.track.offsetWidth;
  }
}

// Animates the category track and performs invisible loop wrapping
// after the visible transition completes.
function animateCategoryTrack(state, fromOffset, toOffset) {
  state.animating = true;

  // Moving backward past the left edge:
  // move the last card to the front first so no empty area is exposed.
  if (toOffset < 0) {
    const last = state.track.lastElementChild;

    if (last) {
      state.track.prepend(last);
      fromOffset += state.step;
      toOffset += state.step;
    }
  }

  state.offset = toOffset;

  applyCategoryTransform(
    state,
    fromOffset,
    false
  );

  void state.track.offsetWidth;

  applyCategoryTransform(
    state,
    toOffset,
    true
  );

  clearTimeout(state.transitionFallback);

  state.transitionFallback = window.setTimeout(
    () => finishCategoryTransition(state),
    700
  );
}

function moveCategoryCarousel(state, direction) {
  if (state.animating) return;

  const step = measureCategoryCarousel(state);

  if (!step || state.track.children.length < 2) return;

  const fromOffset = state.offset;
  const toOffset =
    state.offset +
    (direction >= 0 ? step : -step);

  animateCategoryTrack(
    state,
    fromOffset,
    toOffset
  );
}

function settleCategoryScroll() {
  // Kept for interface compatibility.
  // Wrapping is handled after the transform transition.
}

function initCircularCategoryCarousel() {
  const track =
    document.getElementById('categoriesGrid');

  if (!track || categoryCarouselState) return;

  const state = categoryCarouselState = {
    track,
    step: 0,
    offset: 0,
    animating: false,
    autoplayTimer: null,
    transitionFallback: null,
    listeners: []
  };

  const on = (
    target,
    type,
    handler,
    options
  ) => {
    target.addEventListener(
      type,
      handler,
      options
    );

    state.listeners.push(() =>
      target.removeEventListener(
        type,
        handler,
        options
      )
    );
  };

  measureCategoryCarousel(state);

  applyCategoryTransform(
    state,
    0,
    false
  );

  on(
    track,
    'transitionend',
    event => {
      if (
        event.target !== track ||
        event.propertyName !== 'transform'
      ) {
        return;
      }

      if (state.animating) {
        finishCategoryTransition(state);
      }
    }
  );

  // ---- Drag / swipe ----

  let drag = null;

  const beginDrag = event => {
    if (
      event.pointerType === 'mouse' &&
      event.button !== 0
    ) {
      return;
    }

    if (state.animating) return;

    drag = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      baseOffset: state.offset,
      moved: false,
      startTime: Date.now()
    };

    // IMPORTANT:
    // Do not capture desktop mouse pointers.
    // This keeps normal category card clicks working.
    // Touch / pen still use pointer capture for swipe handling.
    if (event.pointerType !== 'mouse') {
      track.setPointerCapture(event.pointerId);
    }

    track.classList.add('dragging');
  };

  const moveDrag = event => {
    if (
      !drag ||
      event.pointerId !== drag.pointerId
    ) {
      return;
    }

    const deltaX =
      event.clientX - drag.startX;

    if (Math.abs(deltaX) > 4) {
      drag.moved = true;
    }

    state.offset =
      drag.baseOffset - deltaX;

    applyCategoryTransform(
      state,
      state.offset,
      false
    );
  };

  const endDrag = event => {
    if (
      !drag ||
      event.pointerId !== drag.pointerId
    ) {
      return;
    }

    const deltaX =
      event.clientX - drag.startX;

    const duration =
      Date.now() - drag.startTime;

    const velocity =
      duration > 0
        ? Math.abs(deltaX) / duration
        : 0;

    const wasDrag = drag;

    drag = null;

    track.classList.remove('dragging');

    const step =
      measureCategoryCarousel(state);

    if (!step) return;

    const fromOffset = state.offset;

    // Normal click / tap:
    // do not move the carousel.
    if (!wasDrag.moved) {
      state.offset =
        wasDrag.baseOffset;

      applyCategoryTransform(
        state,
        wasDrag.baseOffset,
        false
      );

      return;
    }

    // Swipe left -> next
    if (
      wasDrag.moved &&
      deltaX <= -40
    ) {
      animateCategoryTrack(
        state,
        fromOffset,
        wasDrag.baseOffset + step
      );

      return;
    }

    // Swipe right -> previous
    if (
      wasDrag.moved &&
      deltaX >= 40
    ) {
      animateCategoryTrack(
        state,
        fromOffset,
        wasDrag.baseOffset - step
      );

      return;
    }

    // Fast flick
    if (
      wasDrag.moved &&
      velocity > 0.6
    ) {
      if (deltaX < 0) {
        animateCategoryTrack(
          state,
          fromOffset,
          wasDrag.baseOffset + step
        );
      } else {
        animateCategoryTrack(
          state,
          fromOffset,
          wasDrag.baseOffset - step
        );
      }

      return;
    }

    // Not enough movement -> snap back
    animateCategoryTrack(
      state,
      fromOffset,
      wasDrag.baseOffset
    );
  };

  const cancelDrag = event => {
    if (
      drag &&
      event.pointerId === drag.pointerId
    ) {
      const baseOffset =
        drag.baseOffset;

      drag = null;

      track.classList.remove('dragging');

      if (state.animating) {
        finishCategoryTransition(state);
      } else {
        state.offset = baseOffset;

        applyCategoryTransform(
          state,
          baseOffset,
          false
        );
      }
    }
  };

  on(
    track,
    'pointerdown',
    beginDrag
  );

  on(
    track,
    'pointermove',
    moveDrag
  );

  on(
    track,
    'pointerup',
    endDrag
  );

  on(
    track,
    'pointercancel',
    cancelDrag
  );

  on(
    track,
    'lostpointercapture',
    cancelDrag
  );

  // ---- Autoplay ----

  const startAutoplay = () => {
    state.autoplayTimer =
      setInterval(
        () => state.move(1),
        3500
      );
  };

  const pauseAutoplay = () => {
    clearInterval(
      state.autoplayTimer
    );

    state.autoplayTimer = null;
  };

  const wrapper =
    track.closest('.carousel-wrapper') ||
    track;

  on(
    wrapper,
    'mouseenter',
    pauseAutoplay
  );

  on(
    wrapper,
    'mouseleave',
    () => {
      if (!state.autoplayTimer) {
        startAutoplay();
      }
    }
  );

  state.move =
    direction =>
      moveCategoryCarousel(
        state,
        direction
      );

  state.destroy = () => {
    pauseAutoplay();

    if (state.transitionFallback) {
      clearTimeout(
        state.transitionFallback
      );
    }

    state.listeners.forEach(
      remove => remove()
    );

    categoryCarouselState = null;
  };

  on(
    window,
    'resize',
    () => {
      requestAnimationFrame(() => {
        measureCategoryCarousel(state);

        finishCategoryTransition(
          state
        );
      });
    }
  );

  track.style.touchAction =
    'pan-y pinch-zoom';

  startAutoplay();
}

window.addEventListener(
  'resize',
  () => {
    requestAnimationFrame(() => {
      Object.values(carouselStates)
        .forEach(state => {
          measureCarousel(state);
          normalizeCarousel(state);
        });
    });
  }
);

window.addEventListener(
  'load',
  () => {
    Object.values(carouselStates)
      .forEach(normalizeCarousel);
  }
);

// ===== Initialize =====

function initSite() {
  renderNewsBanner();
  renderHero();
  renderCategories();
  renderFeaturedProducts();
  renderBestSellers();
  renderNewArrivals();
  renderJewelry();
  renderNails();
  renderTestimonials();
  renderPromoBanner();
  renderBlog();
  renderFooter();
  renderShop();
  updateCartBadge();
  updateWishlistBadge();
  setupEventListeners();
  initializeTestimonialsCarousel();
  setupScrollAnimations();

  // Initialize custom dropdowns
  initCustomSortDropdown();

  // Initialize infinite carousels with hover-pause
  initCircularCategoryCarousel();

  initCarouselAutoLoop(
    'featuredProducts',
    3500
  );

  initCarouselAutoLoop(
    'bestSellers',
    3000
  );

  initCarouselAutoLoop(
    'newArrivals',
    3800
  );

  initCarouselAutoLoop(
    'jewelryCollection',
    3400
  );

  initCarouselAutoLoop(
    'nailStudio',
    3600
  );
}

// ===== News Banner =====

function renderNewsBanner() {
  const el =
    document.getElementById(
      'newsBanner'
    );

  if (!el) return;

  const nb = banners.newsBanner;

  if (nb && nb.enabled) {
    el.textContent = nb.text;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

// ===== Hero Slider =====

function renderHero() {
  const container =
    document.getElementById(
      'heroSlides'
    );

  const dotsContainer =
    document.getElementById(
      'heroDots'
    );

  if (
    !container ||
    !banners.heroSlides
  ) {
    return;
  }

  const slides =
    banners.heroSlides.sort(
      (a, b) => a.order - b.order
    );

  container.innerHTML =
    slides.map(
      (slide, i) => `
    <div class="hero-slide ${i === 0 ? 'active' : ''}" data-slide="${i}">
      <img src="${slide.image}" alt="${slide.headline}">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <h1>${slide.headline}</h1>
        <p>${slide.subheadline}</p>
        <a href="${slide.buttonLink}" class="btn-primary">${slide.buttonText}</a>
      </div>
    </div>
  `
    ).join('');

  dotsContainer.innerHTML =
    slides.map(
      (_, i) => `
    <div class="hero-dot ${i === 0 ? 'active' : ''}" data-dot="${i}"></div>
  `
    ).join('');

  // Dot click handlers
  dotsContainer
    .querySelectorAll('.hero-dot')
    .forEach(dot => {
      dot.addEventListener(
        'click',
        () =>
          goToSlide(
            parseInt(
              dot.dataset.dot
            )
          )
      );
    });

  // Auto-play
  startAutoPlay();
}

function goToSlide(index) {
  const slides =
    document.querySelectorAll(
      '.hero-slide'
    );

  const dots =
    document.querySelectorAll(
      '.hero-dot'
    );

  slides.forEach(
    s => s.classList.remove('active')
  );

  dots.forEach(
    d => d.classList.remove('active')
  );

  if (slides[index]) {
    slides[index].classList.add(
      'active'
    );
  }

  if (dots[index]) {
    dots[index].classList.add(
      'active'
    );
  }

  currentSlide = index;
}

function startAutoPlay() {
  clearInterval(slideInterval);

  slideInterval =
    setInterval(() => {
      const total =
        document.querySelectorAll(
          '.hero-slide'
        ).length;

      goToSlide(
        (currentSlide + 1) % total
      );
    }, 5000);
}

// ===== Categories =====

function renderCategories() {
  const container =
    document.getElementById(
      'categoriesGrid'
    );

  if (!container) return;

  categoryCarouselState
    ?.destroy?.();

  const featured =
    categories.filter(
      c => c.featured
    );

  container.innerHTML =
    featured.map(
      cat => `
    <div class="category-card" onclick="filterByCategory('${cat.name}')">
      <img src="${cat.banner}" alt="${cat.name}" loading="lazy">
      <div class="category-card-overlay">
        <h4>${cat.name}</h4>
        <span>${products.filter(p => p.category === cat.name).length} Products</span>
      </div>
    </div>
  `
    ).join('');
}

// ===== Product Rendering =====

function createProductCard(product) {
  const isWishlisted =
    wishlist.includes(
      product.id
    );

  const hasSale =
    product.salePrice &&
    product.salePrice <
      product.price;

  const displayPrice =
    hasSale
      ? product.salePrice
      : product.price;

  const discount =
    hasSale
      ? Math.round(
          (
            (product.price -
              product.salePrice) /
            product.price
          ) * 100
        )
      : 0;

  let badgeHtml = '';

  if (product.badge) {
    const badgeClass =
      product.badge
        .toLowerCase()
        .replace(' ', '');

    badgeHtml =
      `<span class="product-badge badge-${badgeClass}">${product.badge}</span>`;
  }

  return `
    <div class="product-card fade-in" data-id="${product.id}">
      <div class="product-image-wrap">
        ${badgeHtml}
        ${hasSale ? `<span class="sale-tag">-${discount}%</span>` : ''}

        <img
          src="${product.image}"
          alt="${product.name}"
          loading="lazy"
          onclick="openProductModal(${product.id})"
          style="cursor:pointer"
        >

        <div class="product-actions-overlay">
          <button
            class="quick-action-btn"
            onclick="openProductModal(${product.id})"
            title="Quick View"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>

          <button
            class="quick-action-btn"
            onclick="toggleWishlist(${product.id})"
            title="Wishlist"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${isWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>

          <button
            class="quick-action-btn"
            onclick="addToCart(${product.id})"
            title="Add to Cart"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="product-info">
        <div class="product-category">
          ${product.category} · ${product.subcategory}
        </div>

        <div
          class="product-name"
          onclick="openProductModal(${product.id})"
          style="cursor:pointer"
        >
          ${product.name}
        </div>

        <div class="product-rating">
          <span class="stars">
            ${generateStars(product.rating)}
          </span>
          <span class="review-count">
            (${product.reviews})
          </span>
        </div>

        <div class="product-price">
          <span class="price-current">
            $${displayPrice.toFixed(2)}
          </span>

          ${
            hasSale
              ? `<span class="price-original">$${product.price.toFixed(2)}</span>`
              : ''
          }
        </div>

        <button
          class="add-to-cart-btn"
          onclick="addToCart(${product.id})"
        >
          Add to Cart
        </button>
      </div>
    </div>
  `;
}

function generateStars(rating) {
  const full =
    Math.floor(rating);

  const half =
    rating % 1 >= 0.5;

  let stars = '';

  for (
    let i = 0;
    i < full;
    i++
  ) {
    stars += '★';
  }

  if (half) {
    stars += '☆';
  }

  for (
    let i =
      full +
      (half ? 1 : 0);
    i < 5;
    i++
  ) {
    stars += '☆';
  }

  return stars;
}

function renderFeaturedProducts() {
  const container =
    document.getElementById(
      'featuredProducts'
    );

  if (!container) return;

  const featured =
    products.filter(
      p =>
        p.featured &&
        p.status === 'Active'
    );

  container.innerHTML =
    featured
      .map(p => createProductCard(p))
      .join('');
}

function renderBestSellers() {
  const container =
    document.getElementById(
      'bestSellers'
    );

  if (!container) return;

  const best =
    products.filter(
      p =>
        p.bestSeller &&
        p.status === 'Active'
    );

  container.innerHTML =
    best
      .map(p => createProductCard(p))
      .join('');
}

function renderNewArrivals() {
  const container =
    document.getElementById(
      'newArrivals'
    );

  if (!container) return;

  const newArrivals =
    products.filter(
      p =>
        p.newArrival &&
        p.status === 'Active'
    );

  container.innerHTML =
    newArrivals
      .map(p => createProductCard(p))
      .join('');
}

function renderJewelry() {
  const container =
    document.getElementById(
      'jewelryCollection'
    );

  if (!container) return;

  const jewelry =
    products.filter(
      p =>
        p.category === 'Jewelry' &&
        p.status === 'Active'
    );

  container.innerHTML =
    jewelry
      .map(p => createProductCard(p))
      .join('');
}

function renderNails() {
  const container =
    document.getElementById(
      'nailStudio'
    );

  if (!container) return;

  const nails =
    products.filter(
      p =>
        p.category === 'Nails' &&
        p.status === 'Active'
    );

  container.innerHTML =
    nails
      .map(p => createProductCard(p))
      .join('');
}

// ===== Testimonials / Reviews =====

function renderTestimonials() {
  const container =
    document.getElementById(
      'testimonialsTrack'
    );

  if (!container) return;

  if (
    !reviews ||
    reviews.length === 0
  ) {
    container.innerHTML =
      '<p style="padding:20px;color:var(--gray-400)">No reviews available.</p>';

    return;
  }

  container.innerHTML =
    reviews
      .map(r => {
        const starCount =
          typeof r.rating === 'number'
            ? r.rating
            : 5;

        const stars =
          '★'.repeat(
            starCount
          ) +
          '☆'.repeat(
            5 - starCount
          );

        const initials =
          r.initials ||
          (
            r.author
              ? r.author
                  .split(' ')
                  .map(
                    n => n[0]
                  )
                  .join('')
                  .toUpperCase()
              : 'U'
          );

        return `
      <div class="testimonial-card">
        <div class="testimonial-stars">
          ${stars}
        </div>

        <p class="testimonial-text">
          "${r.text}"
        </p>

        ${
          r.productName
            ? `<div style="font-size:0.8rem;color:var(--blush-600);font-weight:600;margin-bottom:12px">
                Product: ${r.productName}
              </div>`
            : ''
        }

        <div class="testimonial-author">
          <div class="testimonial-avatar">
            ${initials}
          </div>

          <div class="testimonial-author-info">
            <h5>${r.author}</h5>
            <span>
              ${r.subtitle || 'Verified Buyer'}
            </span>
          </div>
        </div>
      </div>
    `;
      })
      .join('');
}

// ===== Testimonials Infinite Carousel =====

let testimonialsCarouselState = null;

function initializeTestimonialsCarousel() {
  const track =
    document.getElementById(
      'testimonialsTrack'
    );

  const viewport =
    track?.closest(
      '.testimonials-viewport'
    );

  if (!track || !viewport) return;

  testimonialsCarouselState
    ?.destroy?.();

  const originals =
    Array.from(
      track.children
    ).filter(
      slide =>
        !slide.hasAttribute(
          'data-testimonial-clone'
        )
    );

  if (originals.length < 2) return;

  const reducedMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

  const state =
    testimonialsCarouselState = {
      track,
      viewport,
      count: originals.length,
      slides: [],
      index: originals.length,
      logicalIndex: 0,
      queuedDirection: 0,
      isAnimating: false,
      autoplayTimer: null,
      fallbackTimer: null,
      reducedMotion,
      listeners: [],
      resizeObserver: null
    };

  const on = (
    target,
    type,
    handler,
    options
  ) => {
    target.addEventListener(
      type,
      handler,
      options
    );

    state.listeners.push(
      () =>
        target.removeEventListener(
          type,
          handler,
          options
        )
    );
  };

  const appendSet =
    isOriginalSet => {
      originals.forEach(
        original => {
          const slide =
            isOriginalSet
              ? original
              : original.cloneNode(
                  true
                );

          if (!isOriginalSet) {
            slide.setAttribute(
              'data-testimonial-clone',
              'true'
            );

            slide.setAttribute(
              'aria-hidden',
              'true'
            );

            slide
              .querySelectorAll(
                'a, button, input, select, textarea'
              )
              .forEach(control => {
                control.setAttribute(
                  'tabindex',
                  '-1'
                );
              });
          }

          track.appendChild(slide);
          state.slides.push(
            slide
          );
        }
      );
    };

  track.innerHTML = '';

  appendSet(false);
  appendSet(true);
  appendSet(false);

  track.classList.add(
    'testimonials-transform-track'
  );

  track.style.scrollSnapType =
    'none';

  function target() {
    const slide =
      state.slides[
        state.index
      ];

    return slide
      ? slide.offsetLeft -
          track.offsetLeft
      : 0;
  }

  function position(animate) {
    track.style.transition =
      animate &&
      !reducedMotion.matches
        ? ''
        : 'none';

    track.style.transform =
      `translate3d(${-target()}px, 0, 0)`;

    if (!animate) {
      void track.offsetHeight;
    }
  }

  function normalize() {
    if (
      state.index <
      state.count
    ) {
      state.index +=
        state.count;
    }

    if (
      state.index >=
      state.count * 2
    ) {
      state.index -=
        state.count;
    }

    state.logicalIndex =
      (
        state.index -
        state.count +
        state.count
      ) %
      state.count;

    position(false);
  }

  function finish() {
    if (!state.isAnimating)
      return;

    clearTimeout(
      state.fallbackTimer
    );

    state.isAnimating = false;

    if (
      state.index <
        state.count ||
      state.index >=
        state.count * 2
    ) {
      normalize();
    }

    if (
      state.queuedDirection
    ) {
      const direction =
        state.queuedDirection >
        0
          ? 1
          : -1;

      state.queuedDirection -=
        direction;

      move(direction);
    }
  }

  function move(direction) {
    if (
      state.isAnimating
    ) {
      state.queuedDirection +=
        direction > 0
          ? 1
          : -1;

      return;
    }

    state.index +=
      direction > 0
        ? 1
        : -1;

    state.logicalIndex =
      (
        state.index -
        state.count +
        state.count
      ) %
      state.count;

    state.isAnimating = true;

    position(true);

    clearTimeout(
      state.fallbackTimer
    );

    state.fallbackTimer =
      setTimeout(
        finish,
        reducedMotion.matches
          ? 0
          : 700
      );
  }

  function pauseAutoplay() {
    clearInterval(
      state.autoplayTimer
    );

    state.autoplayTimer =
      null;
  }

  function resumeAutoplay() {
    if (
      reducedMotion.matches ||
      state.autoplayTimer
    ) {
      return;
    }

    state.autoplayTimer =
      setInterval(
        () => move(1),
        4000
      );
  }

  on(
    track,
    'transitionend',
    event => {
      if (
        event.propertyName ===
        'transform'
      ) {
        finish();
      }
    }
  );

  on(
    viewport,
    'mouseenter',
    pauseAutoplay
  );

  on(
    viewport,
    'mouseleave',
    resumeAutoplay
  );

  on(
    viewport,
    'pointerdown',
    event => {
      if (
        !event.isPrimary ||
        (
          event.pointerType ===
            'mouse' &&
          event.button !== 0
        )
      ) {
        return;
      }

      pauseAutoplay();

      state.touchStartX =
        event.clientX;

      state.touchStartY =
        event.clientY;

      state.pointerId =
        event.pointerId;

      state.dragging =
        true;

      viewport.setPointerCapture?.(
        event.pointerId
      );
    }
  );

  on(
    viewport,
    'pointerup',
    event => {
      if (
        !state.dragging ||
        event.pointerId !==
          state.pointerId
      ) {
        return;
      }

      state.dragging =
        false;

      viewport.releasePointerCapture?.(
        event.pointerId
      );

      const deltaX =
        event.clientX -
        state.touchStartX;

      const deltaY =
        event.clientY -
        state.touchStartY;

      if (
        Math.abs(deltaX) >
          50 &&
        Math.abs(deltaX) >
          Math.abs(deltaY)
      ) {
        move(
          deltaX < 0
            ? 1
            : -1
        );
      }

      resumeAutoplay();
    }
  );

  const cancelPointerGesture =
    event => {
      if (
        !state.dragging ||
        (
          event.pointerId !==
            undefined &&
          event.pointerId !==
            state.pointerId
        )
      ) {
        return;
      }

      state.dragging =
        false;

      if (
        event.pointerId !==
        undefined
      ) {
        viewport.releasePointerCapture?.(
          event.pointerId
        );
      }

      resumeAutoplay();
    };

  on(
    viewport,
    'pointercancel',
    cancelPointerGesture
  );

  on(
    viewport,
    'lostpointercapture',
    cancelPointerGesture
  );

  on(
    window,
    'resize',
    () => {
      if (
        testimonialsCarouselState ===
        state
      ) {
        requestAnimationFrame(
          () => {
            position(false);
          }
        );
      }
    }
  );

  state.destroy = () => {
    pauseAutoplay();

    clearTimeout(
      state.fallbackTimer
    );

    state.resizeObserver?.disconnect();

    state.listeners.forEach(
      remove => remove()
    );
  };

  state.move = move;

  position(false);

  if (
    'ResizeObserver' in window
  ) {
    state.resizeObserver =
      new ResizeObserver(
        () => {
          position(false);
        }
      );

    state.resizeObserver.observe(
      viewport
    );
  }

  resumeAutoplay();
}

// ===== Promo Banner =====

function renderPromoBanner() {
  const container =
    document.getElementById(
      'promoBanner'
    );

  if (!container) return;

  const pb =
    banners.promoBanner;

  if (
    !pb ||
    !pb.enabled
  ) {
    container.classList.add(
      'hidden'
    );

    return;
  }

  const now =
    new Date();

  const start =
    new Date(
      pb.startDate
    );

  const end =
    new Date(
      pb.endDate
    );

  if (
    now < start ||
    now > end
  ) {
    container.classList.add(
      'hidden'
    );

    return;
  }

  container.innerHTML = `
    <div class="promo-banner">
      <div class="promo-banner-bg">
        <img
          src="${pb.backgroundImage}"
          alt="${pb.title}"
        >
      </div>

      <div class="promo-banner-content">
        <h3>${pb.title}</h3>
        <p>${pb.subtitle}</p>
        <a
          href="${pb.buttonLink}"
          class="btn-primary"
        >
          ${pb.buttonText}
        </a>
      </div>
    </div>
  `;
}

// ===== Blog =====

function renderBlog() {
  const container =
    document.getElementById(
      'blogGrid'
    );

  if (!container) return;

  const published =
    blogPosts.filter(
      b =>
        b.status ===
        'published'
    );

  const isBlogPage =
    window.location.pathname.endsWith(
      'blog.html'
    );

  const displayedPosts =
    isBlogPage
      ? published
      : published.slice(
          0,
          3
        );

  container.innerHTML =
    displayedPosts
      .map(
        post => `
    <article class="blog-card">
      <div class="blog-card-image">
        <img
          src="${post.coverImage}"
          alt="${post.title}"
          loading="lazy"
        >
      </div>

      <div class="blog-card-content">
        <div class="blog-meta">
          <span>${post.category}</span>
          <span>${formatDate(post.publishDate)}</span>
        </div>

        <h3 class="blog-card-title">
          ${post.title}
        </h3>

        <p class="blog-card-excerpt">
          ${post.content
            .substring(0, 120)
            .replace(
              /[#*\n]/g,
              ''
            )}...
        </p>

        <span
          class="read-more"
          onclick="openBlogModal(${post.id})"
        >
          Read More →
        </span>
      </div>
    </article>
  `
      )
      .join('');
}

function formatDate(dateStr) {
  return new Date(
    dateStr
  ).toLocaleDateString(
    'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
  );
}

// ===== Shop & Filters =====

let shopFilters = {
  categories: [],
  maxPrice: 200,
  search: '',
  sort: 'featured'
};

function renderShop() {
  const container =
    document.getElementById(
      'shopProducts'
    );

  if (!container) return;

  let filtered =
    products.filter(
      p =>
        p.status ===
        'Active'
    );

  // Category filter
  if (
    shopFilters.categories
      .length > 0
  ) {
    filtered =
      filtered.filter(
        p =>
          shopFilters.categories.includes(
            p.category
          )
      );
  }

  // Price filter
  filtered =
    filtered.filter(p => {
      const price =
        p.salePrice ||
        p.price;

      return (
        price <=
        shopFilters.maxPrice
      );
    });

  // Search
  if (
    shopFilters.search
  ) {
    const q =
      shopFilters.search.toLowerCase();

    filtered =
      filtered.filter(
        p =>
          p.name
            .toLowerCase()
            .includes(q) ||
          p.description
            .toLowerCase()
            .includes(q) ||
          p.tags.some(
            t =>
              t.toLowerCase()
                .includes(q)
          ) ||
          p.category
            .toLowerCase()
            .includes(q)
      );
  }

  // Sort
  switch (
    shopFilters.sort
  ) {
    case 'price-low':
      filtered.sort(
        (a, b) =>
          (
            a.salePrice ||
            a.price
          ) -
          (
            b.salePrice ||
            b.price
          )
      );
      break;

    case 'price-high':
      filtered.sort(
        (a, b) =>
          (
            b.salePrice ||
            b.price
          ) -
          (
            a.salePrice ||
            a.price
          )
      );
      break;

    case 'name':
      filtered.sort(
        (a, b) =>
          a.name.localeCompare(
            b.name
          )
      );
      break;

    case 'rating':
      filtered.sort(
        (a, b) =>
          b.rating -
          a.rating
      );
      break;

    case 'newest':
      filtered.sort(
        (a, b) =>
          new Date(
            b.createdAt
          ) -
          new Date(
            a.createdAt
          )
      );
      break;

    default:
      filtered.sort(
        (a, b) =>
          (
            b.featured
              ? 1
              : 0
          ) -
          (
            a.featured
              ? 1
              : 0
          )
      );
  }

  const isShopPage =
    window.location.pathname.endsWith(
      'shop.html'
    );

  // Update count
  const countEl =
    document.getElementById(
      'resultsCount'
    );

  if (countEl) {
    if (isShopPage) {
      countEl.textContent =
        `${filtered.length} products found`;
    } else {
      countEl.textContent =
        `Showing ${Math.min(filtered.length, 6)} of ${filtered.length} products`;
    }
  }

  const seeMoreBtn =
    document.getElementById(
      'seeMoreContainer'
    );

  if (seeMoreBtn) {
    seeMoreBtn.style.display =
      isShopPage
        ? 'none'
        : 'block';
  }

  if (
    filtered.length ===
    0
  ) {
    container.innerHTML =
      '<div class="text-center" style="grid-column:1/-1;padding:60px;color:var(--gray-400)"><h3>No products found</h3><p>Try adjusting your filters or search.</p></div>';

    return;
  }

  const displayedProducts =
    isShopPage
      ? filtered
      : filtered.slice(
          0,
          6
        );

  container.innerHTML =
    displayedProducts
      .map(p =>
        createProductCard(p)
      )
      .join('');
}

function renderFilterSidebar() {
  const container =
    document.getElementById(
      'filterCategories'
    );

  if (!container) return;

  container.innerHTML =
    categories
      .map(
        cat => `
    <label class="filter-option">
      <input
        type="checkbox"
        value="${cat.name}"
        onchange="toggleCategoryFilter(this)"
      >
      ${cat.name}

      <span style="margin-left:auto;color:var(--gray-400);font-size:0.8rem">
        ${products.filter(
          p =>
            p.category ===
            cat.name
        ).length}
      </span>
    </label>
  `
      )
      .join('');

  const priceSlider =
    document.getElementById(
      'priceRange'
    );

  if (priceSlider) {
    priceSlider.max =
      Math.max(
        ...products.map(
          p => p.price
        )
      );

    priceSlider.value =
      shopFilters.maxPrice;

    priceSlider.oninput =
      function () {
        shopFilters.maxPrice =
          parseInt(
            this.value
          );

        document.getElementById(
          'priceDisplay'
        ).textContent =
          `Up to $${this.value}`;

        renderShop();
      };
  }
}

function toggleCategoryFilter(
  checkbox
) {
  if (checkbox.checked) {
    shopFilters.categories.push(
      checkbox.value
    );
  } else {
    shopFilters.categories =
      shopFilters.categories.filter(
        c =>
          c !== checkbox.value
      );
  }

  renderShop();
}

function filterByCategory(
  category
) {
  shopFilters.categories = [
    category
  ];

  renderShop();

  // Check the checkbox
  document
    .querySelectorAll(
      '#filterCategories input'
    )
    .forEach(cb => {
      cb.checked =
        cb.value ===
        category;
    });

  document
    .getElementById('shop')
    ?.scrollIntoView({
      behavior: 'smooth'
    });
}

// ===== Cart =====

function addToCart(
  productId,
  qty = 1
) {
  const existing =
    cart.find(
      item =>
        item.id ===
        productId
    );

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: productId,
      qty
    });
  }

  saveCart();
  updateCartBadge();

  showToast(
    'Added to cart!',
    'success'
  );

  renderCartDrawer();
}

function removeFromCart(
  productId
) {
  cart = cart.filter(
    item =>
      item.id !==
      productId
  );

  saveCart();
  updateCartBadge();
  renderCartDrawer();
}

function updateQty(
  productId,
  delta
) {
  const item =
    cart.find(
      i =>
        i.id ===
        productId
    );

  if (item) {
    item.qty += delta;

    if (item.qty <= 0) {
      removeFromCart(
        productId
      );

      return;
    }

    saveCart();
    updateCartBadge();
    renderCartDrawer();
  }
}

function saveCart() {
  localStorage.setItem(
    'luxbeauty_cart',
    JSON.stringify(cart)
  );
}

function updateCartBadge() {
  const badge =
    document.getElementById(
      'cartCount'
    );

  if (badge) {
    const total =
      cart.reduce(
        (sum, item) =>
          sum + item.qty,
        0
      );

    badge.textContent =
      total;

    badge.style.display =
      total > 0
        ? 'flex'
        : 'none';
  }
}

function getCartTotal() {
  return cart.reduce(
    (sum, item) => {
      const product =
        products.find(
          p =>
            p.id ===
            item.id
        );

      if (product) {
        return (
          sum +
          (
            product.salePrice ||
            product.price
          ) *
            item.qty
        );
      }

      return sum;
    },
    0
  );
}

function renderCartDrawer() {
  const container =
    document.getElementById(
      'cartItems'
    );

  const totalEl =
    document.getElementById(
      'cartTotal'
    );

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <p>Your cart is empty</p>
      </div>
    `;

    if (totalEl) {
      totalEl.textContent =
        '$0.00';
    }

    return;
  }

  container.innerHTML =
    cart.map(
      item => {
        const p =
          products.find(
            prod =>
              prod.id ===
              item.id
          );

        if (!p) return '';

        const price =
          p.salePrice ||
          p.price;

        return `
          <div class="cart-item">
            <div class="cart-item-image">
              <img
                src="${p.image}"
                alt="${p.name}"
              >
            </div>

            <div class="cart-item-info">
              <div class="cart-item-name">
                ${p.name}
              </div>

              <div class="cart-item-price">
                $${price.toFixed(2)}
              </div>

              <div class="cart-item-controls">
                <button
                  class="qty-btn"
                  onclick="updateQty(${item.id}, -1)"
                >
                  −
                </button>

                <span class="cart-item-qty">
                  ${item.qty}
                </span>

                <button
                  class="qty-btn"
                  onclick="updateQty(${item.id}, 1)"
                >
                  +
                </button>

                <button
                  class="cart-item-remove"
                  onclick="removeFromCart(${item.id})"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        `;
      }
    ).join('');

  if (totalEl) {
    totalEl.textContent =
      `$${getCartTotal().toFixed(2)}`;
  }
}

// ===== Wishlist =====

function toggleWishlist(
  productId
) {
  const index =
    wishlist.indexOf(
      productId
    );

  if (index > -1) {
    wishlist.splice(
      index,
      1
    );

    showToast(
      'Removed from wishlist',
      'success'
    );
  } else {
    wishlist.push(
      productId
    );

    showToast(
      'Added to wishlist!',
      'success'
    );
  }

  localStorage.setItem(
    'luxbeauty_wishlist',
    JSON.stringify(wishlist)
  );

  updateWishlistBadge();
  renderWishlistDrawer();

  renderShop();
  renderFeaturedProducts();
  renderBestSellers();
  renderNewArrivals();
}

function updateWishlistBadge() {
  const badge =
    document.getElementById(
      'wishlistCount'
    );

  if (badge) {
    badge.textContent =
      wishlist.length;

    badge.style.display =
      wishlist.length > 0
        ? 'flex'
        : 'none';
  }
}

function renderWishlistDrawer() {
  const container =
    document.getElementById(
      'wishlistItems'
    );

  if (!container) return;

  if (wishlist.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <p>Your wishlist is empty</p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    wishlist
      .map(id => {
        const p =
          products.find(
            prod =>
              prod.id === id
          );

        if (!p) return '';

        const price =
          p.salePrice ||
          p.price;

        return `
          <div class="cart-item">
            <div class="cart-item-image">
              <img
                src="${p.image}"
                alt="${p.name}"
              >
            </div>

            <div class="cart-item-info">
              <div class="cart-item-name">
                ${p.name}
              </div>

              <div class="cart-item-price">
                $${price.toFixed(2)}
              </div>

              <div class="cart-item-controls">
                <button
                  class="add-to-cart-btn"
                  style="width:auto;padding:8px 20px;font-size:0.75rem"
                  onclick="addToCart(${p.id})"
                >
                  Add to Cart
                </button>

                <button
                  class="cart-item-remove"
                  onclick="toggleWishlist(${p.id})"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
}

// ===== Product Modal =====

function openProductModal(
  productId
) {
  const p =
    products.find(
      prod =>
        prod.id ===
        productId
    );

  if (!p) return;

  const hasSale =
    p.salePrice &&
    p.salePrice <
      p.price;

  const displayPrice =
    hasSale
      ? p.salePrice
      : p.price;

  const modal =
    document.getElementById(
      'productModal'
    );

  const body =
    document.getElementById(
      'productModalBody'
    );

  body.innerHTML = `
    <div class="modal-image-section">
      <img
        src="${p.image}"
        alt="${p.name}"
      >
    </div>

    <div class="modal-info-section">
      <div class="product-category">
        ${p.category} · ${p.subcategory}
      </div>

      <h2>
        ${p.name}
      </h2>

      <div
        class="product-rating"
        style="margin-bottom:16px"
      >
        <span class="stars">
          ${generateStars(
            p.rating
          )}
        </span>

        <span class="review-count">
          ${p.rating}
          (${p.reviews} reviews)
        </span>
      </div>

      <div class="modal-price-row">
        <span class="price-current">
          $${displayPrice.toFixed(2)}
        </span>

        ${
          hasSale
            ? `<span class="price-original">
                $${p.price.toFixed(2)}
              </span>`
            : ''
        }
      </div>

      <p class="modal-description">
        ${p.description}
      </p>

      <div class="modal-meta">
        ${
          p.brand
            ? `
              <div class="modal-meta-item">
                <span class="modal-meta-label">
                  Brand
                </span>

                <span class="modal-meta-value">
                  ${p.brand}
                </span>
              </div>
            `
            : ''
        }

        ${
          p.sku
            ? `
              <div class="modal-meta-item">
                <span class="modal-meta-label">
                  SKU
                </span>

                <span class="modal-meta-value">
                  ${p.sku}
                </span>
              </div>
            `
            : ''
        }

        ${
          p.material
            ? `
              <div class="modal-meta-item">
                <span class="modal-meta-label">
                  Material
                </span>

                <span class="modal-meta-value">
                  ${p.material}
                </span>
              </div>
            `
            : ''
        }

        ${
          p.color
            ? `
              <div class="modal-meta-item">
                <span class="modal-meta-label">
                  Color
                </span>

                <span class="modal-meta-value">
                  ${p.color}
                </span>
              </div>
            `
            : ''
        }

        ${
          p.collection
            ? `
              <div class="modal-meta-item">
                <span class="modal-meta-label">
                  Collection
                </span>

                <span class="modal-meta-value">
                  ${p.collection}
                </span>
              </div>
            `
            : ''
        }

        ${
          p.size
            ? `
              <div class="modal-meta-item">
                <span class="modal-meta-label">
                  Size
                </span>

                <span class="modal-meta-value">
                  ${p.size}
                </span>
              </div>
            `
            : ''
        }

        ${
          p.finish
            ? `
              <div class="modal-meta-item">
                <span class="modal-meta-label">
                  Finish
                </span>

                <span class="modal-meta-value">
                  ${p.finish}
                </span>
              </div>
            `
            : ''
        }

        ${
          p.shape
            ? `
              <div class="modal-meta-item">
                <span class="modal-meta-label">
                  Shape
                </span>

                <span class="modal-meta-value">
                  ${p.shape}
                </span>
              </div>
            `
            : ''
        }

        ${
          p.length
            ? `
              <div class="modal-meta-item">
                <span class="modal-meta-label">
                  Length
                </span>

                <span class="modal-meta-value">
                  ${p.length}
                </span>
              </div>
            `
            : ''
        }

        ${
          p.skinType
            ? `
              <div class="modal-meta-item">
                <span class="modal-meta-label">
                  Skin Type
                </span>

                <span class="modal-meta-value">
                  ${p.skinType}
                </span>
              </div>
            `
            : ''
        }

        ${
          p.ingredients
            ? `
              <div class="modal-meta-item">
                <span class="modal-meta-label">
                  Ingredients
                </span>

                <span class="modal-meta-value">
                  ${p.ingredients}
                </span>
              </div>
            `
            : ''
        }

        ${
          p.benefits
            ? `
              <div class="modal-meta-item">
                <span class="modal-meta-label">
                  Benefits
                </span>

                <span class="modal-meta-value">
                  ${p.benefits}
                </span>
              </div>
            `
            : ''
        }

        ${
          p.usage
            ? `
              <div class="modal-meta-item">
                <span class="modal-meta-label">
                  How to Use
                </span>

                <span class="modal-meta-value">
                  ${p.usage}
                </span>
              </div>
            `
            : ''
        }

        ${
          p.shades &&
          p.shades.length
            ? `
              <div class="modal-meta-item">
                <span class="modal-meta-label">
                  Shades
                </span>

                <span class="modal-meta-value">
                  ${p.shades.join(
                    ', '
                  )}
                </span>
              </div>
            `
            : ''
        }

        <div class="modal-meta-item">
          <span class="modal-meta-label">
            Stock
          </span>

          <span class="modal-meta-value">
            ${
              p.stock > 0
                ? `${p.stock} available`
                : 'Out of stock'
            }
          </span>
        </div>
      </div>

      <div class="modal-actions">
        <div class="modal-qty">
          <button
            class="qty-btn"
            onclick="modalQtyChange(-1)"
          >
            −
          </button>

          <span id="modalQty">
            1
          </span>

          <button
            class="qty-btn"
            onclick="modalQtyChange(1)"
          >
            +
          </button>
        </div>

        <button
          class="btn-primary"
          style="flex:1;animation:none"
          onclick="addToCart(${p.id}, parseInt(document.getElementById('modalQty').textContent)); closeProductModal();"
        >
          Add to Cart
        </button>
      </div>
    </div>
  `;

  modal.classList.add('open');
}

let modalQty = 1;

function modalQtyChange(
  delta
) {
  modalQty =
    Math.max(
      1,
      modalQty + delta
    );

  document.getElementById(
    'modalQty'
  ).textContent =
    modalQty;
}

function closeProductModal() {
  document
    .getElementById(
      'productModal'
    )
    .classList.remove('open');

  modalQty = 1;
}

// ===== Blog Modal =====

function openBlogModal(
  postId
) {
  const post =
    blogPosts.find(
      b =>
        b.id ===
        postId
    );

  if (!post) return;

  const modal =
    document.getElementById(
      'blogModal'
    );

  const body =
    document.getElementById(
      'blogModalBody'
    );

  // Simple markdown-like rendering
  const content =
    post.content
      .replace(
        /## (.*)/g,
        '<h3 style="font-family:var(--font-display);margin:20px 0 10px;color:var(--charcoal)">$1</h3>'
      )
      .replace(
        /\*\*(.*?)\*\*/g,
        '<strong>$1</strong>'
      )
      .replace(
        /\n/g,
        '<br>'
      );

  body.innerHTML = `
    <div
      style="aspect-ratio:16/9;overflow:hidden;border-radius:var(--radius-lg) var(--radius-lg) 0 0"
    >
      <img
        src="${post.coverImage}"
        alt="${post.title}"
        style="width:100%;height:100%;object-fit:cover"
      >
    </div>

    <div style="padding:40px">
      <div
        class="blog-meta"
        style="margin-bottom:16px"
      >
        <span
          style="color:var(--gold-500);font-weight:600"
        >
          ${post.category}
        </span>

        <span>
          ${formatDate(
            post.publishDate
          )}
        </span>

        <span>
          By ${post.author}
        </span>
      </div>

      <h2
        style="font-family:var(--font-display);font-size:1.8rem;margin-bottom:20px;color:var(--charcoal)"
      >
        ${post.title}
      </h2>

      <div
        style="font-size:0.95rem;color:var(--gray-500);line-height:1.8"
      >
        ${content}
      </div>
    </div>
  `;

  modal.classList.add('open');
}

function closeBlogModal() {
  document
    .getElementById(
      'blogModal'
    )
    .classList.remove('open');
}

// ===== Footer =====

function renderFooter() {
  const sm =
    settings.socialMedia ||
    {};

  const socialContainer =
    document.getElementById(
      'socialLinks'
    );

  if (socialContainer) {
    const icons = {
      reddit:
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M8.5 13.5c.8 1.1 2 1.7 3.5 1.7s2.7-.6 3.5-1.7M9 10.5h.01M15 10.5h.01M14.5 5.5l1.2-2.5 2.8.8"/></svg>',

      pinterest:
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8.5 20.5c1-3 2-8 2-8"/><path d="M12 12a3 3 0 1 0-3-3"/><path d="M12 12a3 3 0 0 1 3 3c0 2-1 3-2 3"/></svg>'
    };

    socialContainer.innerHTML =
      [
        'reddit',
        'pinterest'
      ]
        .map(platform => {
          const url =
            sm[platform];

          return url
            ? `<a href="${url}" target="_blank" title="${platform}">${icons[platform]}</a>`
            : '';
        })
        .join('');
  }

  const contactEl =
    document.getElementById(
      'footerContact'
    );

  if (
    contactEl &&
    settings.contact
  ) {
    contactEl.innerHTML = `
      <li>
        ${settings.contact.email}
      </li>

      <li>
        ${settings.contact.phone}
      </li>

      <li style="line-height:1.5">
        ${settings.contact.address}
      </li>
    `;
  }
}

// ===== Luxury Notification System =====

function showToast(
  message,
  type = 'success'
) {
  // Remove any existing notification immediately
  document
    .querySelectorAll(
      '.lux-notify, .lux-notify-backdrop'
    )
    .forEach(
      el => el.remove()
    );

  document.documentElement.classList.add(
    'lux-notify-open'
  );

  const msg =
    message.toLowerCase();

  let iconSvg,
      iconClass,
      title,
      subtitle;

  if (
    msg.includes(
      'added to cart'
    ) ||
    (
      msg.includes('cart') &&
      !msg.includes('empty')
    )
  ) {
    iconClass =
      'icon-blush';

    iconSvg =
      `<svg fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`;

    title =
      'Added to Cart';

    subtitle =
      'Your item is ready for checkout.';
  } else if (
    msg.includes(
      'added to wishlist'
    ) ||
    (
      msg.includes(
        'wishlist'
      ) &&
      !msg.includes(
        'removed'
      )
    )
  ) {
    iconClass =
      'icon-blush';

    iconSvg =
      `<svg fill="currentColor" stroke="none" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`;

    title =
      'Saved to Wishlist';

    subtitle =
      'Added to your personal collection.';
  } else if (
    msg.includes(
      'removed from wishlist'
    )
  ) {
    iconClass =
      'icon-blush';

    iconSvg =
      `<svg fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 00-7.78 0z"/></svg>`;

    title =
      'Removed from Wishlist';

    subtitle =
      'Item removed from your collection.';
  } else if (
    msg.includes(
      'subscrib'
    ) ||
    msg.includes(
      'thank you for'
    )
  ) {
    iconClass =
      'icon-gold';

    iconSvg =
      `<svg fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;

    title =
      'Welcome to Veloura';

    subtitle =
      message;
  } else if (
    msg.includes(
      'empty'
    ) ||
    type ===
      'error'
  ) {
    iconClass =
      'icon-error';

    iconSvg =
      `<svg fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="12" y1="11" x2="12" y2="15"/><line x1="12" y1="19" x2="12.01" y2="19"/></svg>`;

    title =
      'Cart is Empty';

    subtitle =
      'Add some products before checking out.';
  } else if (
    msg.includes(
      'checkout'
    ) ||
    msg.includes(
      'demo'
    )
  ) {
    iconClass =
      'icon-gold';

    iconSvg =
      `<svg fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`;

    title =
      'Thank You!';

    subtitle =
      message;
  } else {
    iconClass =
      'icon-gold';

    iconSvg =
      `<svg fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`;

    title =
      message;

    subtitle =
      '';
  }

  const backdrop =
    document.createElement(
      'div'
    );

  backdrop.className =
    'lux-notify-backdrop';

  const card =
    document.createElement(
      'div'
    );

  card.className =
    'lux-notify';

  card.innerHTML = `
    <div class="lux-notify-icon ${iconClass}">
      ${iconSvg}
    </div>

    <div class="lux-notify-rule"></div>

    <p class="lux-notify-title">
      ${title}
    </p>

    ${
      subtitle
        ? `
          <p class="lux-notify-sub">
            ${subtitle}
          </p>
        `
        : ''
    }
  `;

  document.body.appendChild(
    backdrop
  );

  document.body.appendChild(
    card
  );

  function dismiss() {
    clearTimeout(
      timer
    );

    backdrop.classList.add(
      'lux-notify-exit'
    );

    card.classList.add(
      'lux-notify-exit'
    );

    setTimeout(
      () => {
        backdrop.remove();
        card.remove();

        document.documentElement.classList.remove(
          'lux-notify-open'
        );
      },
      380
    );

    backdrop.removeEventListener(
      'click',
      dismiss
    );
  }

  backdrop.addEventListener(
    'click',
    dismiss
  );

  const timer =
    setTimeout(
      dismiss,
      3000
    );
}

// ===== Event Listeners =====

function setupEventListeners() {
  // Cart drawer
  const cartBtn =
    document.getElementById(
      'cartBtn'
    );

  const cartDrawer =
    document.getElementById(
      'cartDrawer'
    );

  const cartOverlay =
    document.getElementById(
      'drawerOverlay'
    );

  const cartClose =
    document.getElementById(
      'cartClose'
    );

  if (cartBtn) {
    cartBtn.addEventListener(
      'click',
      () => {
        renderCartDrawer();

        cartDrawer.classList.add(
          'open'
        );

        cartOverlay.classList.add(
          'open'
        );
      }
    );
  }

  if (cartClose) {
    cartClose.addEventListener(
      'click',
      closeDrawers
    );
  }

  if (cartOverlay) {
    cartOverlay.addEventListener(
      'click',
      closeDrawers
    );
  }

  // Wishlist drawer
  const wishlistBtn =
    document.getElementById(
      'wishlistBtn'
    );

  const wishlistDrawer =
    document.getElementById(
      'wishlistDrawer'
    );

  const wishlistClose =
    document.getElementById(
      'wishlistClose'
    );

  if (wishlistBtn) {
    wishlistBtn.addEventListener(
      'click',
      () => {
        renderWishlistDrawer();

        wishlistDrawer.classList.add(
          'open'
        );

        cartOverlay.classList.add(
          'open'
        );
      }
    );
  }

  if (wishlistClose) {
    wishlistClose.addEventListener(
      'click',
      closeDrawers
    );
  }

  // Theme toggle
  const themeToggle =
    document.getElementById(
      'themeToggle'
    );

  if (themeToggle) {
    themeToggle.addEventListener(
      'click',
      toggleTheme
    );
  }

  // Search
  const searchInput =
    document.getElementById(
      'shopSearch'
    );

  if (searchInput) {
    searchInput.addEventListener(
      'input',
      e => {
        shopFilters.search =
          e.target.value;

        renderShop();
      }
    );
  }

  // Sort
  const sortSelect =
    document.getElementById(
      'sortSelect'
    );

  if (sortSelect) {
    sortSelect.addEventListener(
      'change',
      e => {
        shopFilters.sort =
          e.target.value;

        renderShop();
      }
    );
  }

  // Modal closes
  const modalOverlay =
    document.getElementById(
      'productModal'
    );

  if (modalOverlay) {
    modalOverlay.addEventListener(
      'click',
      e => {
        if (
          e.target ===
          modalOverlay
        ) {
          closeProductModal();
        }
      }
    );
  }

  const blogModalOverlay =
    document.getElementById(
      'blogModal'
    );

  if (blogModalOverlay) {
    blogModalOverlay.addEventListener(
      'click',
      e => {
        if (
          e.target ===
          blogModalOverlay
        ) {
          closeBlogModal();
        }
      }
    );
  }

  // Mobile menu
  const mobileBtn =
    document.getElementById(
      'mobileMenuBtn'
    );

  const mobileMenu =
    document.getElementById(
      'mobileMenu'
    );

  const mobileClose =
    document.getElementById(
      'mobileMenuClose'
    );

  if (mobileBtn) {
    mobileBtn.addEventListener(
      'click',
      () =>
        mobileMenu.classList.add(
          'open'
        )
    );
  }

  if (mobileClose) {
    mobileClose.addEventListener(
      'click',
      () =>
        mobileMenu.classList.remove(
          'open'
        )
    );
  }

  if (mobileMenu) {
    mobileMenu
      .querySelectorAll('a')
      .forEach(a => {
        a.addEventListener(
          'click',
          () =>
            mobileMenu.classList.remove(
              'open'
            )
        );
      });
  }

  // Newsletter
  const newsletterForm =
    document.getElementById(
      'newsletterForm'
    );

  if (newsletterForm) {
    newsletterForm.addEventListener(
      'submit',
      e => {
        e.preventDefault();

        const email =
          newsletterForm
            .querySelector(
              'input'
            )
            .value;

        if (email) {
          showToast(
            'Thank you for subscribing!',
            'success'
          );

          newsletterForm.reset();
        }
      }
    );
  }

  // Checkout
  const checkoutBtn =
    document.getElementById(
      'checkoutBtn'
    );

  if (checkoutBtn) {
    checkoutBtn.addEventListener(
      'click',
      () => {
        if (
          cart.length ===
          0
        ) {
          showToast(
            'Your cart is empty.',
            'error'
          );

          return;
        }

        showToast(
          'Checkout is a demo in this static site. Thank you!',
          'success'
        );
      }
    );
  }
}

function closeDrawers() {
  document
    .getElementById(
      'cartDrawer'
    )
    ?.classList.remove(
      'open'
    );

  document
    .getElementById(
      'wishlistDrawer'
    )
    ?.classList.remove(
      'open'
    );

  document
    .getElementById(
      'drawerOverlay'
    )
    ?.classList.remove(
      'open'
    );
}

// ===== Scroll Animations =====

function setupScrollAnimations() {
  const observer =
    new IntersectionObserver(
      entries => {
        entries.forEach(
          entry => {
            if (
              entry.isIntersecting
            ) {
              entry.target.style.opacity =
                '1';

              entry.target.style.transform =
                'translateY(0)';
            }
          }
        );
      },
      {
        threshold: 0.1
      }
    );

  document
    .querySelectorAll(
      '.section-header, .category-card, .product-card, .blog-card'
    )
    .forEach(el => {
      el.style.opacity =
        '0';

      el.style.transform =
        'translateY(20px)';

      el.style.transition =
        'opacity 0.6s ease, transform 0.6s ease';

      observer.observe(
        el
      );
    });
}

// ===== Boot =====

function waitForSupabase() {
  if (
    window.supabaseReady
  ) {
    return Promise.resolve(
      window.supabaseClient
    );
  }

  return new Promise(
    resolve => {
      window.addEventListener(
        'supabase-ready',
        event => {
          resolve(
            event.detail.client
          );
        },
        {
          once: true
        }
      );
    }
  );
}

document.addEventListener(
  'DOMContentLoaded',
  async () => {
    initTheme();

    const client =
      await waitForSupabase();

    if (!client) {
      console.error(
        'Storefront cannot load: Supabase is not configured.'
      );

      return;
    }

    loadData().then(
      () => {
        renderFilterSidebar();
      }
    );
  }
);

// ===== Theme System =====

function initTheme() {
  const saved =
    localStorage.getItem(
      'luxbeauty-theme'
    ) || 'light';

  updateThemeToggle(
    saved
  );
}

function applyTheme(
  theme
) {
  const html =
    document.documentElement;

  if (
    theme ===
    'dark'
  ) {
    html.setAttribute(
      'data-theme',
      'dark'
    );
  } else {
    html.removeAttribute(
      'data-theme'
    );
  }

  localStorage.setItem(
    'luxbeauty-theme',
    theme
  );

  updateThemeToggle(
    theme
  );
}

function toggleTheme() {
  const current =
    document.documentElement.getAttribute(
      'data-theme'
    );

  applyTheme(
    current ===
      'dark'
      ? 'light'
      : 'dark'
  );
}

function updateThemeToggle(
  theme
) {
  const btn =
    document.getElementById(
      'themeToggle'
    );

  if (!btn) return;

  const sunIcon =
    btn.querySelector(
      '.theme-icon-sun'
    );

  const moonIcon =
    btn.querySelector(
      '.theme-icon-moon'
    );

  if (
    theme ===
    'dark'
  ) {
    btn.setAttribute(
      'aria-label',
      'Switch to light theme'
    );

    if (sunIcon) {
      sunIcon.style.opacity =
        '1';

      sunIcon.style.transform =
        'rotate(0deg) scale(1)';
    }

    if (moonIcon) {
      moonIcon.style.opacity =
        '0';

      moonIcon.style.transform =
        'rotate(90deg) scale(0.5)';
    }
  } else {
    btn.setAttribute(
      'aria-label',
      'Switch to dark theme'
    );

    if (sunIcon) {
      sunIcon.style.opacity =
        '0';

      sunIcon.style.transform =
        'rotate(90deg) scale(0.5)';
    }

    if (moonIcon) {
      moonIcon.style.opacity =
        '1';

      moonIcon.style.transform =
        'rotate(0deg) scale(1)';
    }
  }
}

// ===== Custom Sort Dropdown =====

function initCustomSortDropdown() {
  const selects =
    document.querySelectorAll(
      '.sort-select'
    );

  selects.forEach(
    select => {
      if (
        select.dataset.customized
      ) {
        return;
      }

      select.dataset.customized =
        'true';

      const wrapper =
        document.createElement(
          'div'
        );

      wrapper.className =
        'sort-select-wrapper';

      select.parentNode.insertBefore(
        wrapper,
        select
      );

      const overlay =
        document.createElement(
          'div'
        );

      overlay.style.position =
        'absolute';

      overlay.style.inset =
        '0';

      overlay.style.cursor =
        'pointer';

      overlay.style.zIndex =
        '10';

      wrapper.appendChild(
        select
      );

      wrapper.appendChild(
        overlay
      );

      const menu =
        document.createElement(
          'ul'
        );

      menu.className =
        'custom-sort-menu';

      Array.from(
        select.options
      ).forEach(
        opt => {
          const li =
            document.createElement(
              'li'
            );

          li.className =
            'custom-sort-option' +
            (
              opt.selected
                ? ' selected'
                : ''
            );

          li.textContent =
            opt.text;

          li.addEventListener(
            'click',
            e => {
              e.stopPropagation();

              select.value =
                opt.value;

              select.dispatchEvent(
                new Event(
                  'change'
                )
              );

              Array.from(
                menu.children
              ).forEach(
                c =>
                  c.classList.remove(
                    'selected'
                  )
              );

              li.classList.add(
                'selected'
              );

              menu.classList.remove(
                'open'
              );
            }
          );

          menu.appendChild(
            li
          );
        }
      );

      wrapper.appendChild(
        menu
      );

      overlay.addEventListener(
        'click',
        e => {
          e.stopPropagation();

          const isOpen =
            menu.classList.contains(
              'open'
            );

          document
            .querySelectorAll(
              '.custom-sort-menu'
            )
            .forEach(
              m =>
                m.classList.remove(
                  'open'
                )
            );

          if (!isOpen) {
            menu.classList.add(
              'open'
            );
          }
        }
      );

      document.addEventListener(
        'click',
        () => {
          menu.classList.remove(
            'open'
          );
        }
      );
    }
  );
}