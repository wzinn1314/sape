// ========== DATA ATUAL ==========
function updateDate() {
  const dateEl = document.getElementById('currentDate');
  if (!dateEl) return;

  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const today = new Date();
  dateEl.textContent = today.toLocaleDateString('pt-BR', options);
}

function animateCards() {
  const cards = document.querySelectorAll('.card, .box');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'all 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 50);
  });
}

function animateProgressBars() {
  const bars = document.querySelectorAll('.analytics-progress');
  bars.forEach(bar => {
    const width = bar.style.width;
    bar.style.width = '0';
    setTimeout(() => {
      bar.style.transition = 'width 1s ease';
      bar.style.width = width;
    }, 100);
  });
}

window.addEventListener('load', function () {
  updateDate();
  animateCards();
  animateProgressBars();
});

setInterval(updateDate, 60000);

const menuLinks = document.querySelectorAll('.menu a');
menuLinks.forEach(link => {
  link.addEventListener('click', function (e) {
    if (this.href === '#') {
      e.preventDefault();
    }
  });
});

const avisoItems = document.querySelectorAll('.aviso-item');
avisoItems.forEach(item => {
  item.addEventListener('mouseenter', function () {
    this.style.transform = 'translateX(8px)';
  });
  item.addEventListener('mouseleave', function () {
    this.style.transform = 'translateX(0)';
  });
});

document.querySelectorAll('.card-link').forEach(link => {
  link.addEventListener('click', function (e) {
    if (this.href !== '#') {
      return;
    }
    e.preventDefault();
  });
});
