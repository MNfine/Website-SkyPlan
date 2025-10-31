// Loader component logic: show/hide loader for reuse on any page
window.Loader = {
  show: function() {
    var loader = document.getElementById('loader-wrapper');
    if (loader) loader.classList.remove('hidden');
  },
  hide: function() {
    var loader = document.getElementById('loader-wrapper');
    if (loader) loader.classList.add('hidden');
  },
  autoHide: function(ms) {
    this.show();
    setTimeout(this.hide, ms || 1500);
  }
};
