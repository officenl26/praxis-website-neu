/* =========================================================
   NATURHEILPRAXIS NICOLE LURZ
   Animation & Interaction Layer
   ========================================================= */

(() => {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  /* =====================================================
     PRELOADER
     ===================================================== */
  const preloader = document.getElementById('preloader');
  const bar = document.getElementById('preloaderBar');
  let progress = 0;

  const tickProgress = () => {
    progress += Math.random() * 18 + 6;
    if (progress > 100) progress = 100;
    if (bar) bar.style.width = progress + '%';
    if (progress < 100) {
      setTimeout(tickProgress, 120 + Math.random() * 160);
    }
  };
  tickProgress();

  const finishPreloader = () => {
    if (bar) bar.style.width = '100%';
    setTimeout(() => {
      preloader?.classList.add('is-done');
      document.body.classList.add('is-loaded');
      initEntranceAnimation();
    }, 380);
  };

  if (document.readyState === 'complete') {
    setTimeout(finishPreloader, 1100);
  } else {
    window.addEventListener('load', () => setTimeout(finishPreloader, 700));
  }

  /* =====================================================
     LENIS SMOOTH SCROLL
     ===================================================== */
  let lenis = null;
  if (typeof Lenis !== 'undefined' && !prefersReduced) {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    // Anchor handling
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length <= 1) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -60, duration: 1.4 });
      });
    });
  }

  /* =====================================================
     CUSTOM CURSOR + MAGNETIC BUTTONS
     ===================================================== */
  if (!isTouch && !prefersReduced) {
    const cursor = document.getElementById('cursor');
    const dot = cursor?.querySelector('.cursor__dot');
    const ring = cursor?.querySelector('.cursor__ring');

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let dx = mx, dy = my;
    let rx = mx, ry = my;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
    });

    const renderCursor = () => {
      dx += (mx - dx) * 0.9;
      dy += (my - dy) * 0.9;
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (dot) dot.style.transform = `translate(${dx}px, ${dy}px)`;
      if (ring) ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(renderCursor);
    };
    renderCursor();

    // Hover targets
    const hoverables = document.querySelectorAll('a, button, [data-magnetic], .offer__card, .problem__card');
    hoverables.forEach((el) => {
      el.addEventListener('mouseenter', () => cursor?.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor?.classList.remove('is-hover'));
    });

    // Magnetic buttons
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const strength = el.classList.contains('btn--primary') ? 0.35 : 0.22;
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const tx = (e.clientX - cx) * strength;
        const ty = (e.clientY - cy) * strength;
        el.style.transform = `translate(${tx}px, ${ty}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });

    // Offer card glow follow
    document.querySelectorAll('.offer__card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height * 100) + '%');
      });
    });
  }

  /* =====================================================
     NAV SCROLL STATE
     ===================================================== */
  const nav = document.getElementById('nav');
  const updateNav = () => {
    if (!nav) return;
    if (window.scrollY > 30) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  };
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  /* =====================================================
     YEAR
     ===================================================== */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =====================================================
     THREE.JS HERO PARTICLES
     ===================================================== */
  const initHero3D = () => {
    if (typeof THREE === 'undefined' || prefersReduced) return;

    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.z = 60;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Particle field — organic flowing
    const COUNT = 1400;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    const colorPalette = [
      new THREE.Color('#D4B896'), // warm
      new THREE.Color('#8FA68E'), // sage
      new THREE.Color('#E0C9A0'), // gold
      new THREE.Color('#F2EFE6'), // text
    ];
    const colors = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      const r = 18 + Math.random() * 36;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      seeds[i] = Math.random();

      const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Soft circular sprite
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = spriteCanvas.height = 64;
    const sctx = spriteCanvas.getContext('2d');
    const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.4)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 64, 64);
    const sprite = new THREE.CanvasTexture(spriteCanvas);

    const mat = new THREE.PointsMaterial({
      size: 0.7,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: sprite,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // Connecting filament: a faint torus-like ring
    const ringGeo = new THREE.TorusGeometry(34, 0.02, 8, 200);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xD4B896, transparent: true, opacity: 0.18 });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2.5;
    scene.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(46, 0.015, 8, 200),
      new THREE.MeshBasicMaterial({ color: 0x8FA68E, transparent: true, opacity: 0.12 })
    );
    ring2.rotation.x = Math.PI / 3.4;
    ring2.rotation.y = Math.PI / 5;
    scene.add(ring2);

    // Mouse parallax
    let targetX = 0, targetY = 0;
    let curX = 0, curY = 0;
    window.addEventListener('mousemove', (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 0.6;
      targetY = (e.clientY / window.innerHeight - 0.5) * 0.6;
    });

    // Animate
    const animate = (t) => {
      const time = t * 0.0001;
      curX += (targetX - curX) * 0.04;
      curY += (targetY - curY) * 0.04;

      points.rotation.y = time * 0.6 + curX;
      points.rotation.x = time * 0.3 + curY;

      // Breathing scale
      const breathe = 1 + Math.sin(time * 4) * 0.02;
      points.scale.set(breathe, breathe, breathe);

      ring1.rotation.z = time * 0.8;
      ring2.rotation.z = -time * 0.6;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    // Resize
    const handleResize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);
  };
  initHero3D();

  /* =====================================================
     ENTRANCE ANIMATION (after preloader)
     ===================================================== */
  function initEntranceAnimation() {
    if (typeof gsap === 'undefined') return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Hero title words (already translated 110% via CSS)
    tl.to('.hero__title .word', {
      yPercent: 0,
      duration: 1.2,
      stagger: 0.08,
      ease: 'expo.out',
    }, 0.1);

    // Hero fade elements
    tl.to('.hero__eyebrow.reveal-fade, .hero__lede.reveal-fade, .hero__ctas.reveal-fade, .hero__meta.reveal-fade', {
      opacity: 1,
      y: 0,
      duration: 1,
      stagger: 0.12,
    }, 0.6);

    // Nav fade
    gsap.from('.nav', { y: -30, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.2 });
  }

  /* =====================================================
     SCROLLTRIGGER REVEALS
     ===================================================== */
  const initScrollReveals = () => {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // Generic .reveal-up
    gsap.utils.toArray('.reveal-up').forEach((el) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });
    });

    // Generic .reveal-fade outside hero
    gsap.utils.toArray('section:not(.hero) .reveal-fade').forEach((el) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
      });
    });

    // Split-line H2 reveals using SplitType
    if (typeof SplitType !== 'undefined' && !prefersReduced) {
      gsap.utils.toArray('.split-lines').forEach((heading) => {
        const split = new SplitType(heading, { types: 'lines, words', tagName: 'span' });
        if (split.lines) {
          split.lines.forEach((line) => {
            line.style.overflow = 'hidden';
            line.style.display = 'block';
            line.style.paddingBottom = '0.05em';
          });
        }
        gsap.set(split.words, { yPercent: 110 });
        gsap.to(split.words, {
          yPercent: 0,
          duration: 1.1,
          ease: 'expo.out',
          stagger: 0.05,
          scrollTrigger: {
            trigger: heading,
            start: 'top 82%',
            toggleActions: 'play none none none',
          },
        });
      });
    }

    // Parallax on data-parallax
    gsap.utils.toArray('[data-parallax]').forEach((el) => {
      const intensity = parseFloat(el.dataset.parallax) || 0.05;
      gsap.to(el, {
        y: () => -window.innerHeight * intensity,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });

    // Y-only parallax for visual elements
    gsap.utils.toArray('[data-parallax-y]').forEach((el) => {
      const intensity = parseFloat(el.dataset.parallaxY) || 0.1;
      gsap.fromTo(el,
        { y: window.innerHeight * intensity },
        {
          y: -window.innerHeight * intensity,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.2,
          },
        }
      );
    });

    // Hero canvas subtle exit
    gsap.to('.hero__canvas', {
      opacity: 0.3,
      scale: 1.1,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });

    // Hero meta + lede slight scroll-out
    gsap.to('.hero__inner', {
      y: -60,
      opacity: 0.6,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });

    // Method orbit pop-in
    gsap.from('.orbit', {
      scale: 0.6,
      opacity: 0,
      duration: 1.4,
      stagger: 0.2,
      ease: 'expo.out',
      scrollTrigger: {
        trigger: '.method__visual',
        start: 'top 70%',
      },
    });
    gsap.from('.orbit__core', {
      scale: 0,
      opacity: 0,
      duration: 1.6,
      ease: 'expo.out',
      scrollTrigger: {
        trigger: '.method__visual',
        start: 'top 70%',
      },
    });

    // Marquee subtle scale on view
    gsap.from('.marquee__track', {
      opacity: 0,
      duration: 1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.marquee',
        start: 'top 90%',
      },
    });

    // Footer reveal
    gsap.from('.footer__col', {
      opacity: 0,
      y: 20,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.footer',
        start: 'top 85%',
      },
    });
  };

  // Wait for fonts then init scroll reveals
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(initScrollReveals);
  } else {
    window.addEventListener('load', initScrollReveals);
  }

  /* =====================================================
     RESIZE — refresh ScrollTrigger after fonts settle
     ===================================================== */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    }, 200);
  });

})();
