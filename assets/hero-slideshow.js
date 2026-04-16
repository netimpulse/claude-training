(function () {
  if (customElements.get('hero-slideshow')) return;
  class HeroSlideshow extends HTMLElement {
    connectedCallback() {
      this.slides = this.querySelectorAll('.hero__slide');
      this.dots = this.querySelectorAll('.hero__dot');
      this.index = 0;
      if (!this.slides.length) return;
      this.querySelector('[data-next]')?.addEventListener('click', () => this.go(this.index + 1));
      this.querySelector('[data-prev]')?.addEventListener('click', () => this.go(this.index - 1));
      this.dots.forEach((d, i) => d.addEventListener('click', () => this.go(i)));
      const autoplay = this.dataset.autoplay === 'true';
      const speed = parseInt(this.dataset.speed, 10) || 5500;
      if (autoplay && this.slides.length > 1) {
        this.timer = setInterval(() => this.go(this.index + 1), speed);
        this.addEventListener('mouseenter', () => clearInterval(this.timer));
        this.addEventListener('mouseleave', () => { this.timer = setInterval(() => this.go(this.index + 1), speed); });
      }
    }
    disconnectedCallback() { clearInterval(this.timer); }
    go(i) {
      const n = this.slides.length;
      const next = ((i % n) + n) % n;
      this.slides[this.index].classList.remove('is-active');
      this.dots[this.index]?.classList.remove('is-active');
      this.index = next;
      this.slides[this.index].classList.add('is-active');
      this.dots[this.index]?.classList.add('is-active');
    }
  }
  customElements.define('hero-slideshow', HeroSlideshow);
})();
