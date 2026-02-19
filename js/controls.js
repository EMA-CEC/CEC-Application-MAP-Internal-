// Handles UI controls, panels, and toggle interactions

function setupControls() {
  const toggleBtn = document.getElementById('toggleBtn');
  const welcome = document.getElementById('welcome');

  if (toggleBtn && welcome) {
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = welcome.classList.toggle('collapsed');
      toggleBtn.textContent = isCollapsed ? 'Open Info Panel' : 'Close Info Panel';
    });

    // Auto-collapse if screen is narrow (e.g., under 768px)
    if (window.innerWidth < 768) {
      welcome.classList.add('collapsed');
      toggleBtn.textContent = 'Open Info Panel';
    }
  }
}

const searchToggle = document.getElementById("searchToggle");
const searchContainer = document.getElementById("searchContainer");

if (searchToggle && searchContainer) {
  searchToggle.addEventListener("click", () => {
    searchContainer.classList.toggle("collapsed");
  });
}
