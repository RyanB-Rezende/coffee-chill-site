// ===== SLIDER AUTOMÁTICO =====

(function() {
  let currentSlide = 0;
  const slides = document.querySelectorAll('.slide');
  const indicators = document.querySelectorAll('.indicator');
  const prevBtn = document.querySelector('.slider-control.prev');
  const nextBtn = document.querySelector('.slider-control.next');
  const totalSlides = slides.length;
  let autoplayInterval;

  // Mostrar slide específico
  function showSlide(index) {
    // Remover active de todos
    slides.forEach(slide => slide.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));
    
    // Adicionar active no slide atual
    slides[index].classList.add('active');
    indicators[index].classList.add('active');
    
    currentSlide = index;
  }

  // Próximo slide
  function nextSlide() {
    let next = currentSlide + 1;
    if (next >= totalSlides) {
      next = 0;
    }
    showSlide(next);
  }

  // Slide anterior
  function prevSlide() {
    let prev = currentSlide - 1;
    if (prev < 0) {
      prev = totalSlides - 1;
    }
    showSlide(prev);
  }

  // Autoplay (muda a cada 5 segundos)
  function startAutoplay() {
    autoplayInterval = setInterval(nextSlide, 5000);
  }

  function stopAutoplay() {
    clearInterval(autoplayInterval);
  }

  // Event listeners para controles
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      nextSlide();
      stopAutoplay();
      startAutoplay();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevSlide();
      stopAutoplay();
      startAutoplay();
    });
  }

  // Event listeners para indicadores
  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
      showSlide(index);
      stopAutoplay();
      startAutoplay();
    });
  });

  // Navegação por teclado
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      prevSlide();
      stopAutoplay();
      startAutoplay();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
      stopAutoplay();
      startAutoplay();
    }
  });

  // Pausar autoplay ao passar o mouse
  const sliderContainer = document.querySelector('.slider-container');
  if (sliderContainer) {
    sliderContainer.addEventListener('mouseenter', stopAutoplay);
    sliderContainer.addEventListener('mouseleave', startAutoplay);
  }

  // Iniciar slider
  if (slides.length > 0) {
    showSlide(0);
    startAutoplay();
  }
})();
