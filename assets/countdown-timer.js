/**
 * Countdown Timer Custom Element
 * Counts down to a target date. Shows expired text when countdown reaches zero.
 * No external dependencies.
 */
class CountdownTimer extends HTMLElement {
  connectedCallback() {
    this.targetDate = new Date(this.dataset.target).getTime();
    this.expiredText = this.dataset.expiredText || 'Expired';
    this.daysEl = this.querySelector('[data-days]');
    this.hoursEl = this.querySelector('[data-hours]');
    this.minutesEl = this.querySelector('[data-minutes]');
    this.secondsEl = this.querySelector('[data-seconds]');
    this.digitsEl = this.querySelector('.countdown__digits');

    if (isNaN(this.targetDate)) return;

    this.update();
    this.interval = setInterval(this.update.bind(this), 1000);
  }

  disconnectedCallback() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  update() {
    var now = Date.now();
    var diff = this.targetDate - now;

    if (diff <= 0) {
      clearInterval(this.interval);
      this.interval = null;
      if (this.digitsEl) {
        this.digitsEl.innerHTML = '<span class="countdown__expired">' + this.escapeHTML(this.expiredText) + '</span>';
      }
      return;
    }

    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var minutes = Math.floor((diff % 3600000) / 60000);
    var seconds = Math.floor((diff % 60000) / 1000);

    if (this.daysEl) this.daysEl.textContent = String(days).padStart(2, '0');
    if (this.hoursEl) this.hoursEl.textContent = String(hours).padStart(2, '0');
    if (this.minutesEl) this.minutesEl.textContent = String(minutes).padStart(2, '0');
    if (this.secondsEl) this.secondsEl.textContent = String(seconds).padStart(2, '0');
  }

  escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

if (!customElements.get('countdown-timer')) {
  customElements.define('countdown-timer', CountdownTimer);
}

/* Theme editor: re-init on section reload */
document.addEventListener('shopify:section:load', function(e) {
  var el = e.target.querySelector('countdown-timer');
  if (el && el.connectedCallback) el.connectedCallback();
});
document.addEventListener('shopify:section:unload', function(e) {
  var el = e.target.querySelector('countdown-timer');
  if (el && el.disconnectedCallback) el.disconnectedCallback();
});
