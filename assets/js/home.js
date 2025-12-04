function placeBird() {
  const anchorEl = document.querySelector(".letter-l");
  const bird = document.getElementById("bird");
  const container = document.querySelector(".centered");

  if (!anchorEl || !bird || !container) return;

  const rect = anchorEl.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  // Use rect.bottom for stability when zooming
  const verticalOffset = 10; // adjust perch height
  const top = rect.bottom - containerRect.top - bird.offsetHeight - verticalOffset - 36;
  const left = (rect.left - containerRect.left) + (rect.width / 2) - (bird.offsetWidth / 2) - 1.7;

  bird.style.top = `${top}px`;
  bird.style.left = `${left}px`;
  bird.style.opacity = 1;
  bird.style.animation = "hop 1s ease";
}

window.addEventListener("load", placeBird);
window.addEventListener("resize", placeBird);